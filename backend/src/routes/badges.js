const express = require('express');
const Joi = require('joi');
const { protect, admin } = require('../middleware/auth');
const { prisma } = require('../config/database');

const router = express.Router();

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

// Validation schemas
const createBadgeSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  image_url: Joi.string().uri().optional(),
  criteria_type: Joi.string().valid('experience', 'badges', 'activities', 'achievements', 'custom').required(),
  criteria_value: Joi.number().integer().min(1).required(),
  experience_reward: Joi.number().integer().min(0).default(0),
  rarity: Joi.string().valid('common', 'uncommon', 'rare', 'epic', 'legendary').default('common')
});

const updateBadgeSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  image_url: Joi.string().uri().optional(),
  criteria_type: Joi.string().valid('experience', 'badges', 'activities', 'achievements', 'custom').optional(),
  criteria_value: Joi.number().integer().min(1).optional(),
  experience_reward: Joi.number().integer().min(0).optional(),
  rarity: Joi.string().valid('common', 'uncommon', 'rare', 'epic', 'legendary').optional(),
  is_active: Joi.boolean().optional()
});

const awardBadgeSchema = Joi.object({
  badge_id: Joi.number().integer().min(1).required(),
  user_id: Joi.number().integer().min(1).required()
});

/**
 * @swagger
 * /api/badges:
 *   get:
 *     summary: Get all badges
 *     tags: [Badges]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: rarity
 *         schema:
 *           type: string
 *           enum: [common, uncommon, rare, epic, legendary]
 *         description: Filter by rarity
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of badges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, rarity, active } = req.query;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where = {};
    
    if (rarity) {
      where.rarity = rarity;
    }

    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    // Get total count
    const total = await prisma.badge.count({ where });

    // Get badges with pagination
    const badges = await prisma.badge.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        criteriaType: true,
        criteriaValue: true,
        experienceReward: true,
        rarity: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: badges,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving badges'
    });
  }
});

/**
 * @swagger
 * /api/badges/{id}:
 *   get:
 *     summary: Get badge by ID
 *     tags: [Badges]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Badge ID
 *     responses:
 *       200:
 *         description: Badge details
 *       404:
 *         description: Badge not found
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const badge = await prisma.badge.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        criteriaType: true,
        criteriaValue: true,
        experienceReward: true,
        rarity: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!badge) {
      return res.status(404).json({
        success: false,
        error: 'Badge not found'
      });
    }

    res.json({
      success: true,
      data: badge
    });
  } catch (error) {
    console.error('Get badge error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving badge'
    });
  }
});

/**
 * @swagger
 * /api/badges:
 *   post:
 *     summary: Create a new badge
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - criteria_type
 *               - criteria_value
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               image_url:
 *                 type: string
 *                 format: uri
 *               criteria_type:
 *                 type: string
 *                 enum: [experience, badges, activities, achievements, custom]
 *               criteria_value:
 *                 type: integer
 *                 minimum: 1
 *               experience_reward:
 *                 type: integer
 *                 minimum: 0
 *               rarity:
 *                 type: string
 *                 enum: [common, uncommon, rare, epic, legendary]
 *     responses:
 *       201:
 *         description: Badge created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 */
router.post('/', protect, admin, async (req, res) => {
  try {
    // Validate input
    const { error, value } = createBadgeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const {
      name, description, image_url, criteria_type, criteria_value,
      experience_reward, rarity
    } = value;

    const badge = await prisma.badge.create({
      data: {
        name,
        description,
        imageUrl: image_url,
        criteriaType: criteria_type,
        criteriaValue: criteria_value,
        experienceReward: experience_reward,
        rarity
      },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        criteriaType: true,
        criteriaValue: true,
        experienceReward: true,
        rarity: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: badge
    });
  } catch (error) {
    console.error('Create badge error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error creating badge'
    });
  }
});

/**
 * @swagger
 * /api/badges/{id}:
 *   put:
 *     summary: Update a badge
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Badge ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               image_url:
 *                 type: string
 *                 format: uri
 *               criteria_type:
 *                 type: string
 *                 enum: [experience, badges, activities, achievements, custom]
 *               criteria_value:
 *                 type: integer
 *                 minimum: 1
 *               experience_reward:
 *                 type: integer
 *                 minimum: 0
 *               rarity:
 *                 type: string
 *                 enum: [common, uncommon, rare, epic, legendary]
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Badge updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Badge not found
 */
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate input
    const { error, value } = updateBadgeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    // Check if badge exists
    const existingBadge = await prisma.badge.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingBadge) {
      return res.status(404).json({
        success: false,
        error: 'Badge not found'
      });
    }

    // Build update data object
    const updateData = {};
    
    if (value.name !== undefined) updateData.name = value.name;
    if (value.description !== undefined) updateData.description = value.description;
    if (value.image_url !== undefined) updateData.imageUrl = value.image_url;
    if (value.criteria_type !== undefined) updateData.criteriaType = value.criteria_type;
    if (value.criteria_value !== undefined) updateData.criteriaValue = value.criteria_value;
    if (value.experience_reward !== undefined) updateData.experienceReward = value.experience_reward;
    if (value.rarity !== undefined) updateData.rarity = value.rarity;
    if (value.is_active !== undefined) updateData.isActive = value.is_active;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    const badge = await prisma.badge.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        criteriaType: true,
        criteriaValue: true,
        experienceReward: true,
        rarity: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: badge
    });
  } catch (error) {
    console.error('Update badge error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error updating badge'
    });
  }
});

