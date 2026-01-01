const BASE_URL = 'http://localhost:5000/api/onboarding';
const COMPANY_ID = 'TEST01';

async function fetchAPI(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

async function testOnboarding() {
  console.log('🧪 Starting Onboarding API Tests...\n');

  try {
    // Test 1: Check onboarding status
    console.log('Test 1: Check onboarding status');
    const statusResponse = await fetchAPI(`${BASE_URL}/status/${COMPANY_ID}`);
    console.log('✅ Status:', statusResponse);
    console.log('');

    // Test 2: Create product categories
    console.log('Test 2: Create product categories');
    const productCategories = [
      { name: 'Finished Goods', description: 'Completed products' },
      { name: 'Raw Materials', description: 'Raw materials for production' },
      { name: 'Work in Progress', description: 'Items in production' },
      { name: 'Components', description: 'Component parts' }
    ];
    const productCatResponse = await fetchAPI(`${BASE_URL}/product-categories`, {
      method: 'POST',
      body: JSON.stringify({
        companyId: COMPANY_ID,
        categories: productCategories
      })
    });
    console.log('✅ Product Categories Created:', productCatResponse.data.length);
    const firstProductCatId = productCatResponse.data[0].id;
    console.log('');

    // Test 3: Get product categories
    console.log('Test 3: Get product categories');
    const getProductCats = await fetchAPI(`${BASE_URL}/product-categories/${COMPANY_ID}`);
    console.log('✅ Retrieved Categories:', getProductCats.data.length);
    console.log('');

    // Test 4: Create item categories
    console.log('Test 4: Create item categories');
    const itemCategories = [
      { name: 'LED Drivers', description: 'LED driver components' },
      { name: 'LED Lights', description: 'LED lighting products' },
      { name: 'LED Panels', description: 'LED panel products' },
      { name: 'Switches', description: 'Electrical switches' }
    ];
    const itemCatResponse = await fetchAPI(`${BASE_URL}/item-categories`, {
      method: 'POST',
      body: JSON.stringify({
        companyId: COMPANY_ID,
        productCategoryId: firstProductCatId,
        categories: itemCategories
      })
    });
    console.log('✅ Item Categories Created:', itemCatResponse.data.length);
    const firstItemCatId = itemCatResponse.data[0].id;
    console.log('');

    // Test 5: Get item categories
    console.log('Test 5: Get item categories');
    const getItemCats = await fetchAPI(`${BASE_URL}/item-categories/${COMPANY_ID}/${firstProductCatId}`);
    console.log('✅ Retrieved Item Categories:', getItemCats.data.length);
    console.log('');

    // Test 6: Create sub categories
    console.log('Test 6: Create sub categories');
    const subCategories = [
      { name: 'Indoor LED', description: 'Indoor LED lights' },
      { name: 'Outdoor LED', description: 'Outdoor LED lights' },
      { name: 'Street Lights', description: 'Street lighting' },
      { name: 'Panel Lights', description: 'Panel lighting' }
    ];
    const subCatResponse = await fetchAPI(`${BASE_URL}/sub-categories`, {
      method: 'POST',
      body: JSON.stringify({
        companyId: COMPANY_ID,
        itemCategoryId: firstItemCatId,
        categories: subCategories
      })
    });
    console.log('✅ Sub Categories Created:', subCatResponse.data.length);
    console.log('');

    // Test 7: Create vendors
    console.log('Test 7: Create vendors');
    const vendors = [
      {
        name: 'ABC Electronics',
        contactPerson: 'John Smith',
        email: 'contact@abcelectronics.com',
        phone: '9876543210',
        gstNumber: '27AABCU9603R1ZX'
      },
      {
        name: 'XYZ Suppliers',
        contactPerson: 'Jane Doe',
        email: 'info@xyzsuppliers.com',
        phone: '9876543211',
        gstNumber: '29AABCS1234D1Z5'
      }
    ];
    const vendorsResponse = await fetchAPI(`${BASE_URL}/vendors`, {
      method: 'POST',
      body: JSON.stringify({
        companyId: COMPANY_ID,
        vendors: vendors
      })
    });
    console.log('✅ Vendors Created:', vendorsResponse.data.length);
    console.log('');

    // Test 8: Create brands
    console.log('Test 8: Create brands');
    const brands = [
      { name: 'Philips', description: 'Philips brand products' },
      { name: 'Osram', description: 'Osram brand products' },
      { name: 'Cree', description: 'Cree brand products' }
    ];
    const brandsResponse = await fetchAPI(`${BASE_URL}/brands`, {
      method: 'POST',
      body: JSON.stringify({
        companyId: COMPANY_ID,
        brands: brands
      })
    });
    console.log('✅ Brands Created:', brandsResponse.data.length);
    console.log('');

    // Test 9: Delete a product category
    console.log('Test 9: Delete a product category');
    if (productCatResponse.data.length > 1) {
      const deleteResponse = await fetchAPI(`${BASE_URL}/product-categories/${productCatResponse.data[1].id}`, {
        method: 'DELETE'
      });
      console.log('✅ Product Category Deleted:', deleteResponse.message);
    }
    console.log('');

    // Test 10: Complete onboarding
    console.log('Test 10: Complete onboarding');
    const completeResponse = await fetchAPI(`${BASE_URL}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        companyId: COMPANY_ID
      })
    });
    console.log('✅ Onboarding Completed:', completeResponse.data.onboarding_completed);
    console.log('');

    console.log('✅ All tests passed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
testOnboarding();

