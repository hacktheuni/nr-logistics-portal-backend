import readline from 'readline';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Helper for consistency in ESM if needed, though we are using tsx
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually to ensure we can update it if needed
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
};

const main = async () => {
    try {
        console.log('--- Create Admin User ---');

        // 1. Check/Generate Encryption Key
        let encryptionKey = process.env.ENCRYPTION_KEY;

        if (!encryptionKey) {
            console.log('Encryption key not found in .env. Generating one...');
            encryptionKey = crypto.randomBytes(32).toString('hex');

            // Append to .env
            fs.appendFileSync(envPath, `\nENCRYPTION_KEY=${encryptionKey}\n`);
            console.log('Encryption key added to .env.');

            // Update process.env for current run so subsequent imports see it
            process.env.ENCRYPTION_KEY = encryptionKey;
        } else {
            console.log('Encryption key present.');
        }

        // Dynamic imports to ensure config loads AFTER process.env.ENCRYPTION_KEY is set
        const { encrypt } = await import('../src/utils/encryption');
        const { prisma } = await import('../src/db/prisma');

        let name, email, appEmail, appPassword, appCourierId;

        // Check command line arguments (skip node and script path)
        const args = process.argv.slice(2);
        if (args.length >= 5) {
            console.log("Using command line arguments...");
            [name, email, appEmail, appPassword, appCourierId] = args;
        } else {
            // Interactive Mode
            // 2. Collect Admin Details
            name = await question('Admin Name: ');
            email = await question('Admin Email (Login): ');
            appEmail = await question('App Email (Hermes): ');
            appPassword = await question('App Password (Hermes): ');
            appCourierId = await question('App Courier ID: ');
        }

        // Check if admin exists
        const existingAdmin = await prisma.admin.findUnique({ where: { email } });
        if (existingAdmin) {
            console.error('Admin with this email already exists.');
            // If run via args, maybe we should just notify and exit
            process.exit(1);
        }

        console.log('Encrypting app password...');
        const encryptedAppPassword = encrypt(appPassword);

        // 3. Create Admin
        console.log('Creating admin in database...');
        const newAdmin = await prisma.admin.create({
            data: {
                name,
                email,
                appEmail,
                appPassword: encryptedAppPassword,
                appCourierId,
            },
        });

        console.log(`\nAdmin user '${newAdmin.name}' created successfully!`);
        console.log(`ID: ${newAdmin.id}`);

    } catch (err: any) {
        console.error('Error creating admin:', err);
        if (err.code === 'P2002') {
            console.error('Unique constraint failed. User might already exist.');
        }
    } finally {
        rl.close();
        // We can't easily disconnect the imported prisma instance if it's not exported as a class but...
        // The imported `prisma` is an instance.
        const { prisma } = await import('../src/db/prisma');
        await prisma.$disconnect();
        process.exit(0);
    }
};

main();
