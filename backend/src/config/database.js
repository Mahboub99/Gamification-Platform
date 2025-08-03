const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Create a single instance of PrismaClient
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Test the connection
const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected successfully via Prisma');
    
    // Initialize database with seed data if needed
    await initializeDatabase();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Initialize database with default data
const initializeDatabase = async () => {
  try {
    // Check if tables exist
    try {
      await prisma.user.count();
    } catch (error) {
      // If tables don't exist, create the schema first
      console.log('📊 Database schema not found, creating tables...');
      await createDatabaseSchema();
    }
    
    // Always run seeding to ensure default data exists
    console.log('📦 Ensuring default data exists...');
    await seedDatabase();
    
    console.log('✅ Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
};

// Create database schema if it doesn't exist
const createDatabaseSchema = async () => {
  try {
    console.log('🔧 Creating database schema...');
    
    // Use Prisma's db push to create the schema
    const { execSync } = require('child_process');
    execSync('npx prisma db push --accept-data-loss', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('✅ Database schema created successfully');
  } catch (error) {
    console.error('❌ Failed to create database schema:', error.message);
    throw error;
  }
};

// Seed database with initial data
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Wait a moment for schema to be fully created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create default levels
    const levels = [
      { levelNumber: 1, name: 'Beginner', description: 'Starting your journey', experienceRequired: 0 },
      { levelNumber: 2, name: 'Novice', description: 'Getting the hang of it', experienceRequired: 100 },
      { levelNumber: 3, name: 'Apprentice', description: 'Learning and growing', experienceRequired: 250 },
      { levelNumber: 4, name: 'Journeyman', description: 'Building skills', experienceRequired: 500 },
      { levelNumber: 5, name: 'Expert', description: 'Mastering the craft', experienceRequired: 1000 },
      { levelNumber: 6, name: 'Master', description: 'Exceptional skills', experienceRequired: 2000 },
      { levelNumber: 7, name: 'Grandmaster', description: 'Legendary status', experienceRequired: 5000 },
    ];

    console.log('📊 Creating default levels...');
    for (const level of levels) {
      try {
        // Check if level already exists
        const existingLevel = await prisma.level.findFirst({
          where: { levelNumber: level.levelNumber }
        });
        
        if (!existingLevel) {
          await prisma.level.create({
            data: level,
          });
        } else {
          console.log(`⚠️  Level ${level.name} already exists`);
        }
      } catch (error) {
        console.log(`⚠️  Level ${level.name} creation failed: ${error.message}`);
      }
    }

    // Create default badges
    const badges = [
      {
        name: 'First Steps',
        description: 'Complete your first activity',
        criteriaType: 'activity_completion',
        criteriaValue: 1,
        experienceReward: 10,
        rarity: 'common',
      },
      {
        name: 'Dedicated Learner',
        description: 'Complete 10 activities',
        criteriaType: 'activity_completion',
        criteriaValue: 10,
        experienceReward: 50,
        rarity: 'uncommon',
      },
      {
        name: 'Achievement Hunter',
        description: 'Unlock 5 achievements',
        criteriaType: 'achievement_count',
        criteriaValue: 5,
        experienceReward: 100,
        rarity: 'rare',
      },
      {
        name: 'Level Up',
        description: 'Reach level 5',
        criteriaType: 'level_reached',
        criteriaValue: 5,
        experienceReward: 200,
        rarity: 'epic',
      },
      {
        name: 'Legend',
        description: 'Reach level 10',
        criteriaType: 'level_reached',
        criteriaValue: 10,
        experienceReward: 500,
        rarity: 'legendary',
      },
    ];

    console.log('🏆 Creating default badges...');
    for (const badge of badges) {
      try {
        // Check if badge already exists
        const existingBadge = await prisma.badge.findFirst({
          where: { name: badge.name }
        });
        
        if (!existingBadge) {
          await prisma.badge.create({
            data: badge,
          });
        } else {
          console.log(`⚠️  Badge ${badge.name} already exists`);
        }
      } catch (error) {
        console.log(`⚠️  Badge ${badge.name} creation failed: ${error.message}`);
      }
    }

    // Create default activities
    const activities = [
      {
        name: 'Complete Profile',
        description: 'Fill out your user profile completely',
        category: 'profile',
        experienceReward: 25,
        isRepeatable: false,
      },
      {
        name: 'Daily Login',
        description: 'Log in to the platform',
        category: 'engagement',
        experienceReward: 5,
        isRepeatable: true,
      },
      {
        name: 'First Badge',
        description: 'Earn your first badge',
        category: 'achievement',
        experienceReward: 50,
        isRepeatable: false,
      },
      {
        name: 'Social Butterfly',
        description: 'Connect with other users',
        category: 'social',
        experienceReward: 30,
        isRepeatable: true,
      },
      {
        name: 'Content Creator',
        description: 'Create your first post or content',
        category: 'creation',
        experienceReward: 75,
        isRepeatable: true,
      },
    ];

    console.log('🎯 Creating default activities...');
    for (const activity of activities) {
      try {
        // Check if activity already exists
        const existingActivity = await prisma.activity.findFirst({
          where: { name: activity.name }
        });
        
        if (!existingActivity) {
          await prisma.activity.create({
            data: activity,
          });
        } else {
          console.log(`⚠️  Activity ${activity.name} already exists`);
        }
      } catch (error) {
        console.log(`⚠️  Activity ${activity.name} creation failed: ${error.message}`);
      }
    }

    // Create default achievements
    const achievements = [
      {
        name: 'Welcome Aboard',
        description: 'Join the gamification platform',
        category: 'onboarding',
        criteriaType: 'registration',
        criteriaValue: 1,
        experienceReward: 100,
      },
      {
        name: 'Badge Collector',
        description: 'Collect 10 different badges',
        category: 'collection',
        criteriaType: 'badge_count',
        criteriaValue: 10,
        experienceReward: 250,
      },
      {
        name: 'Activity Master',
        description: 'Complete 50 activities',
        category: 'engagement',
        criteriaType: 'activity_completion',
        criteriaValue: 50,
        experienceReward: 500,
      },
      {
        name: 'Level Champion',
        description: 'Reach the maximum level',
        category: 'progression',
        criteriaType: 'level_reached',
        criteriaValue: 7,
        experienceReward: 1000,
      },
    ];

    console.log('🏅 Creating default achievements...');
    for (const achievement of achievements) {
      try {
        // Check if achievement already exists
        const existingAchievement = await prisma.achievement.findFirst({
          where: { name: achievement.name }
        });
        
        if (!existingAchievement) {
          await prisma.achievement.create({
            data: achievement,
          });
        } else {
          console.log(`⚠️  Achievement ${achievement.name} already exists`);
        }
      } catch (error) {
        console.log(`⚠️  Achievement ${achievement.name} creation failed: ${error.message}`);
      }
    }

    // Create default users
    const users = [
      {
        username: 'admin',
        email: 'user.admin@ejada.com',
        password: 'root123',
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true,
        isActive: true,
      },
      {
        username: 'user1',
        email: 'user1@ejada.com',
        password: 'root123',
        firstName: 'User',
        lastName: 'One',
        isAdmin: false,
        isActive: true,
      },
      {
        username: 'user2',
        email: 'user2@ejada.com',
        password: 'root123',
        firstName: 'User',
        lastName: 'Two',
        isAdmin: false,
        isActive: true,
      },
      {
        username: 'user3',
        email: 'user3@ejada.com',
        password: 'root123',
        firstName: 'User',
        lastName: 'Three',
        isAdmin: false,
        isActive: true,
      },
    ];

    console.log('👥 Creating default users...');
    for (const user of users) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: { email: user.email }
        });
        
        if (!existingUser) {
          // Hash the password
          const hashedPassword = await bcrypt.hash(user.password, 12);
          
          await prisma.user.create({
            data: {
              username: user.username,
              email: user.email,
              passwordHash: hashedPassword,
              firstName: user.firstName,
              lastName: user.lastName,
              isAdmin: user.isAdmin,
              isActive: user.isActive,
              experiencePoints: 0,
              currentLevel: 1,
              totalBadges: 0,
              totalAchievements: 0,
            },
          });
          console.log(`✅ Created user: ${user.email}`);
        } else {
          console.log(`⚠️  User ${user.email} already exists`);
        }
      } catch (error) {
        console.log(`⚠️  User ${user.email} creation failed: ${error.message}`);
      }
    }

    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    throw error;
  }
};

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = {
  prisma,
  connectDB,
  seedDatabase,
  createDatabaseSchema,
}; 