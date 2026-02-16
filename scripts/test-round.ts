
// import { PrismaClient } from '@prisma/client';
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
    const { default: AppRoundService } = await import('../src/services/app/round.services');
    const { prisma } = await import('../src/db/prisma');
    const { decrypt } = await import('../src/utils/encryption');

    try {
        console.log("--- Starting Round API Test (ID Token) ---");

        // 1. Get Admin User
        const admin = await prisma.admin.findFirst();

        if (!admin) {
            console.error("No admin user found. Please run create-admin.ts first.");
            process.exit(1);
        }

        console.log(`Using Admin: ${admin.email}`);

        // 2. Decrypt Password & Login
        const rawPassword = decrypt(admin.appPassword);
        console.log("Authenticating...");
        const authResult = await AppAuthService.login(admin.appEmail, rawPassword);
        console.log("Login Successful!");

        // IMPORTANT: Use ID Token for data APIs as requested
        const idToken = authResult.idToken;
        // console.log("Using ID Token:", idToken.substring(0, 20) + "...");

        // 3. Get Courier ID
        // Try to get from profile first as it might be more accurate/up-to-date than local DB
        const userProfile = await AppAuthService.getUser(idToken); // Trying ID token for getUser too? Usually getUser takes AccessToken.
        // User request specifically said "use 'ID Token' as the access token to the data apis".
        // `getUser` is on `AppAuthService`, is it a "data api"? 
        // `getUser` calls `createCognitoClient("GetUser")`. This is likely AWS Cognito directly.
        // AWS Cognito usually requires Access Token for `GetUser`.
        // However, the user said "use 'ID Token' ... for data fetching".
        // Let's assume `AppRoundService` (Hermes API) needs ID Token. 
        // `AppAuthService.getUser` (Cognito API) might still need Access Token.
        // I will use Access Token for `getUser` to be safe/standard for Cognito, 
        // and ID Token for `AppRoundService` as explicitly requested.

        // Actually, let's try to get courier ID from admin record first to save a call, 
        // if it's there. 
        let courierId = admin.appCourierId;

        // If '000000', fetch from profile using AccessToken (standard for Cognito)
        if (!courierId || courierId === '000000') {
            console.log("Fetching User Profile to find Courier ID...");
            // Using accessToken for Cognito User Profile as that is standard
            const userProfile = await AppAuthService.getUser(authResult.accessToken);
            const courierIdAttr = userProfile.UserAttributes?.find((attr: any) =>
                attr.Name === 'custom:courier_id' || attr.Name === 'custom:courierId'
            );
            if (courierIdAttr) {
                courierId = courierIdAttr.Value;
                console.log(`Found Courier ID: ${courierId}`);
            }
        } else {
            console.log(`Using Courier ID from DB: ${courierId}`);
        }

        if (!courierId || courierId === '000000') {
            console.warn("WARNING: Courier ID is missing. API calls will likely fail.");
        }

        // 4. Test Round API with ID Token
        // Helper for dates
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const prevWeek = new Date(today);
        prevWeek.setDate(today.getDate() - 7);
        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        const startDate = formatDate(prevWeek);
        const endDate = formatDate(nextWeek);

        console.log(`\nFetching accepted rounds from ${startDate} to ${endDate} using ID Token...`);

        const rounds = await AppRoundService.getAllAcceptedRounds(courierId, idToken, startDate, endDate);
        console.log(`✅ Success! Found ${rounds?.length || 0} rounds.`);

        if (rounds && rounds.length > 0) {
            console.log("Sample Round:", JSON.stringify(rounds[0], null, 2));

            const roundId = rounds[0].roundId || rounds[0].id || rounds[0].journeyId;
            // journeyId is common in Hermes for rounds.

            if (roundId) {
                console.log(`\nFetching details for round ${roundId} using ID Token...`);
                const roundDetails = await AppRoundService.getRoundDetails(roundId, idToken);
                console.log("✅ Round Details fetched successfully.");
                // console.log(JSON.stringify(roundDetails, null, 2));
            } else {
                console.log("Could not determine Round ID from response to fetch details.");
            }
        }

    } catch (err: any) {
        console.error("\n❌ Round API Test Failed:");
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
