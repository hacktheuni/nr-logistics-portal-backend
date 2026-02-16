
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const main = async () => {
    // Dynamic imports
    const { default: AppAuthService } = await import('../src/services/app/auth.services');
    const { prisma } = await import('../src/db/prisma');
    const { decrypt } = await import('../src/utils/encryption');

    try {
        console.log("--- Starting Isolated Auth Test ---");

        // 1. Get Admin User
        const admin = await prisma.admin.findFirst();

        if (!admin) {
            console.error("No admin user found. Please run create-admin.ts first.");
            process.exit(1);
        }

        console.log(`Using Admin: ${admin.email}`);

        // 2. Decrypt Password
        console.log("Decrypting password...");
        const rawPassword = decrypt(admin.appPassword);

        // 3. Login
        console.log("Attempting to authenticate with AppAuthService...");
        const authResult = await AppAuthService.login(admin.appEmail, rawPassword);

        console.log("\n✅ Login Successful!");
        console.log("---------------------------------------------------");
        console.log("Access Token:", authResult.accessToken);
        console.log("---------------------------------------------------");
        console.log("ID Token:", authResult.idToken);
        console.log("---------------------------------------------------");
        console.log("Refresh Token:", authResult.refreshToken);
        console.log("---------------------------------------------------");

    } catch (err: any) {
        console.error("\n❌ Auth Test Failed:");
        if (err.response) {
            console.error(`Status: ${err.response.status}`);
            console.error("Data:", JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(err.message || err);
        }
    } finally {
        const { prisma } = await import('../src/db/prisma');
        await prisma.$disconnect();
    }
};

main();
