import axios from 'axios';

async function testConfig() {
    const shops = [
        'jaibros1.myshopify.com',
        'cutncurve.myshopify.com',
        'hikedeal-2.myshopify.com',
        'nonexistent.myshopify.com'
    ];

    for (const shop of shops) {
        try {
            const res = await axios.get(`http://localhost:5001/api/auth/config?shop=${shop}`);
            console.log(`Shop: ${shop} -> API Key: ${res.data.data.apiKey}`);
        } catch (e: any) {
            console.error(`Error for ${shop}:`, e.message);
        }
    }
}

testConfig();
