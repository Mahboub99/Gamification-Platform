const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { protect } = require('../middleware/auth');
const { User } = require('../models');
const { prisma } = require('../config/database');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(1).max(50).optional(),
  lastName: Joi.string().min(1).max(50).optional(),
  first_name: Joi.string().min(1).max(50).optional(),
  last_name: Joi.string().min(1).max(50).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).optional(),
  lastName: Joi.string().min(1).max(50).optional(),
  first_name: Joi.string().min(1).max(50).optional(),
  last_name: Joi.string().min(1).max(50).optional(),
  avatarUrl: Joi.string().uri().optional(),
  avatar_url: Joi.string().uri().optional()
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     token:
 *                       type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
// --- Helper: Check and Update Level ---
async function checkAndUpdateLevel(userId, tx = prisma) {
  const user = await tx.user.findUnique({
    where: { id: userId }
  });

  // Calculate new level based on XP
  const newLevel = calculateLevel(user.experiencePoints);
  
  if (newLevel > user.currentLevel) {
    // LEVEL UP DETECTED
    await tx.user.update({
      where: { id: userId },
      data: { currentLevel: newLevel }
    });

    // Check for level-based badges
    const levelBadge = await tx.level.findFirst({
      where: { 
        levelNumber: newLevel,
        badgeRewardId: { not: null }
      },
      include: { badgeReward: true }
    });

    if (levelBadge && levelBadge.badgeReward) {
      const existingBadge = await tx.userBadge.findFirst({
        where: {
          userId: userId,
          badgeId: levelBadge.badgeReward.id
        }
      });

      if (!existingBadge) {
        // Award level badge automatically
        await tx.userBadge.create({
          data: {
            userId: userId,
            badgeId: levelBadge.badgeReward.id,
            awardedBy: null
          }
        });

        // Update user stats
        await tx.user.update({
          where: { id: userId },
          data: {
            totalBadges: { increment: 1 },
            experiencePoints: { increment: levelBadge.badgeReward.experienceReward }
          }
        });

        // Log level badge experience
        if (levelBadge.badgeReward.experienceReward > 0) {
          await tx.experienceLog.create({
            data: {
              userId: userId,
              activityType: 'level_badge_award',
              activityId: levelBadge.badgeReward.id,
              experienceChange: levelBadge.badgeReward.experienceReward
            }
          });
        }
      }
    }

    // Log level-up experience
    const levelUpBonus = calculateLevelUpBonus(newLevel);
    if (levelUpBonus > 0) {
      await tx.experienceLog.create({
        data: {
          userId: userId,
          activityType: 'level_up',
          activityId: newLevel,
          experienceChange: levelUpBonus
        }
      });
    }
  }
}

// --- Helper: Calculate Level ---
function calculateLevel(experiencePoints) {
  if (experiencePoints < 100) return 1;
  if (experiencePoints < 250) return 2;
  if (experiencePoints < 500) return 3;
  if (experiencePoints < 1000) return 4;
  if (experiencePoints < 2000) return 5;
  if (experiencePoints < 3500) return 6;
  if (experiencePoints < 5000) return 7;
  if (experiencePoints < 7000) return 8;
  if (experiencePoints < 10000) return 9;
  if (experiencePoints < 15000) return 10;
  // Continue for more levels as needed
  return Math.floor(experiencePoints / 1000) + 1;
}

// --- Helper: Calculate Level-Up Bonus ---
function calculateLevelUpBonus(level) {
  return level * 10; // 10 XP per level as bonus
}

// --- Helper: Check and Unlock Achievements ---
async function checkAndUnlockAchievements(userId, tx = prisma) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    include: {
      userActivities: { select: { id: true } },
      userBadges: { select: { badgeId: true } },
      userAchievements: { select: { achievementId: true } }
    }
  });
  const achievements = await tx.achievement.findMany({
    where: { isActive: true },
    include: { badgeReward: true }
  });
  for (const achievement of achievements) {
    const hasAchievement = user.userAchievements.some(
      ua => ua.achievementId === achievement.id
    );
    if (!hasAchievement) {
      // Simple example: unlock if user has enough XP
      let isUnlocked = false;
      if (achievement.criteriaType === 'experience') {
        isUnlocked = user.experiencePoints >= achievement.criteriaValue;
      } else if (achievement.criteriaType === 'badges') {
        isUnlocked = user.userBadges.length >= achievement.criteriaValue;
      } else if (achievement.criteriaType === 'activities') {
        isUnlocked = user.userActivities.length >= achievement.criteriaValue;
      }
      if (isUnlocked) {
        await tx.userAchievement.create({
          data: { userId, achievementId: achievement.id }
        });
        await tx.user.update({
          where: { id: userId },
          data: {
            totalAchievements: { increment: 1 },
            experiencePoints: { increment: achievement.experienceReward }
          }
        });
        // Award badge if achievement has one
        if (achievement.badgeReward) {
          const existingBadge = await tx.userBadge.findFirst({
            where: { userId, badgeId: achievement.badgeReward.id }
          });
          if (!existingBadge) {
            await tx.userBadge.create({
              data: { userId, badgeId: achievement.badgeReward.id, awardedBy: null }
            });
            await tx.user.update({
              where: { id: userId },
              data: {
                totalBadges: { increment: 1 },
                experiencePoints: { increment: achievement.badgeReward.experienceReward }
              }
            });
          }
        }
      }
    }
  }
}

