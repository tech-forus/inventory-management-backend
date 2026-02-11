const https = require('https');

console.log('🚀 Monitoring Railway deployment...\n');
console.log('Checking if Railway API includes price fields...\n');

let attempts = 0;
const maxAttempts = 30; // 30 attempts * 10 seconds = 5 minutes max

function checkAPI() {
    attempts++;
    console.log(`Attempt ${attempts}/${maxAttempts}...`);

    const url = 'https://inventory-management-backend-production-5631.up.railway.app/api/skus?page=1&limit=1';

    https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            if (res.statusCode === 401 || res.statusCode === 200) {
                try {
                    const response = JSON.parse(data);

                    if (response.data && response.data.length > 0) {
                        const sku = response.data[0];

                        const hasAvgPrice = sku.hasOwnProperty('averageUnitPrice');
                        const hasMinPrice = sku.hasOwnProperty('minUnitPrice');

                        if (hasAvgPrice && hasMinPrice) {
                            console.log('\n✅ SUCCESS! Railway has deployed the latest code!');
                            console.log('');
                            console.log('SKU ID:', sku.skuId);
                            console.log('Last Purchase Price:', sku.lastPurchasePrice);
                            console.log('Average Unit Price:', sku.averageUnitPrice);
                            console.log('Min Unit Price:', sku.minUnitPrice);
                            console.log('');
                            console.log('🎉 The Purchase Page should now display all three price columns!');
                            console.log('   Please refresh your browser to see the changes.');
                            process.exit(0);
                        } else {
                            console.log('  ⏳ Still deploying (old code detected)');

                            if (attempts < maxAttempts) {
                                console.log('     Checking again in 10 seconds...\n');
                                setTimeout(checkAPI, 10000);
                            } else {
                                console.log('\n⚠️  Max attempts reached. Deployment might be taking longer than expected.');
                                console.log('   Check Railway dashboard for deployment status.');
                                process.exit(1);
                            }
                        }
                    } else {
                        console.log('  ⏳ No data in response');
                        if (attempts < maxAttempts) {
                            setTimeout(checkAPI, 10000);
                        }
                    }
                } catch (e) {
                    console.log('  ⚠️  Error parsing response:', e.message);
                    if (attempts < maxAttempts) {
                        setTimeout(checkAPI, 10000);
                    }
                }
            } else {
                console.log('  ⏳ API returned status:', res.statusCode);
                if (attempts < maxAttempts) {
                    setTimeout(checkAPI, 10000);
                }
            }
        });
    }).on('error', (error) => {
        console.log('  ❌ Request failed:', error.message);
        if (attempts < maxAttempts) {
            setTimeout(checkAPI, 10000);
        }
    });
}

// Start checking
checkAPI();

console.log('💡 Tip: You can also check deployment status at:');
console.log('   https://railway.app/dashboard\n');
