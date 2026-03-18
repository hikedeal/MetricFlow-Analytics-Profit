import { RedisService, initializeRedis } from '../src/services/redis.service';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    console.log('Connecting to Redis...');
    await initializeRedis();

    console.log('Flushing all Redis keys...');
    try {
        await RedisService.flushPattern('*');
        console.log('✅ Cache flushed successfully.');
    } catch (e) {
        console.error('❌ Error flushing cache:', e);
    }
    process.exit(0);
}

main();
