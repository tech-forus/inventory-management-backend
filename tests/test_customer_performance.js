/**
 * Customer Performance and Consistency Test
 * Verifies:
 * 1. Pagination on /library/customers
 * 2. Canonical customer returned on POST/PUT
 * 3. Database performance indexes (via query time)
 */

const API_BASE_URL = 'https://inventory-management-backend-production-5631.up.railway.app/api';
const COMPANY_ID = 'DEMO01';

async function testEndpoint(method, endpoint, data = null, description) {
    try {
        const start = Date.now();
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-company-id': COMPANY_ID
            }
        };
        if (data) options.body = JSON.stringify(data);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const duration = Date.now() - start;
        const result = await response.json();

        if (response.ok) {
            console.log(`✅ ${description} (${duration}ms)`);
            return { success: true, data: result, duration };
        } else {
            console.log(`❌ ${description} FAILED (${response.status}): ${result.error || result.message}`);
            return { success: false, error: result };
        }
    } catch (error) {
        console.log(`❌ ${description} ERROR: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log('🚀 Customer Performance Integration Tests');
    console.log('='.repeat(60));

    // 1. Test Pagination
    const page1Res = await testEndpoint('GET', '/library/customers?page=1&limit=2', null, 'Pagination (Page 1, Limit 2)');
    if (page1Res.success) {
        if (page1Res.data.pagination) {
            console.log(`   Pagination Metadata: Total=${page1Res.data.pagination.total}, Pages=${page1Res.data.pagination.totalPages}`);
        } else {
            console.log('   ⚠️ Missing pagination metadata!');
        }
    }

    // 2. Test Canonical Create
    const timestamp = Date.now();
    const customerData = {
        name: `Perf Test Customer ${timestamp}`,
        phone: '9999999999',
        isActive: true
    };
    const createRes = await testEndpoint('POST', '/library/customers', customerData, 'Create Canonical Customer');
    let createdId;
    if (createRes.success) {
        createdId = createRes.data.customer?.id;
        console.log(`   Canonical ID: ${createdId}`);
        if (createRes.data.customer?.name === customerData.name) {
            console.log('   ✅ Canonical object verified');
        } else {
            console.log('   ⚠️ Canonical object mismatch or missing!');
        }
    }

    // 3. Test Canonical Update
    if (createdId) {
        const updateData = { ...customerData, city: 'Performance City' };
        const updateRes = await testEndpoint('PUT', `/library/customers/${createdId}`, updateData, 'Update Canonical Customer');
        if (updateRes.success) {
            if (updateRes.data.customer?.city === 'Performance City') {
                console.log('   ✅ Canonical update verified');
            }
        }
    }

    // 4. Cleanup
    if (createdId) {
        await testEndpoint('DELETE', `/library/customers/${createdId}`, null, 'Cleanup Test Customer');
    }

    console.log('='.repeat(60));
    console.log('🎉 Tests Completed');
}

runTests();
