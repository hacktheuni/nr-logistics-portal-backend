
import cron from 'node-cron';
import { config } from '../config/env';
import authJob from './jobs/auth.job';
import roundJob from './jobs/round.job';

class CronManager {
    private jobs: cron.ScheduledTask[] = [];

    constructor() { }

    public init() {
        console.log('Initializing Cron Jobs...');

        // Auth Job
        // If config.cronAuthSchedule is invalid, node-cron might throw. 
        // We should validate or wrap in try-catch if needed, but for now assuming valid.
        const authTask = cron.schedule(config.cronAuthSchedule, async () => {
            console.log(`[${new Date().toISOString()}] Running Auth Job...`);
            try {
                await authJob.execute();
            } catch (error) {
                console.error('Error in Auth Job:', error);
            }
        });
        this.jobs.push(authTask);
        console.log(`Auth Job scheduled: ${config.cronAuthSchedule}`);

        // Round Job
        const roundTask = cron.schedule(config.cronRoundSchedule, async () => {
            console.log(`[${new Date().toISOString()}] Running Round Job...`);
            try {
                await roundJob.execute();
            } catch (error) {
                console.error('Error in Round Job:', error);
            }
        });
        this.jobs.push(roundTask);
        console.log(`Round Job scheduled: ${config.cronRoundSchedule}`);

        console.log('Cron Jobs Initialized.');
    }

    public stopAll() {
        this.jobs.forEach(job => job.stop());
        console.log('All Cron Jobs stopped.');
    }
}

export default new CronManager();
