const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImNvbXBhbnlJZCI6IkRFTU8wMSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.test'; // Replace with actual token

async function testVendorSave() {
  console.log('🧪 Testing Vendor Save Functionality\n');

  // Test 1: Create vendor with all fields
  console.log('Test 1: Creating vendor with all fields...');
  try {
    const vendorData = {
      name: 'Test Vendor ' + Date.now(),
      contactPerson: 'John Doe',
      designation: 'Manager',
      phone: '1234567890',
      email: 'test@vendor.com',
      gstNumber: '27AAAAA0000A1Z5',
      address: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin: '400001',
      isActive: true,
      productCategoryIds: [1], // Assuming product category ID 1 exists
      itemCategoryIds: [1, 2], // Assuming item category IDs exist
      subCategoryIds: [1], // Assuming sub category ID exists
      brandIds: [1] // Assuming brand ID 1 exists
    };

    const response = await fetch(`${BASE_URL}/yourvendors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify(vendorData)
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Vendor created successfully!');
      console.log('   Vendor ID:', result.data.id);
      console.log('   Product Categories:', result.data.productCategoryIds);
      console.log('   Item Categories:', result.data.itemCategoryIds);
      console.log('   Sub Categories:', result.data.subCategoryIds);
      console.log('   Brands:', result.data.brandIds);
      
      const vendorId = result.data.id;

      // Test 2: Get vendor and verify relationships
      console.log('\nTest 2: Fetching vendor to verify relationships...');
      const getResponse = await fetch(`${BASE_URL}/yourvendors`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });
      
      const getResult = await getResponse.json();
      if (getResponse.ok && getResult.success) {
        const savedVendor = getResult.data.find(v => v.id === vendorId);
        if (savedVendor) {
          console.log('✅ Vendor fetched successfully!');
          console.log('   Product Categories:', savedVendor.productCategoryIds);
          console.log('   Item Categories:', savedVendor.itemCategoryIds);
          console.log('   Sub Categories:', savedVendor.subCategoryIds);
          console.log('   Brands:', savedVendor.brandIds);
          
          // Verify relationships
          if (savedVendor.productCategoryIds && savedVendor.productCategoryIds.length > 0) {
            console.log('✅ Product categories saved correctly');
          } else {
            console.log('❌ Product categories NOT saved');
          }
          
          if (savedVendor.itemCategoryIds && savedVendor.itemCategoryIds.length > 0) {
            console.log('✅ Item categories saved correctly');
          } else {
            console.log('❌ Item categories NOT saved');
          }
          
          if (savedVendor.subCategoryIds && savedVendor.subCategoryIds.length > 0) {
            console.log('✅ Sub categories saved correctly');
          } else {
            console.log('❌ Sub categories NOT saved');
          }
          
          if (savedVendor.brandIds && savedVendor.brandIds.length > 0) {
            console.log('✅ Brands saved correctly');
          } else {
            console.log('❌ Brands NOT saved');
          }
        } else {
          console.log('❌ Vendor not found in list');
        }
      } else {
        console.log('❌ Failed to fetch vendors:', getResult.error);
      }

      // Test 3: Update vendor
      console.log('\nTest 3: Updating vendor...');
      const updateData = {
        ...vendorData,
        name: vendorData.name + ' Updated',
        productCategoryIds: [1, 2], // Update to multiple
        itemCategoryIds: [1],
        subCategoryIds: [1, 2],
        brandIds: [1, 2]
      };

      const updateResponse = await fetch(`${BASE_URL}/yourvendors/${vendorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        body: JSON.stringify(updateData)
      });

      const updateResult = await updateResponse.json();
      if (updateResponse.ok && updateResult.success) {
        console.log('✅ Vendor updated successfully!');
        console.log('   Updated Product Categories:', updateResult.data.productCategoryIds);
        console.log('   Updated Item Categories:', updateResult.data.itemCategoryIds);
        console.log('   Updated Sub Categories:', updateResult.data.subCategoryIds);
        console.log('   Updated Brands:', updateResult.data.brandIds);
      } else {
        console.log('❌ Failed to update vendor:', updateResult.error);
      }

    } else {
      console.log('❌ Failed to create vendor:', result.error || result.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n✅ Test completed!');
}

// Run test
testVendorSave().catch(console.error);

