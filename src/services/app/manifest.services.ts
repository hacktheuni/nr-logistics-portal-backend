import { createHermesClient } from "@/lib/axios/appClient";
import { ApiError } from "@/utils/ApiError";

/**
 * Manifest Sync Service (Third-party Hermes API)
 */
export class AppManifestService {
    /**
     * Get all manifests for a courier and specific round
     */
    static async getAllManifests(courierId: string, roundId: string, token: string) {
        const client = createHermesClient();
        try {
            const response = await client.get(`/courier-portal-cp-manifest-api/v1/courier/${courierId}/round/${roundId}/manifests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error: any) {
            console.error("Error fetching manifests from Hermes:", error.response?.data || error.message);
            throw new ApiError(error.response?.status || 500, "Failed to fetch manifests from Hermes");
        }
    }

    /**
     * Get parcel details for a specific manifest
     */
    static async getManifestParcels(courierId: string, roundId: string, manifestNumber: string, token: string, pageNum: number = 1) {
        const client = createHermesClient();
        try {
            const response = await client.get(`/courier-portal-cp-manifest-api/v1/courier/${courierId}/round/${roundId}/manifest/${manifestNumber}/manifestParcels`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { pageNum }
            });
            return response.data;
        } catch (error: any) {
            console.error("Error fetching manifest parcels from Hermes:", error.response?.data || error.message);
            throw new ApiError(error.response?.status || 500, "Failed to fetch manifest parcels from Hermes");
        }
    }
}

export default AppManifestService;
