
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cronManager from './cron/cron-manager';
import { prisma } from './db/prisma';
import cacheService from './services/cache.service';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const startCronServer = async () => {
    console.log("--- Starting Cron Server ---");

    // Validate DB connection
    try {
        await prisma.$connect();
        console.log("Database connected.");
    } catch (e) {
        console.error("Database connection failed:", e);
        process.exit(1);
    }

    // Initialize Cron Manager
    cronManager.init();

    // Graceful Shutdown
    const shutdown = async () => {
        console.log("\nShutting down Cron Server...");
        cronManager.stopAll();
        await prisma.$disconnect();
        await cacheService.quit();
        console.log("Cron Server stopped.");
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
};

startCronServer();
