import React, { useState, useEffect } from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Save, 
  X,
  Lock
} from 'lucide-react';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  companyName: string;
  timeZone: string;
  emailAlerts: boolean;
  pushNotifications: boolean;
  role: string;
  location: string;
}

const ProfilePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Get user from localStorage
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    companyName: '',
    timeZone: 'GMT+5:30',
    emailAlerts: true,
    pushNotifications: false,
    role: '',
    location: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = () => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userData) {
      try {
        const userObj = JSON.parse(userData);
        setUser(userObj);
        
        // Split fullName into firstName and lastName if needed
        let firstName = userObj.firstName || userObj.first_name || '';
        let lastName = userObj.lastName || userObj.last_name || '';
        
        // If fullName exists but firstName/lastName don't, split it
        if ((!firstName && !lastName) && userObj.fullName) {
          const nameParts = userObj.fullName.trim().split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }
        
        // Build full address from components if needed
        let fullAddress = userObj.address || '';
        if (!fullAddress && (userObj.city || userObj.state || userObj.pin)) {
          const addressParts = [
            userObj.address || '',
            userObj.city || '',
            userObj.state || '',
            userObj.pin || ''
          ].filter(part => part.trim()).join(', ');
          fullAddress = addressParts;
        }
        // If still no address, try to get from registration fields
        if (!fullAddress) {
          fullAddress = userObj.address || userObj.city || userObj.state || '';
        }
        
        // Populate profile data from user object - fetch all details from registration
        setProfileData({
          firstName: firstName,
          lastName: lastName,
          email: userObj.email || '',
          phone: userObj.phone || userObj.phoneNumber || userObj.adminPhone || '',
          address: fullAddress,
          companyName: userObj.companyName || userObj.company_name || '',
          timeZone: userObj.timeZone || userObj.time_zone || 'GMT+5:30',
          emailAlerts: userObj.emailAlerts !== undefined ? userObj.emailAlerts : true,
          pushNotifications: userObj.pushNotifications !== undefined ? userObj.pushNotifications : false,
          role: userObj.role || userObj.role_name || '',
          location: userObj.location || userObj.city || userObj.state || '',
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string | boolean) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Update user in localStorage
      const updatedUser = {
        ...user,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone,
        address: profileData.address,
        companyName: profileData.companyName,
        timeZone: profileData.timeZone,
        emailAlerts: profileData.emailAlerts,
        pushNotifications: profileData.pushNotifications,
        location: profileData.location,
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      if (sessionStorage.getItem('user')) {
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      setUser(updatedUser);
      setHasChanges(false);
      
      // TODO: Call API to update profile
      // await userService.updateProfile(profileData);
      
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    loadUserData();
    setHasChanges(false);
  };

  return (
    <div className="p-8 space-y-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Profile</h1>
          <p className="text-lg text-slate-500 font-medium">Manage your personal information and account settings.</p>
        </div>
      </div>

        {/* Profile Header Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-lg overflow-hidden">
          {/* Profile Info */}
          <div className="px-8 py-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold text-black mb-2">
                  {profileData.firstName} {profileData.lastName}
                </h2>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  disabled={!hasChanges || loading}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <X className="w-5 h-5 inline mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - General Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">General Information</h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={profileData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={profileData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Zone
                </label>
                <select
                  value={profileData.timeZone}
                  onChange={(e) => handleInputChange('timeZone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="GMT+5:30">GMT+5:30 (IST - Indian Standard Time)</option>
                  <option value="GMT+0:00">GMT+0:00 (GMT - Greenwich Mean Time)</option>
                  <option value="GMT-5:00">GMT-5:00 (EST - Eastern Standard Time)</option>
                  <option value="GMT-6:00">GMT-6:00 (CST - Central Standard Time)</option>
                  <option value="GMT-7:00">GMT-7:00 (MST - Mountain Standard Time)</option>
                  <option value="GMT-8:00">GMT-8:00 (PST - Pacific Standard Time)</option>
                  <option value="GMT+1:00">GMT+1:00 (CET - Central European Time)</option>
                  <option value="GMT+2:00">GMT+2:00 (EET - Eastern European Time)</option>
                  <option value="GMT+3:00">GMT+3:00 (MSK - Moscow Standard Time)</option>
                  <option value="GMT+8:00">GMT+8:00 (CST - China Standard Time)</option>
                  <option value="GMT+9:00">GMT+9:00 (JST - Japan Standard Time)</option>
                  <option value="GMT+10:00">GMT+10:00 (AEST - Australian Eastern Standard Time)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Column - Notifications & Security */}
          <div className="space-y-6">
            {/* Notifications Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Notifications</h3>
            </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Email Alerts</p>
                    <p className="text-sm text-gray-500">Receive daily stock reports</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileData.emailAlerts}
                      onChange={(e) => handleInputChange('emailAlerts', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Push Notifications</p>
                    <p className="text-sm text-gray-500">Real-time alerts on mobile</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileData.pushNotifications}
                      onChange={(e) => handleInputChange('pushNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Security</h3>
            </div>
              
              <button
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <Lock className="w-5 h-5" />
                Change Password
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
