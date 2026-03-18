import { logger } from '../config/logger';

export class WebhookRegistrationService {
    /**
     * Register all required webhooks for a store
     */
    static async registerWebhooks(shop: string, accessToken: string, shopify: any) {
        try {
            logger.info(`Registering webhooks for shop: ${shop}`);

            const response = await shopify.webhooks.register({
                session: {
                    shop,
                    accessToken,
                    state: '',
                    isOnline: false,
                } as any,
            });

            // The response is an object where keys are topics and values are arrays of registration results
            Object.keys(response).forEach((topic) => {
                const results = response[topic];
                results.forEach((result: any) => {
                    if (result.success) {
                        logger.info(`Webhook registered successfully: ${topic}`);
                    } else {
                        logger.error(`Failed to register webhook: ${topic}`, result.result);
                    }
                });
            });

            return response;
        } catch (error) {
            logger.error(`Webhook registration error for ${shop}:`, error);
            throw error;
        }
    }
}
