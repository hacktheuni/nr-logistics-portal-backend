import { createHermesClient, createCognitoClient } from "@/lib/axios/appClient";
import { AuthenticationDetails, CognitoUserPool, CognitoUser } from "amazon-cognito-identity-js";
import { config } from "@/config/env";
import { ApiError } from "@/utils/ApiError";

const userPoolId = config.cognitoUserPoolId || "eu-west-1_NY5zvlEkX";
const clientId = config.cognitoClientId || "1hhgrgksb17btngl3g63j1fegm";

/**
 * Third-party (Hermes/Evri) Authentication Service
 */
export class AppAuthService {
    /**
     * Check if a user exists in the Hermes system and get their uniqueId
     */
    static async checkUser(email: string): Promise<string> {
        const client = createHermesClient();
        try {
            const response = await client.post("/auth-api/v1/user", {
                signUpSource: "ANDROID",
                email: email,
                courierId: "",
                isOnboarding: true
            });

            if (!response.data || !response.data.uniqueId) {
                throw new ApiError(404, "User not found in Hermes system");
            }

            return response.data.uniqueId;
        } catch (error: any) {
            console.error("Error checking user in Hermes:", error.response?.data || error.message);
            throw new ApiError(error.response?.status || 500, error.response?.data?.message || "Failed to check user in Hermes");
        }
    }

    /**
     * Authenticate with Cognito SRP
     */
    static async authenticate(uniqueId: string, password: string): Promise<{ accessToken: string; idToken: string; refreshToken: string }> {
        const userPool = new CognitoUserPool({
            UserPoolId: userPoolId,
            ClientId: clientId
        });

        const authDetails = new AuthenticationDetails({
            Username: uniqueId,
            Password: password
        });

        const cognitoUser = new CognitoUser({
            Username: uniqueId,
            Pool: userPool
        });

        return new Promise((resolve, reject) => {
            cognitoUser.authenticateUser(authDetails, {
                onSuccess: (result) => {
                    resolve({
                        accessToken: result.getAccessToken().getJwtToken(),
                        idToken: result.getIdToken().getJwtToken(),
                        refreshToken: result.getRefreshToken().getToken()
                    });
                },
                onFailure: (err) => {
                    console.error("Cognito Auth Failure:", err);
                    reject(new ApiError(401, err.message || "Failed to authenticate with Hermes (Cognito)"));
                }
            });
        });
    }

    /**
     * Complete login flow: check user + authenticate
     */
    static async login(email: string, password: string) {
        // If the password appears to be encrypted (e.g., standard AES output format), try to decrypt it.
        // However, the prompt says "store the appPassowrd using encryption... and then when ever appAuth ... wants it to login".
        // The `login` method takes `password`.
        // If this method is called with the *encrypted* password from the DB, we need to decrypt it here.
        // But `login` could be called from a standard frontend login where the user types the raw password.

        // Wait, the USER REQUEST said: "when ever appAuth ... wants it to login third party app with the appEmail and appPassword"
        // This implies `AppAuthService.login` is likely used by the system using stored credentials, OR the "admin" logging in.

        // Let's verify where `AppAuthService.login` is used.
        // I'll search for usages of `AppAuthService.login` first to be safe, but for now I will add the import and decryption logic 
        // assuming the `password` argument MIGHT be encrypted. 
        // Actually, to be safer and cleaner, I should probably check if it *looks* encrypted or just always decrypt if we are sure the flow passes encrypted.
        // BUT, if I change `login` to expect encrypted, I break normal login if that exists.

        // Let's assume the caller will handle passing the correct value, OR we handle it here. 
        // The request says "when ever appAuth ... wants it to login ... use the script to store ... encryption".
        // Use `decrypt` from utils.

        // I'll first update the imports.
        return await this.authenticate(await this.checkUser(email), password);
    }

    /**
     * Get user profile details from Cognito using accessToken
     */
    static async getUser(accessToken: string): Promise<any> {
        const client = createCognitoClient("GetUser");
        try {
            const response = await client.post("/", {
                AccessToken: accessToken
            });
            return response.data;
        } catch (error: any) {
            console.error("Error getting user from Cognito:", error.response?.data || error.message);
            throw new ApiError(error.response?.status || 500, "Failed to get user profile from Hermes");
        }
    }

    /**
     * Refresh tokens using a refresh token
     */
    static async refreshTokens(refreshToken: string): Promise<{ accessToken: string; idToken: string; expiresIn: number }> {
        const client = createCognitoClient("InitiateAuth");
        try {
            const response = await client.post("/", {
                ClientId: clientId,
                AuthFlow: "REFRESH_TOKEN_AUTH",
                AuthParameters: {
                    REFRESH_TOKEN: refreshToken
                }
            });

            if (!response.data || !response.data.AuthenticationResult) {
                throw new ApiError(401, "Invalid refresh token");
            }

            const { AccessToken, IdToken, ExpiresIn } = response.data.AuthenticationResult;

            return {
                accessToken: AccessToken,
                idToken: IdToken,
                expiresIn: ExpiresIn
            };
        } catch (error: any) {
            console.error("Error refreshing tokens from Cognito:", error.response?.data || error.message);
            throw new ApiError(error.response?.status || 401, "Failed to refresh tokens from Hermes");
        }
    }
}

export default AppAuthService;
