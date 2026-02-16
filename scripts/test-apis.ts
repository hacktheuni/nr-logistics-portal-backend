
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Utilities (dynamic imports handled in main for safety, but we can standard import if env is loaded)
// To be safe with the previously observed behavior, we'll load env first.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// We need to import services *after* env is loaded if they rely on it top-level (though they shouldn't usually).
// Using dynamic imports for services to be safe and consistent with previous script pattern.

const main = async () => {
    // Dynamic imports
    const { default: AppAuthService } = await import('../src/services/app/auth.services');
    const { default: AppRoundService } = await import('../src/services/app/round.services');
    const { default: AppManifestService } = await import('../src/services/app/manifest.services');
    const { default: AppPayService } = await import('../src/services/app/pay.services');
    const { default: AppReviewService } = await import('../src/services/app/review.services');

    // We need prisma to get the admin
    const { prisma } = await import('../src/db/prisma');
    const { decrypt } = await import('../src/utils/encryption');

    try {
        console.log("--- Starting Third-Party API Test ---");

        // 1. Get Admin User
        // We'll grab the first admin found, or filter by email if passed as arg
        const admin = await prisma.admin.findFirst();

        if (!admin) {
            console.error("No admin user found. Please run create-admin.ts first.");
            process.exit(1);
        }

        console.log(`Using Admin: ${admin.email}`);

        // 2. Login (This triggers AppAuthService.authenticate which calls Hermes/Cognito)
        console.log("\n[1] Testing Authentication...");
        console.log("Logging in via AppAuthService...");

        const rawPassword = decrypt(admin.appPassword);
        const authResult = await AppAuthService.login(admin.appEmail, rawPassword);

        console.log("Login Successful!");
        const token = authResult.accessToken;

        // Fetch User Profile to get correct Courier ID
        console.log("Fetching User Profile...");
        const userProfile = await AppAuthService.getUser(token);
        // console.log("User Profile Attributes:", JSON.stringify(userProfile.UserAttributes, null, 2));

        // Attempt to find courier ID in attributes
        let courierId = admin.appCourierId;
        const courierIdAttr = userProfile.UserAttributes?.find((attr: any) =>
            attr.Name === 'custom:courier_id' || attr.Name === 'custom:courierId'
        );

        if (courierIdAttr) {
            courierId = courierIdAttr.Value;
            console.log(`Found Courier ID in profile: ${courierId}`);

            // Optional: Update admin record for future use
            if (courierId !== admin.appCourierId) {
                console.log("Updating Admin record with correct Courier ID...");
                await prisma.admin.update({
                    where: { id: admin.id },
                    data: { appCourierId: courierId }
                });
            }
        } else {
            console.log(`Courier ID from Admin record: ${courierId}`);
        }

        if (!courierId || courierId === '000000') {
            console.warn("WARNING: Courier ID is missing or placeholder. API calls may fail.");
        }

        // Helper for dates
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const prevWeek = new Date(today);
        prevWeek.setDate(today.getDate() - 7);

        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        // 3. Test Round API
        console.log("\n[2] Testing Round API...");
        const startDate = formatDate(prevWeek);
        const endDate = formatDate(nextWeek);
        console.log(`Fetching accepted rounds from ${startDate} to ${endDate}...`);

        const rounds = await AppRoundService.getAllAcceptedRounds(courierId, token, startDate, endDate);
        console.log(`Found ${rounds?.length || 0} rounds.`);

        let sampleRoundId = null;
        if (rounds && rounds.length > 0) {
            console.log("Sample Round:", JSON.stringify(rounds[0], null, 2));
            sampleRoundId = rounds[0].roundId || rounds[0].id;

            if (sampleRoundId) {
                console.log(`Fetching details for round ${sampleRoundId}...`);
                const roundDetails = await AppRoundService.getRoundDetails(sampleRoundId, token);
                console.log("Round Details fetched successfully.");
            }
        }

        // 4. Test Manifest API
        console.log("\n[3] Testing Manifest API...");
        if (sampleRoundId) {
            console.log(`Fetching manifests for round ${sampleRoundId}...`);
            const manifests = await AppManifestService.getAllManifests(courierId, sampleRoundId, token);
            console.log(`Found ${manifests?.length || 0} manifests.`);

            if (manifests && manifests.length > 0) {
                const sampleManifest = manifests[0];
                const manifestNumber = sampleManifest.manifestNumber || sampleManifest.id;
                console.log(`Fetching parcels for manifest ${manifestNumber}...`);
                const parcels = await AppManifestService.getManifestParcels(courierId, sampleRoundId, manifestNumber, token);
                console.log(`Found ${parcels?.parcels?.length || 0} parcels.`);
            }
        } else {
            console.log("Skipping Manifest API test (no round ID available).");
        }

        // 5. Test Pay API
        console.log("\n[4] Testing Pay API...");
        console.log(`Fetching daily real-time pay for ${formatDate(today)}...`);
        const dailyPay = await AppPayService.getDailyRealTimePay(courierId, token, formatDate(today));
        console.log("Daily Pay:", JSON.stringify(dailyPay, null, 2));

        // 6. Test Review API
        console.log("\n[5] Testing Review API...");
        console.log("Fetching average rating...");
        const avgRating = await AppReviewService.getAverageRating(token);
        console.log("Average Rating:", avgRating);

        console.log("Fetching reviews...");
        const reviews = await AppReviewService.getReviews(courierId, token);
        console.log(`Found ${reviews?.content?.length || 0} reviews.`);

        console.log("\n--- All Tests Completed ---");

    } catch (err: any) {
        console.error("\n❌ Test Failed:");
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
