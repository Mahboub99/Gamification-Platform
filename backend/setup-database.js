const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Database for Gamification Platform...\n');

try {
  // Check if we're in the backend directory
  if (!fs.existsSync('package.json')) {
    console.error('❌ package.json not found. Please run this script from the backend directory.');
    process.exit(1);
  }

  // Check if .env file exists
  if (!fs.existsSync('.env')) {
    console.error('❌ .env file not found. Please create a .env file with your database configuration.');
    console.log('💡 Copy env.example to .env and update the database URL');
    process.exit(1);
  }

  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  console.log('\n🔧 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('\n📊 Pushing database schema...');
  execSync('npx prisma db push', { stdio: 'inherit' });

  console.log('\n🌱 Seeding database with initial data...');
  execSync('node -e "require(\'./src/config/database.js\').seedDatabase()"', { stdio: 'inherit' });

  console.log('\n✅ Database setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Run "npm run dev" to start the development server');
  console.log('2. Visit http://localhost:8000/api-docs for API documentation');
  console.log('3. Use Prisma Studio to view your database: npx prisma studio');

} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  console.log('\n💡 Make sure you have:');
  console.log('- Node.js installed');
  console.log('- PostgreSQL running');
  console.log('- Database credentials configured in .env file');
  console.log('- Database exists and is accessible');
  process.exit(1);
} 