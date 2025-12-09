/**
 * Test vendor fields: Contact Person, GST Number, and Status
 */

const API_BASE_URL = 'http://localhost:5000/api';

async function testVendorFields() {
  try {
    console.log('🧪 Testing Vendor Fields (Contact Person, GST Number, Status)\n');

    // Create a vendor with all fields
    const vendorData = {
      name: 'Complete Vendor Test ' + Date.now(),
      contactPerson: 'John Doe',
      email: 'john@vendor.com',
      phone: '9876543210',
      gstNumber: '29ABCDE1234F1Z5',
      address: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      pin: '123456',
      isActive: true
    };

    console.log('1. Creating vendor with all fields...');
    const createRes = await fetch(`${API_BASE_URL}/yourvendors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': 'DEMO01'
      },
      body: JSON.stringify(vendorData)
    });

    const createData = await createRes.json();
    console.log(`   Status: ${createRes.status}`);
    
    if (createRes.ok) {
      const vendor = createData.data;
      console.log('   ✅ Vendor created successfully');
      console.log(`   📝 ID: ${vendor.id}`);
      console.log(`   📝 Name: ${vendor.name}`);
      console.log(`   📝 Contact Person: ${vendor.contactPerson || '❌ MISSING'}`);
      console.log(`   📝 GST Number: ${vendor.gstNumber || '❌ MISSING'}`);
      console.log(`   📝 Status (isActive): ${vendor.isActive !== undefined ? vendor.isActive : '❌ MISSING'}`);
      console.log(`   📝 Status Display: ${vendor.isActive ? 'Active' : 'Inactive'}`);

      // Test GET to verify data is returned correctly
      console.log('\n2. Fetching vendor to verify fields...');
      const getRes = await fetch(`${API_BASE_URL}/yourvendors`, {
        headers: { 'x-company-id': 'DEMO01' }
      });
      const getData = await getRes.json();
      
      if (getRes.ok && getData.data) {
        const foundVendor = getData.data.find(v => v.id === vendor.id);
        if (foundVendor) {
          console.log('   ✅ Vendor found in list');
          console.log(`   📝 Contact Person: ${foundVendor.contactPerson || '❌ MISSING'}`);
          console.log(`   📝 GST Number: ${foundVendor.gstNumber || '❌ MISSING'}`);
          console.log(`   📝 Status: ${foundVendor.isActive !== undefined ? (foundVendor.isActive ? 'Active' : 'Inactive') : '❌ MISSING'}`);
          
          // Verify all fields
          const allFieldsPresent = 
            foundVendor.contactPerson !== undefined &&
            foundVendor.gstNumber !== undefined &&
            foundVendor.isActive !== undefined;
          
          if (allFieldsPresent) {
            console.log('\n✅ All fields are being saved and returned correctly!');
          } else {
            console.log('\n❌ Some fields are missing in the response');
          }
        } else {
          console.log('   ❌ Vendor not found in list');
        }
      }

      // Test update with status change
      console.log('\n3. Testing status update...');
      const updateData = {
        ...vendorData,
        isActive: false
      };
      const updateRes = await fetch(`${API_BASE_URL}/yourvendors/${vendor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': 'DEMO01'
        },
        body: JSON.stringify(updateData)
      });
      const updateResult = await updateRes.json();
      
      if (updateRes.ok) {
        console.log('   ✅ Status updated successfully');
        console.log(`   📝 New Status: ${updateResult.data.isActive ? 'Active' : 'Inactive'}`);
      } else {
        console.log(`   ❌ Update failed: ${updateResult.error}`);
      }
    } else {
      console.log(`   ❌ Failed: ${createData.error || createData.message}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testVendorFields();

