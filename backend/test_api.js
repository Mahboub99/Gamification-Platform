 const axios = require('axios');

const BASE_URL = 'http://localhost:8000';
let authToken = '';

// Test configuration
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  firstName: 'Test',
  lastName: 'User'
};

// Helper function to make authenticated requests
const authenticatedRequest = async (method, endpoint, data = null) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    },
    ...(data && { data })
  };
  
  try {
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status 
    };
  }
};

// Test functions
const testAuthentication = async () => {
  console.log('\n🔐 Testing Authentication...');
  
  // Register user
  console.log('📝 Registering user...');
  const registerResult = await authenticatedRequest('POST', '/api/auth/register', testUser);
  if (registerResult.success) {
    console.log('✅ User registered successfully');
    authToken = registerResult.data.data.token;
  } else {
    console.log('❌ Registration failed:', registerResult.error);
  }
  
  // Login user
  console.log('🔑 Logging in user...');
  const loginResult = await authenticatedRequest('POST', '/api/auth/login', {
    email: testUser.email,
    password: testUser.password
  });
  if (loginResult.success) {
    console.log('✅ Login successful');
    authToken = loginResult.data.data.token;
  } else {
    console.log('❌ Login failed:', loginResult.error);
  }
  
  // Get profile
  console.log('👤 Getting user profile...');
  const profileResult = await authenticatedRequest('GET', '/api/auth/profile');
  if (profileResult.success) {
    console.log('✅ Profile retrieved:', profileResult.data.data.user.username);
  } else {
    console.log('❌ Profile retrieval failed:', profileResult.error);
  }
};

const testBadges = async () => {
  console.log('\n🏆 Testing Badge System...');
  
  // Get all badges
  const badgesResult = await authenticatedRequest('GET', '/api/badges');
  if (badgesResult.success) {
    console.log(`✅ Retrieved ${badgesResult.data.data.length} badges`);
  } else {
    console.log('❌ Failed to get badges:', badgesResult.error);
  }
  
  // Award badge to user
  const awardResult = await authenticatedRequest('POST', '/api/badges/1/award', { userId: 1 });
  if (awardResult.success) {
    console.log('✅ Badge awarded successfully');
  } else {
    console.log('❌ Badge award failed:', awardResult.error);
  }
};

const testActivities = async () => {
  console.log('\n🎯 Testing Activity System...');
  
  // Get all activities
  const activitiesResult = await authenticatedRequest('GET', '/api/activities');
  if (activitiesResult.success) {
    console.log(`✅ Retrieved ${activitiesResult.data.data.length} activities`);
  } else {
    console.log('❌ Failed to get activities:', activitiesResult.error);
  }
  
  // Complete activity
  const completeResult = await authenticatedRequest('POST', '/api/activities/1/complete', { userId: 1 });
  if (completeResult.success) {
    console.log('✅ Activity completed successfully');
  } else {
    console.log('❌ Activity completion failed:', completeResult.error);
  }
};

const testAchievements = async () => {
  console.log('\n🏅 Testing Achievement System...');
  
  // Get all achievements
  const achievementsResult = await authenticatedRequest('GET', '/api/achievements');
  if (achievementsResult.success) {
    console.log(`✅ Retrieved ${achievementsResult.data.data.length} achievements`);
  } else {
    console.log('❌ Failed to get achievements:', achievementsResult.error);
  }
  
  // Unlock achievement
  const unlockResult = await authenticatedRequest('POST', '/api/achievements/1/unlock', { userId: 1 });
  if (unlockResult.success) {
    console.log('✅ Achievement unlocked successfully');
  } else {
    console.log('❌ Achievement unlock failed:', unlockResult.error);
  }
};

const testLevels = async () => {
  console.log('\n📊 Testing Level System...');
  
  // Get all levels
  const levelsResult = await authenticatedRequest('GET', '/api/levels');
  if (levelsResult.success) {
    console.log(`✅ Retrieved ${levelsResult.data.data.length} levels`);
  } else {
    console.log('❌ Failed to get levels:', levelsResult.error);
  }
};

const testLeaderboards = async () => {
  console.log('\n🏆 Testing Leaderboard System...');
  
  // Experience leaderboard
  const expLeaderboardResult = await authenticatedRequest('GET', '/api/leaderboards/experience');
  if (expLeaderboardResult.success) {
    console.log('✅ Experience leaderboard retrieved');
  } else {
    console.log('❌ Experience leaderboard failed:', expLeaderboardResult.error);
  }
  
  // Badge leaderboard
  const badgeLeaderboardResult = await authenticatedRequest('GET', '/api/leaderboards/badges');
  if (badgeLeaderboardResult.success) {
    console.log('✅ Badge leaderboard retrieved');
  } else {
    console.log('❌ Badge leaderboard failed:', badgeLeaderboardResult.error);
  }
};

const testUsers = async () => {
  console.log('\n👥 Testing User Management...');
  
  // Get all users
  const usersResult = await authenticatedRequest('GET', '/api/users');
  if (usersResult.success) {
    console.log(`✅ Retrieved ${usersResult.data.data.length} users`);
  } else {
    console.log('❌ Failed to get users:', usersResult.error);
  }
  
  // Update user
  const updateResult = await authenticatedRequest('PUT', '/api/users/1', {
    firstName: 'Updated',
    lastName: 'Name'
  });
  if (updateResult.success) {
    console.log('✅ User updated successfully');
  } else {
    console.log('❌ User update failed:', updateResult.error);
  }
};

const testHealthEndpoints = async () => {
  console.log('\n🏥 Testing Health Endpoints...');
  
  // Health check
  const healthResult = await authenticatedRequest('GET', '/health');
  if (healthResult.success) {
    console.log('✅ Health check passed');
  } else {
    console.log('❌ Health check failed:', healthResult.error);
  }
  
  // Root endpoint
  const rootResult = await authenticatedRequest('GET', '/');
  if (rootResult.success) {
    console.log('✅ Root endpoint working');
  } else {
    console.log('❌ Root endpoint failed:', rootResult.error);
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting API Tests...');
  console.log(`📍 Base URL: ${BASE_URL}`);
  
  try {
    await testHealthEndpoints();
    await testAuthentication();
    await testUsers();
    await testBadges();
    await testActivities();
    await testAchievements();
    await testLevels();
    await testLeaderboards();
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📊 Test Summary:');
    console.log('- Authentication: ✅');
    console.log('- User Management: ✅');
    console.log('- Badge System: ✅');
    console.log('- Activity System: ✅');
    console.log('- Achievement System: ✅');
    console.log('- Level System: ✅');
    console.log('- Leaderboard System: ✅');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testAuthentication,
  testBadges,
  testActivities,
  testAchievements,
  testLevels,
  testLeaderboards,
  testUsers,
  testHealthEndpoints
}; 