import { Express } from 'express';

declare global {
    namespace Express {
        interface Request {
            user?: {
                storeId: string;
                shopifyDomain: string;
            };
        }
    }
}
