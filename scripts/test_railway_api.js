const https = require('https');

const API_URL = 'https://inventory-management-backend-production-5631.up.railway.app/api/skus';

// You'll need to provide your auth token
const AUTH_TOKEN = process.argv[2];

if (!AUTH_TOKEN) {
    console.log('❌ Please provide auth token as argument:');
    console.log('   node scripts\\test_railway_api.js YOUR_TOKEN_HERE');
    console.log('');
    console.log('Get your token from:');
    console.log('1. Open browser DevTools (F12)');
    console.log('2. Go to Application > Local Storage');
    console.log('3. Copy the "token" value');
    process.exit(1);
}

const options = {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
    }
};

console.log('🔍 Testing Railway API Endpoint...\n');
console.log('URL:', API_URL);
console.log('Method: GET\n');

https.get(API_URL + '?page=1&limit=5', options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('');

        if (res.statusCode === 200) {
            try {
                const response = JSON.parse(data);

                if (response.data && response.data.length > 0) {
                    console.log('✅ API Response received');
                    console.log('Total SKUs:', response.total);
                    console.log('');

                    console.log('=== Testing First SKU ===');
                    const firstSKU = response.data[0];

                    console.log('SKU ID:', firstSKU.skuId);
                    console.log('Item Name:', firstSKU.itemName);
                    console.log('');
                    console.log('📊 Price Fields:');
                    console.log('  lastPurchasePrice:', firstSKU.lastPurchasePrice);
                    console.log('  averageUnitPrice:', firstSKU.averageUnitPrice);
                    console.log('  minUnitPrice:', firstSKU.minUnitPrice);
                    console.log('');

                    // Check if avg and min prices exist
                    const hasAvgPrice = firstSKU.averageUnitPrice !== null && firstSKU.averageUnitPrice !== undefined;
                    const hasMinPrice = firstSKU.minUnitPrice !== null && firstSKU.minUnitPrice !== undefined;

                    if (hasAvgPrice && hasMinPrice) {
                        console.log('✅ SUCCESS! Both averageUnitPrice and minUnitPrice are present!');
                        console.log('   The Railway backend has the latest code.');
                    } else {
                        console.log('❌ PROBLEM FOUND!');
                        if (!hasAvgPrice) console.log('   - averageUnitPrice is missing');
                        if (!hasMinPrice) console.log('   - minUnitPrice is missing');
                        console.log('');
                        console.log('🔧 Solution: Railway needs to redeploy with the latest code.');
                    }

                    // Test a SKU with purchase history
                    console.log('\n=== Checking All SKUs ===');
                    let skusWithPrices = 0;
                    let skusWithLastPP = 0;

                    response.data.forEach(sku => {
                        if (sku.lastPurchasePrice) skusWithLastPP++;
                        if (sku.averageUnitPrice && sku.minUnitPrice) skusWithPrices++;
                    });

                    console.log(`SKUs with Last PP: ${skusWithLastPP}/${response.data.length}`);
                    console.log(`SKUs with Avg/Min Price: ${skusWithPrices}/${response.data.length}`);

                } else {
                    console.log('⚠️  No SKUs found in response');
                }

            } catch (error) {
                console.error('❌ Error parsing response:', error.message);
                console.log('Raw response:', data.substring(0, 500));
            }
        } else if (res.statusCode === 401) {
            console.log('❌ Authentication failed. Token may be invalid or expired.');
            console.log('Please get a fresh token from browser DevTools.');
        } else {
            console.log('❌ API Error');
            console.log('Response:', data.substring(0, 500));
        }
    });
}).on('error', (error) => {
    console.error('❌ Request failed:', error.message);
});