// --- Registration Endpoint ---
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { username, email, password, first_name, last_name, firstName, lastName } = value;

    // Check if user already exists
    const existingUserByEmail = await User.findByEmail(email);
    const existingUserByUsername = await User.findByUsername(username);

    if (existingUserByEmail || existingUserByUsername) {
      return res.status(409).json({
        success: false,
        error: 'User with this email or username already exists'
      });
    }

    // Create user with proper field mapping
    const user = await User.create({
      username,
      email,
      password,
      firstName: firstName || first_name,
      lastName: lastName || last_name,
    });

    // --- Automatic XP, Badge, Achievement ---
    await prisma.$transaction(async (tx) => {
      // 1. Award registration XP
      await tx.user.update({ where: { id: user.id }, data: { experiencePoints: { increment: 25 } } });
      // 2. Award "First Steps" badge
      const firstStepsBadge = await tx.badge.findFirst({ where: { name: "First Steps", isActive: true } });
      if (firstStepsBadge) {
        const hasBadge = await tx.userBadge.findFirst({ where: { userId: user.id, badgeId: firstStepsBadge.id } });
        if (!hasBadge) {
          await tx.userBadge.create({ data: { userId: user.id, badgeId: firstStepsBadge.id, awardedBy: null } });
          await tx.user.update({ where: { id: user.id }, data: { totalBadges: { increment: 1 }, experiencePoints: { increment: firstStepsBadge.experienceReward } } });
        }
      }
      // 3. Check and update level
      await checkAndUpdateLevel(user.id, tx);
      
      // 4. Check for achievements
      await checkAndUnlockAchievements(user.id, tx);
    });

    // Get updated user data for notifications
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userBadges: { include: { badge: true } },
        userAchievements: { include: { achievement: true } }
      }
    });

    // Emit real-time notifications
    const io = req.app.get('io');
    if (io) {
      // Emit registration XP notification
      io.to(`user-${user.id}`).emit('xp-gained', {
        type: 'registration',
        amount: 25,
        totalXP: updatedUser.experiencePoints,
        message: 'Welcome! You gained 25 XP for registering.'
      });

      // Emit "First Steps" badge notification if awarded
      const firstStepsBadge = await prisma.badge.findFirst({ 
        where: { name: "First Steps", isActive: true } 
      });
      if (firstStepsBadge) {
        const hasBadge = updatedUser.userBadges.some(ub => ub.badgeId === firstStepsBadge.id);
        if (!hasBadge) {
          io.to(`user-${user.id}`).emit('badge-awarded', {
            badge: firstStepsBadge,
            awardedBy: 'System',
            experienceGained: firstStepsBadge.experienceReward,
            message: 'Congratulations! You earned the "First Steps" badge!'
          });
        }
      }

      // Emit level-up notification if level increased
      if (updatedUser.currentLevel > 1) {
        io.to(`user-${user.id}`).emit('level-up', {
          newLevel: updatedUser.currentLevel,
          oldLevel: 1,
          experiencePoints: updatedUser.experiencePoints,
          message: `Congratulations! You reached Level ${updatedUser.currentLevel}!`
        });
      }

      // Emit achievement unlock notifications
      updatedUser.userAchievements.forEach(userAchievement => {
        io.to(`user-${user.id}`).emit('achievement-unlocked', {
          achievement: userAchievement.achievement,
          experienceGained: userAchievement.achievement.experienceReward,
          message: `Achievement unlocked: ${userAchievement.achievement.name}!`
        });
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during registration'
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     token:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { email, password } = value;

    // Find user
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Check password
    const isMatch = await User.verifyPassword(user, password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // --- Automatic XP, Badge, Achievement ---
    await prisma.$transaction(async (tx) => {
      // 1. Award login XP
      await tx.user.update({ where: { id: user.id }, data: { experiencePoints: { increment: 10 } } });
      // 2. Check for login streak (example: 7-day streak)
      // (You can implement a real streak system here)
      // 3. Award "Loyal User" badge for 7-day streak (example only)
      // 4. Check for achievements
      await checkAndUnlockAchievements(user.id, tx);
    });

    // Get updated user data for notifications
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userBadges: { include: { badge: true } },
        userAchievements: { include: { achievement: true } }
      }
    });

    // Emit real-time notifications
    const io = req.app.get('io');
    if (io) {
      // Emit login XP notification
      io.to(`user-${user.id}`).emit('xp-gained', {
        type: 'login',
        amount: 10,
        totalXP: updatedUser.experiencePoints,
        message: 'Welcome back! You gained 10 XP for logging in.'
      });

      // Emit level-up notification if level increased
      if (updatedUser.currentLevel > user.currentLevel) {
        io.to(`user-${user.id}`).emit('level-up', {
          newLevel: updatedUser.currentLevel,
          oldLevel: user.currentLevel,
          experiencePoints: updatedUser.experiencePoints,
          message: `Congratulations! You reached Level ${updatedUser.currentLevel}!`
        });
      }

      // Emit achievement unlock notifications
      const newAchievements = updatedUser.userAchievements.filter(ua => 
        !user.userAchievements?.some(existing => existing.achievementId === ua.achievementId)
      );
      newAchievements.forEach(userAchievement => {
        io.to(`user-${user.id}`).emit('achievement-unlocked', {
          achievement: userAchievement.achievement,
          experienceGained: userAchievement.achievement.experienceReward,
          message: `Achievement unlocked: ${userAchievement.achievement.name}!`
        });
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Not authorized
 */
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        experiencePoints: true,
        currentLevel: true,
        totalBadges: true,
        totalAchievements: true,
        isAdmin: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Profile retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving profile'
    });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 maxLength: 50
 *               last_name:
 *                 type: string
 *                 maxLength: 50
 *               avatar_url:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 */
router.put('/profile', protect, async (req, res) => {
  try {
    // Validate input
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { first_name, last_name, avatar_url, firstName, lastName, avatarUrl } = value;

    // Handle both camelCase and snake_case formats
    const firstNameValue = firstName || first_name;
    const lastNameValue = lastName || last_name;
    const avatarUrlValue = avatarUrl || avatar_url;

    // Build update data object
    const updateData = {};

    if (firstNameValue !== undefined) {
      updateData.firstName = firstNameValue;
    }

    if (lastNameValue !== undefined) {
      updateData.lastName = lastNameValue;
    }

    if (avatarUrlValue !== undefined) {
      updateData.avatarUrl = avatarUrlValue;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        experiencePoints: true,
        currentLevel: true,
        totalBadges: true,
        totalAchievements: true,
        isAdmin: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // --- Automatic XP, Badge, Achievement ---
    // Check if profile is now complete (simple example: has firstName, lastName, avatarUrl)
    if (user.firstName && user.lastName && user.avatarUrl) {
      await prisma.$transaction(async (tx) => {
        // 1. Award profile completion XP
        await tx.user.update({ where: { id: user.id }, data: { experiencePoints: { increment: 50 } } });
        // 2. Award "Profile Master" badge
        const profileMasterBadge = await tx.badge.findFirst({ where: { name: "Profile Master", isActive: true } });
        if (profileMasterBadge) {
          const hasBadge = await tx.userBadge.findFirst({ where: { userId: user.id, badgeId: profileMasterBadge.id } });
          if (!hasBadge) {
            await tx.userBadge.create({ data: { userId: user.id, badgeId: profileMasterBadge.id, awardedBy: null } });
            await tx.user.update({ where: { id: user.id }, data: { totalBadges: { increment: 1 }, experiencePoints: { increment: profileMasterBadge.experienceReward } } });
          }
        }
        // 3. Check for achievements
        await checkAndUnlockAchievements(user.id, tx);
      });

      // Emit real-time notifications for profile completion
      const io = req.app.get('io');
      if (io) {
        // Emit profile completion XP notification
        io.to(`user-${user.id}`).emit('xp-gained', {
          type: 'profile_completion',
          amount: 50,
          totalXP: user.experiencePoints + 50,
          message: 'Profile completed! You gained 50 XP for completing your profile.'
        });

        // Emit "Profile Master" badge notification if awarded
        const profileMasterBadge = await prisma.badge.findFirst({ 
          where: { name: "Profile Master", isActive: true } 
        });
        if (profileMasterBadge) {
          const hasBadge = await prisma.userBadge.findFirst({ 
            where: { userId: user.id, badgeId: profileMasterBadge.id } 
          });
          if (!hasBadge) {
            io.to(`user-${user.id}`).emit('badge-awarded', {
              badge: profileMasterBadge,
              awardedBy: 'System',
              experienceGained: profileMasterBadge.experienceReward,
              message: 'Congratulations! You earned the "Profile Master" badge!'
            });
          }
        }
      }
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error updating profile'
    });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user (client-side token removal)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', protect, (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // by removing the token. Server-side, we could implement a blacklist
  // for additional security if needed.
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router; 