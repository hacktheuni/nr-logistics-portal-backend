import { createEvriClient } from "@/lib/axios/appClient";
import { ApiError } from "@/utils/ApiError";

/**
 * Round Sync Service (Third-party Evri API)
 */
export class AppRoundService {
    /**
     * Get all accepted rounds for a courier within a date range
     */
    static async getAllAcceptedRounds(courierId: string, token: string, startDate: string, endDate: string) {
        const client = createEvriClient(token);
        try {
            const response = await client.get(`/availability-service/couriers/${courierId}/dailyplan`, {
                params: { startDate, endDate }
            });
            return response.data;
        } catch (error: any) {
            console.error("Error fetching accepted rounds from Evri:", error.response?.data || error.message);
            throw new ApiError(error.response?.status || 500, "Failed to fetch accepted rounds from Evri");
        }
    }

    /**
     * Get detailed information for a specific round
     */
    static async getRoundDetails(roundId: string, token: string) {
        const client = createEvriClient(token);
        try {
            const response = await client.get(`/availability-service/rounds/${roundId}/rounddetails`, {
                params: { prgType: "GENERAL" }
            });
            return response.data;
        } catch (error: any) {
            console.error("Error fetching round details from Evri:", error.response?.data || error.message);
            throw new ApiError(error.response?.status || 500, "Failed to fetch round details from Evri");
        }
    }
}

export default AppRoundService;
