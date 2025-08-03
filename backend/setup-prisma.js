const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Prisma for Gamification Platform...\n');

try {
  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    console.error('❌ package.json not found. Please run this script from the backend directory.');
    process.exit(1);
  }

  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  console.log('\n🔧 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('\n📊 Pushing database schema...');
  execSync('npx prisma db push', { stdio: 'inherit' });

  console.log('\n✅ Prisma setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Create a .env file with your database configuration');
  console.log('2. Run "npm run dev" to start the development server');
  console.log('3. Visit http://localhost:8000/api-docs for API documentation');

} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  console.log('\n💡 Make sure you have:');
  console.log('- Node.js installed');
  console.log('- PostgreSQL running');
  console.log('- Database credentials configured in .env file');
  process.exit(1);
} 