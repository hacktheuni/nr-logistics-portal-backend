
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authJob from '../src/cron/jobs/auth.job';
import roundJob from '../src/cron/jobs/round.job';
import { prisma } from '../src/db/prisma'; // Verify path
import cacheService from '../src/services/cache.service';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const main = async () => {
    console.log("--- Manual Cron Job Test ---");

    const args = process.argv.slice(2);
    const jobName = args[0];

    try {
        if (!jobName || jobName === 'auth') {
            console.log("\n[1] Testing Auth Job...");
            await authJob.execute();
        }

        if (!jobName || jobName === 'round') {
            console.log("\n[2] Testing Round Job...");
            await roundJob.execute();
        }

    } catch (err) {
        console.error("Error running jobs:", err);
    } finally {
        await prisma.$disconnect();
        await cacheService.quit();
    }
};

main();
