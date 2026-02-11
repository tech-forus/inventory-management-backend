/**
 * Test what code is actually running on Railway
 * by checking the actual API response structure
 */

const https = require('https');

console.log('🔍 Testing Railway Deployment Code Version\n');

// Test with a query that should return SKUs
const url = 'https://inventory-management-backend-production-5631.up.railway.app/api/skus?page=1&limit=3';

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}\n`);

        if (res.statusCode === 401) {
            console.log('❌ Got 401 - Need authentication');
            console.log('   Cannot test without auth token');
            console.log('\n🔧 Alternative: Check Railway Dashboard');
            console.log('   1. Go to Railway → Deployments');
            console.log('   2. Check "Source" shows commit 098088f');
            console.log('   3. If not, clear build cache and redeploy\n');
            return;
        }

        try {
            const response = JSON.parse(data);

            if (response.data && response.data.length > 0) {
                const firstSKU = response.data[0];

                console.log('📦 First SKU in response:');
                console.log(`   SKU ID: ${firstSKU.skuId || 'N/A'}`);
                console.log(`   Last Purchase Price: ${firstSKU.lastPurchasePrice !== undefined ? firstSKU.lastPurchasePrice : 'MISSING'}`);
                console.log(`   Average Unit Price: ${firstSKU.averageUnitPrice !== undefined ? firstSKU.averageUnitPrice : '❌ MISSING'}`);
                console.log(`   Min Unit Price: ${firstSKU.minUnitPrice !== undefined ? firstSKU.minUnitPrice : '❌ MISSING'}`);

                const hasAvgPrice = firstSKU.hasOwnProperty('averageUnitPrice');
                const hasMinPrice = firstSKU.hasOwnProperty('minUnitPrice');

                console.log('\n📊 Field Presence Check:');
                console.log(`   ✓ lastPurchasePrice: ${firstSKU.hasOwnProperty('lastPurchasePrice') ? '✅ Present' : '❌ Missing'}`);
                console.log(`   ✓ averageUnitPrice: ${hasAvgPrice ? '✅ Present' : '❌ Missing'}`);
                console.log(`   ✓ minUnitPrice: ${hasMinPrice ? '✅ Present' : '❌ Missing'}`);

                if (hasAvgPrice && hasMinPrice) {
                    console.log('\n🎉 SUCCESS! Railway has deployed the latest code with price fixes!');
                } else {
                    console.log('\n❌ FAILURE! Railway is still running OLD code');
                    console.log('\n🔧 Solution:');
                    console.log('   1. Railway Dashboard → Your Service → Settings');
                    console.log('   2. Enable "Clear build cache on next deploy"');
                    console.log('   3. Go to Deployments → Click "Redeploy"');
                    console.log('   4. Wait 2-3 minutes for deployment to complete');
                    console.log('   5. Run this script again to verify\n');
                }
            } else {
                console.log('⚠️  No SKU data in response');
                console.log(JSON.stringify(response, null, 2));
            }
        } catch (e) {
            console.log('❌ Error parsing response:', e.message);
            console.log('Raw response:', data.substring(0, 500));
        }
    });
}).on('error', (error) => {
    console.log('❌ Request error:', error.message);
});
