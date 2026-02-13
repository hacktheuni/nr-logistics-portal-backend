import { createHermesClient } from "@/lib/axios/appClient";
import { ApiError } from "@/utils/ApiError";

/**
 * Review Sync Service (Third-party Hermes API)
 */
export class AppReviewService {
    /**
     * Get average rating for the courier
     */
    static async getAverageRating(token: string) {
        const client = createHermesClient();
        try {
            const response = await client.get(`/courier-portal-personalisation-api/v1/rating/average`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error: any) {
            console.error("Error fetching average rating from Hermes:", error.response?.data || error.message);
            throw new ApiError(error.response?.status || 500, "Failed to fetch average rating from Hermes");
        }
    }

    /**
     * Get reviews for the courier
     */
    static async getReviews(courierId: string, token: string, page: number = 0, size: number = 20, stars: string = "4,5") {
        const client = createHermesClient();
        try {
            const response = await client.get(`/courier-portal-personalisation-api/v1/comment`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    courierId,
                    page,
                    size,
                    commentOnly: true,
                    stars
                }
            });
            return response.data;
        } catch (error: any) {
            console.error("Error fetching reviews from Hermes:", error.response?.data || error.message);
            throw new ApiError(error.response?.status || 500, "Failed to fetch reviews from Hermes");
        }
    }
}

export default AppReviewService;
