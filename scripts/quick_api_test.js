// Quick API test - no auth needed for diagnostic
const https = require('https');

const url = 'https://inventory-management-backend-production-5631.up.railway.app/api/skus?page=1&limit=1&search=YZEKCREOFKIYT0';

console.log('Testing Railway API...\n');
console.log('URL:', url);
console.log('');

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('');

        if (res.statusCode === 401) {
            console.log('⚠️  Got 401 - Authentication required');
            console.log('This is expected. Railway backend is running.');
            console.log('');
            console.log('Since Railway is running, the issue must be:');
            console.log('1. Railway did not pull the latest code (commit b196b47)');
            console.log('2. Railway build cache needs to be cleared');
            console.log('');
            console.log('✅ SOLUTION:');
            console.log('1. Go to Railway dashboard');
            console.log('2. Settings → Enable "Clear build cache"');
            console.log('3. Redeploy again');
        } else if (res.statusCode === 200) {
            try {
                const response = JSON.parse(data);
                if (response.data && response.data.length > 0) {
                    const sku = response.data[0];
                    console.log('✅ Found SKU in response');
                    console.log('');
                    console.log('SKU ID:', sku.skuId);
                    console.log('Item Name:', sku.itemName);
                    console.log('Last Purchase Price:', sku.lastPurchasePrice);
                    console.log('Average Unit Price:', sku.averageUnitPrice);
                    console.log('Min Unit Price:', sku.minUnitPrice);
                    console.log('');

                    if (sku.averageUnitPrice !== null && sku.averageUnitPrice !== undefined) {
                        console.log('✅ Backend IS returning averageUnitPrice!');
                        console.log('   Issue is in FRONTEND display logic');
                    } else {
                        console.log('❌ Backend NOT returning averageUnitPrice');
                        console.log('   Railway has NOT deployed the latest code');
                    }
                }
            } catch (e) {
                console.log('Response (first 500 chars):', data.substring(0, 500));
            }
        } else {
            console.log('Response:', data.substring(0, 500));
        }
    });
}).on('error', (error) => {
    console.error('❌ Request failed:', error.message);
});
