import { PrismaClient } from '@prisma/client';
import { shopify } from './server/src/config/shopify';

const prisma = new PrismaClient();

async function test() {
    const store = await prisma.store.findFirst({
        where: { isActive: true }
    });
    
    if (!store || !store.accessToken) {
        console.log("No store found to test");
        return;
    }
    
    console.log("Testing with store", store.shopifyDomain);
    
    const client = new shopify.clients.Graphql({
        session: { shop: store.shopifyDomain, accessToken: store.accessToken, isOnline: false } as any
    });
    
    // OLD WAY
    const oldWay: any = await client.query({
        data: { query: 'query { shop { name } }' }
    });
    
    console.log("OLD WAY RETURNS:");
    console.log(Object.keys(oldWay));
    console.log(oldWay.body);
    
    // NEW WAY
    const newWay: any = await client.request('query { shop { name } }');
    console.log("NEW WAY RETURNS:");
    console.log(Object.keys(newWay));
    console.log(newWay.data);
}
test().catch(console.error);
