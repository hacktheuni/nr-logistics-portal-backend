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
        const uniqueId = await this.checkUser(email);
        return await this.authenticate(uniqueId, password);
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
