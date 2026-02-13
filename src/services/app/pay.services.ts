import { createHermesClient } from "@/lib/axios/appClient";
import { ApiError } from "@/utils/ApiError";

/**
 * Pay Sync Service (Third-party Hermes API)
 */
export class AppPayService {
    /**
     * Get adhoc payments for a week
     */
    static async getWeeklyAdditionalPayments(courierId: string, token: string, startDate: string, endDate: string) {
        const client = createHermesClient();
        try {
            const response = await client.get(`/courier-portal-personalisation-api/v1/courier/pay-visibility/additional-payments/weeks`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { startDate, endDate }
            });
            return response.data;
        } catch (error: any) {
            console.error("Error fetching weekly adhoc payments:", error.response?.data || error.message);
            throw new ApiError(error.response?.status || 500, "Failed to fetch weekly adhoc payments");
        }
    }

    /**
     * Get adhoc payments for a period
     */
    static async getPeriodAdditionalPayments(courierId: string, token: string, startDate: string, endDate: string) {
        const client = createHermesClient();
        try {
            const response = await client.get(`/courier-portal-personalisation-api/v1/courier/pay-visibility/additional-payments/period`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { startDate, endDate }
            });
            return response.data;
        } catch (error: any) {
            console.error("Error fetching period adhoc payments:", error.response?.data || error.message);
            throw new ApiError(error.response?.status || 500, "Failed to fetch period adhoc payments");
        }
    }

    /**
     * Get adhoc payments for a specific day
     */
    static async getDailyAdditionalPayments(courierId: string, token: string, date: string) {
        const client = createHermesClient();
        try {
            const response = await client.get(`/courier-portal-personalisation-api/v1/courier/pay-visibility/additional-payments/days/${date}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error: any) {
            console.error("Error fetching daily adhoc payments:", error.response?.data || error.message);
            throw new ApiError(error.response?.status || 500, "Failed to fetch daily adhoc payments");
        }
    }

    /**
     * Get real-time pay for a week
     */
    static async getWeeklyRealTimePay(courierId: string, token: string, startDate: string, endDate: string) {
        const client = createHermesClient();
        try {
            const response = await client.get(`/courier-portal-personalisation-api/v1/courier/pay-visibility/real-time-courier-pay/weeks`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { startDate, endDate }
            });
            return response.data;
        } catch (error: any) {
            console.error("Error fetching weekly real-time pay:", error.response?.data || error.message);
            throw new ApiError(error.response?.status || 500, "Failed to fetch weekly real-time pay");
        }
    }

    /**
     * Get real-time pay for a period
     */
    static async getPeriodRealTimePay(courierId: string, token: string, startDate: string, endDate: string) {
        const client = createHermesClient();
        try {
            const response = await client.get(`/courier-portal-personalisation-api/v1/courier/pay-visibility/real-time-courier-pay/period`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { startDate, endDate }
            });
            return response.data;
        } catch (error: any) {
            console.error("Error fetching period real-time pay:", error.response?.data || error.message);
            throw new ApiError(error.response?.status || 500, "Failed to fetch period real-time pay");
        }
    }

    /**
     * Get real-time pay for a specific day
     */
    static async getDailyRealTimePay(courierId: string, token: string, date: string) {
        const client = createHermesClient();
        try {
            const response = await client.get(`/courier-portal-personalisation-api/v1/courier/pay-visibility/real-time-courier-pay`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { date }
            });
            return response.data;
        } catch (error: any) {
            console.error("Error fetching daily real-time pay:", error.response?.data || error.message);
            throw new ApiError(error.response?.status || 500, "Failed to fetch daily real-time pay");
        }
    }
}

export default AppPayService;
