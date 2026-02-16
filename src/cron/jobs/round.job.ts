
import AppRoundService from '../../services/app/round.services';
import cacheService from '../../services/cache.service';
import authJob from './auth.job';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../db/prisma';

const CACHE_KEYS = {
    ID_TOKEN: 'hermes:id_token'
};

class RoundJob {
    public async execute() {
        console.log("Starting Round Data Fetch...");

        // 1. Get Token
        let idToken = await cacheService.get(CACHE_KEYS.ID_TOKEN);
        if (!idToken) {
            console.log("ID Token missing in Round Job. Triggering Auth Job...");
            await authJob.execute();
            idToken = await cacheService.get(CACHE_KEYS.ID_TOKEN);
            if (!idToken) {
                console.error("Failed to obtain ID Token even after Auth Job. Aborting Round Job.");
                return;
            }
        }

        // 2. Get Admin/Courier info
        const admin = await prisma.admin.findFirst();
        if (!admin) {
            console.error("No admin found for courier ID.");
            return;
        }

        const courierId = admin.appCourierId;
        if (!courierId || courierId === '000000') {
            console.error("Invalid Courier ID. Aborting.");
            return;
        }
        console.log(`Fetching rounds for Courier ID: ${courierId}`);

        // 3. Define Dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 21); // 3 weeks

        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        console.log(`Fetching rounds from ${formatDate(startDate)} to ${formatDate(endDate)}...`);

        try {
            const response = await AppRoundService.getAllAcceptedRounds(
                courierId,
                idToken,
                formatDate(startDate),
                formatDate(endDate)
            );

            // Prepare Log Directory
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const runDir = path.resolve(process.cwd(), 'logs', 'rounds', timestamp);
            if (!fs.existsSync(runDir)) {
                fs.mkdirSync(runDir, { recursive: true });
            }

            // Save Raw Response
            fs.writeFileSync(path.join(runDir, 'api_response.json'), JSON.stringify(response, null, 2));
            console.log(`Saved raw API response to ${path.join(runDir, 'api_response.json')}`);

            // Extract Rounds from planDays
            const rounds: any[] = [];
            if (response && response.planDays && Array.isArray(response.planDays)) {
                response.planDays.forEach((day: any) => {
                    if (day.roundAllocations && Array.isArray(day.roundAllocations)) {
                        rounds.push(...day.roundAllocations);
                    }
                });
            }

            console.log(`Fetched ${rounds.length} rounds from ${response?.planDays?.length || 0} days.`);

            // We no longer fetch details for each round in the cron job as they are static.
            // Details will be fetched on demand or via a separate process if needed.

        } catch (error) {
            console.error("Error fetching rounds:", error);
        }
    }
}

export default new RoundJob();
