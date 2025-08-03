const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Gamification Platform Backend...\n');

async function startApplication() {
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

    console.log('\n📊 Setting up database...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });

    console.log('\n🌱 Seeding database with initial data...');
    execSync('node -e "require(\'./src/config/database.js\').seedDatabase()"', { stdio: 'inherit' });

    console.log('\n🚀 Starting server...');
    execSync('node src/server.js', { stdio: 'inherit' });

  } catch (error) {
    console.error('\n❌ Startup failed:', error.message);
    console.log('\n💡 Make sure you have:');
    console.log('- Node.js installed');
    console.log('- PostgreSQL running');
    console.log('- Database credentials configured in .env file');
    console.log('- Database exists and is accessible');
    process.exit(1);
  }
}

startApplication(); 