/**
 * @swagger
 * /api/badges/{id}:
 *   delete:
 *     summary: Delete a badge
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Badge ID
 *     responses:
 *       200:
 *         description: Badge deleted successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Badge not found
 */
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if badge exists
    const existingBadge = await prisma.badge.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingBadge) {
      return res.status(404).json({
        success: false,
        error: 'Badge not found'
      });
    }

    // Delete badge (this will cascade to user_badges)
    await prisma.badge.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Badge deleted successfully'
    });
  } catch (error) {
    console.error('Delete badge error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error deleting badge'
    });
  }
});

/**
 * @swagger
 * /api/badges/award:
 *   post:
 *     summary: Award a badge to a user
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - badge_id
 *               - user_id
 *             properties:
 *               badge_id:
 *                 type: integer
 *               user_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Badge awarded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Badge or user not found
 *       409:
 *         description: User already has this badge
 */
router.post('/award', protect, admin, async (req, res) => {
  try {
    // Validate input
    const { error, value } = awardBadgeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { badge_id, user_id } = value;

    // Check if badge and user exist
    const badge = await prisma.badge.findFirst({
      where: { 
        id: parseInt(badge_id),
        isActive: true
      },
      select: {
        id: true,
        name: true,
        experienceReward: true
      }
    });

    if (!badge) {
      return res.status(404).json({
        success: false,
        error: 'Badge not found or inactive'
      });
    }

    const user = await prisma.user.findFirst({
      where: { 
        id: parseInt(user_id),
        isActive: true
      },
      select: {
        id: true,
        username: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found or inactive'
      });
    }

    // Check if user already has this badge
    const existingAward = await prisma.userBadge.findFirst({
      where: {
        userId: parseInt(user_id),
        badgeId: parseInt(badge_id)
      }
    });

    if (existingAward) {
      return res.status(409).json({
        success: false,
        error: 'User already has this badge'
      });
    }

    // Award badge and update user stats using Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // Award the badge
      await tx.userBadge.create({
        data: {
          userId: parseInt(user_id),
          badgeId: parseInt(badge_id),
          awardedBy: req.user.id
        }
      });

      // Update user stats
      await tx.user.update({
        where: { id: parseInt(user_id) },
        data: {
          totalBadges: { increment: 1 },
          experiencePoints: { increment: badge.experienceReward },
          updatedAt: new Date()
        }
      });

      // Log experience change
      if (badge.experienceReward > 0) {
        await tx.experienceLog.create({
          data: {
            userId: parseInt(user_id),
            activityType: 'badge_award',
            activityId: parseInt(badge_id),
            experienceChange: badge.experienceReward
          }
        });
      }

      // Check and update level
      await checkAndUpdateLevel(parseInt(user_id), tx);

      // Check and unlock achievements
      await checkAndUnlockAchievements(parseInt(user_id), tx);

      return { badge, user };
    });

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${user_id}`).emit('badge-awarded', {
        badge: badge,
        awardedBy: req.user.username,
        experienceGained: badge.experienceReward
      });
    }

    res.json({
      success: true,
      data: {
        badge: badge,
        user: user,
        awardedBy: req.user.username,
        experienceGained: badge.experienceReward
      }
    });
  } catch (error) {
    console.error('Award badge error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error awarding badge'
    });
  }
});

/**
 * @swagger
 * /api/badges/user/{userId}:
 *   get:
 *     summary: Get badges for a specific user
 *     tags: [Badges]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User badges retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        username: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user badges
    const badges = await prisma.userBadge.findMany({
      where: { userId: parseInt(userId) },
      include: {
        badge: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            rarity: true
          }
        },
        awarder: {
          select: {
            username: true
          }
        }
      },
      orderBy: { awardedAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        user: user,
        badges: badges.map(ub => ({
          id: ub.badge.id,
          name: ub.badge.name,
          description: ub.badge.description,
          image_url: ub.badge.imageUrl,
          rarity: ub.badge.rarity,
          awarded_at: ub.awardedAt,
          awarded_by: ub.awardedBy,
          awarded_by_username: ub.awarder?.username
        }))
      }
    });
  } catch (error) {
    console.error('Get user badges error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving user badges'
    });
  }
});

module.exports = router; 