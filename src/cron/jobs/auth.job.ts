
import AppAuthService from '../../services/app/auth.services';
import cacheService from '../../services/cache.service';
import { prisma } from '../../db/prisma'; // Ensure prisma is imported correctly
import { decrypt } from '../../utils/encryption';

const CACHE_KEYS = {
    ACCESS_TOKEN: 'hermes:access_token',
    ID_TOKEN: 'hermes:id_token',
    REFRESH_TOKEN: 'hermes:refresh_token'
};

// Assuming 15 mins expiry for tokens as per prompt. 
// We refresh if ID token is missing or near expiry. 
// However, reading the CacheService, we don't store "expiresAt" explicitly in value, 
// usually we rely on Redis TTL.
// But to be safe and proactive, we might check validity. 
// For now, let's trust Redis TTL or simple "if missing, refresh".

class AuthJob {
    public async execute() {
        try {
            console.log("Checking Auth Status...");

            // 1. Check if ID token exists
            const idToken = await cacheService.get(CACHE_KEYS.ID_TOKEN);

            if (idToken) {
                console.log("Valid ID Token found in cache. No action needed.");
                // We could verify it's not about to expire if we decoded it, 
                // but the prompt says 15 min expiry and we schedule every 14 mins.
                // So if it's there, it's likely valid for at least a minute.
                return;
            }

            console.log("ID Token missing or expired. Attempting refresh...");

            // 2. Try Refresh Token
            const refreshToken = await cacheService.get(CACHE_KEYS.REFRESH_TOKEN);

            if (refreshToken) {
                try {
                    console.log("Found Refresh Token. calling refreshTokens...");
                    const tokens = await AppAuthService.refreshTokens(refreshToken);
                    await this.cacheTokens(tokens);
                    console.log("Tokens refreshed successfully.");
                    return;
                } catch (err) {
                    console.error("Failed to refresh tokens:", err);
                    // Fallthrough to full login
                }
            }

            // 3. Full Login
            console.log("Refresh failed or no token. Performing full login...");
            const admin = await prisma.admin.findFirst();

            if (!admin) {
                console.error("No admin user found for re-authentication.");
                return;
            }

            const rawPassword = decrypt(admin.appPassword);
            const loginResult = await AppAuthService.login(admin.appEmail, rawPassword);

            await this.cacheTokens(loginResult);
            console.log("Full login successful. Tokens cached.");

            // 4. Sync Courier ID
            try {
                console.log("Syncing Courier ID from User Profile...");
                const userProfile = await AppAuthService.getUser(loginResult.accessToken);
                const courierIdAttr = userProfile.UserAttributes?.find((attr: any) =>
                    attr.Name === 'custom:courier_id' || attr.Name === 'custom:courierId'
                );

                if (courierIdAttr && courierIdAttr.Value) {
                    const courierId = courierIdAttr.Value;
                    if (admin.appCourierId !== courierId) {
                        console.log(`Updating Admin Courier ID: ${courierId}`);
                        await prisma.admin.update({
                            where: { id: admin.id },
                            data: { appCourierId: courierId }
                        });
                    } else {
                        console.log("Courier ID is up to date.");
                    }
                }
            } catch (err) {
                console.error("Failed to sync Courier ID:", err);
            }

        } catch (error) {
            console.error("Fatal error in Auth Job:", error);
        }
    }

    private async cacheTokens(tokens: { accessToken: string; idToken: string; refreshToken?: string; expiresIn?: number }) {
        // Cache ID token and Access token for ~14 mins (slightly less than 15 to force refresh/login before actual expiry)
        // actually prompt says: "store it also for 14 or 15 min". 
        // Let's use 14 mins (840 seconds) to be safe.
        const TTL = 14 * 60;

        await cacheService.set(CACHE_KEYS.ACCESS_TOKEN, tokens.accessToken, TTL);
        await cacheService.set(CACHE_KEYS.ID_TOKEN, tokens.idToken, TTL);

        if (tokens.refreshToken) {
            // Refresh token lasts 1 day (86400 seconds)
            await cacheService.set(CACHE_KEYS.REFRESH_TOKEN, tokens.refreshToken, 86400);
        }
    }
}

export default new AuthJob();
