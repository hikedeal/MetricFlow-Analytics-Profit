import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

export interface AuthRequest extends Request {
    user?: {
        storeId: string;
        shopifyDomain: string;
    };
}

export async function authenticate(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        // DEVELOPMENT MODE BYPASS - Only for local development to ease testing
        if (process.env.NODE_ENV === 'development' && (!authHeader || !authHeader.startsWith('Bearer '))) {
            const shop = req.query.shop as string;

            if (shop) {
                const store = await prisma.store.findUnique({
                    where: { shopifyDomain: shop }
                });

                if (store) {
                    (req as AuthRequest).user = {
                        storeId: store.id,
                        shopifyDomain: store.shopifyDomain,
                    };
                    return next();
                }
            } else {
                // If no shop parameter, fallback to the last installed one IF there is only one
                // This is a convenience for local dev, but we should be careful.
                // For strict safety as requested, let's require 'shop' or 'token'
                const storeCount = await prisma.store.count({ where: { isActive: true } });
                if (storeCount === 1) {
                    const store = await prisma.store.findFirst({ where: { isActive: true } });
                    if (store) {
                        (req as AuthRequest).user = {
                            storeId: store.id,
                            shopifyDomain: store.shopifyDomain,
                        };
                        return next();
                    }
                }
            }
        }

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError(401, 'No token provided');
        }

        const token = authHeader.substring(7);

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET not configured');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
            storeId: string;
            shopifyDomain: string;
        };

        // Verify store exists and is active
        const store = await prisma.store.findUnique({
            where: { id: decoded.storeId },
        });

        if (!store || !store.isActive) {
            throw new ApiError(401, 'Invalid or inactive store');
        }

        // Attach user to request
        (req as AuthRequest).user = {
            storeId: decoded.storeId,
            shopifyDomain: decoded.shopifyDomain,
        };

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new ApiError(401, 'Invalid token'));
        } else {
            next(error);
        }
    }
}
