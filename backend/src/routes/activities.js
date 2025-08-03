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
const createActivitySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  category: Joi.string().max(50).optional(),
  experience_reward: Joi.number().integer().min(0).default(0),
  badge_reward_id: Joi.number().integer().min(1).optional(),
  is_repeatable: Joi.boolean().default(false)
});

const updateActivitySchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  category: Joi.string().max(50).optional(),
  experience_reward: Joi.number().integer().min(0).optional(),
  badge_reward_id: Joi.number().integer().min(1).optional(),
  is_repeatable: Joi.boolean().optional(),
  is_active: Joi.boolean().optional()
});

/**
 * @swagger
 * /api/activities:
 *   get:
 *     summary: Get all activities
 *     tags: [Activities]
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
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of activities
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, active } = req.query;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where = {};
    
    if (category) {
      where.category = category;
    }

    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    // Get total count
    const total = await prisma.activity.count({ where });

    // Get activities with pagination
    const activities = await prisma.activity.findMany({
      where,
      include: {
        badgeReward: {
          select: {
            name: true,
            imageUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: activities.map(activity => ({
        id: activity.id,
        name: activity.name,
        description: activity.description,
        category: activity.category,
        experience_reward: activity.experienceReward,
        badge_reward_id: activity.badgeRewardId,
        is_repeatable: activity.isRepeatable,
        is_active: activity.isActive,
        created_at: activity.createdAt,
        updated_at: activity.updatedAt,
        badge_name: activity.badgeReward?.name,
        badge_image: activity.badgeReward?.imageUrl
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving activities'
    });
  }
});

/**
 * @swagger
 * /api/activities/user:
 *   get:
 *     summary: Get user's completed activities
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's completed activities
 *       401:
 *         description: Not authorized
 */
router.get('/user', protect, async (req, res) => {
  try {
    console.log('User activities request - User:', req.user);
    const userId = req.user.id;
    console.log('Looking for activities for user ID:', userId);

    const userActivities = await prisma.userActivity.findMany({
      where: { userId },
      include: {
        activity: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            experienceReward: true,
            badgeRewardId: true,
            isRepeatable: true,
            isActive: true
          }
        }
      },
      orderBy: { completedAt: 'desc' }
    });

    console.log('Found user activities:', userActivities.length);

    res.json({
      success: true,
      data: {
        userActivities: userActivities.map(ua => ({
          id: ua.id,
          activityId: ua.activityId,
          completedAt: ua.completedAt,
          experienceGained: ua.experienceGained,
          activity: {
            id: ua.activity.id,
            name: ua.activity.name,
            description: ua.activity.description,
            category: ua.activity.category,
            experience_reward: ua.activity.experienceReward,
            badge_reward_id: ua.activity.badgeRewardId,
            is_repeatable: ua.activity.isRepeatable,
            is_active: ua.activity.isActive
          }
        }))
      }
    });
  } catch (error) {
    console.error('Get user activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving user activities'
    });
  }
});

/**
 * @swagger
 * /api/activities/{id}:
 *   get:
 *     summary: Get activity by ID
 *     tags: [Activities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity ID
 *     responses:
 *       200:
 *         description: Activity details
 *       404:
 *         description: Activity not found
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that id is provided and is a number
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid activity ID'
      });
    }

    const activityId = parseInt(id);
    console.log('Looking for activity with ID:', activityId);

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        badgeReward: {
          select: {
            name: true,
            imageUrl: true
          }
        }
      }
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: activity.id,
        name: activity.name,
        description: activity.description,
        category: activity.category,
        experience_reward: activity.experienceReward,
        badge_reward_id: activity.badgeRewardId,
        is_repeatable: activity.isRepeatable,
        is_active: activity.isActive,
        created_at: activity.createdAt,
        updated_at: activity.updatedAt,
        badge_name: activity.badgeReward?.name,
        badge_image: activity.badgeReward?.imageUrl
      }
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving activity'
    });
  }
});

/**
 * @swagger
 * /api/activities:
 *   post:
 *     summary: Create a new activity
 *     tags: [Activities]
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
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               category:
 *                 type: string
 *                 maxLength: 50
 *               experience_reward:
 *                 type: integer
 *                 minimum: 0
 *               badge_reward_id:
 *                 type: integer
 *                 minimum: 1
 *               is_repeatable:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Activity created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 */
router.post('/', protect, admin, async (req, res) => {
  try {
    // Validate input
    const { error, value } = createActivitySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const {
      name, description, category, experience_reward, badge_reward_id, is_repeatable
    } = value;

    const activity = await prisma.activity.create({
      data: {
        name,
        description,
        category,
        experienceReward: experience_reward,
        badgeRewardId: badge_reward_id,
        isRepeatable: is_repeatable
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        experienceReward: true,
        badgeRewardId: true,
        isRepeatable: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: activity.id,
        name: activity.name,
        description: activity.description,
        category: activity.category,
        experience_reward: activity.experienceReward,
        badge_reward_id: activity.badgeRewardId,
        is_repeatable: activity.isRepeatable,
        is_active: activity.isActive,
        created_at: activity.createdAt,
        updated_at: activity.updatedAt
      }
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error creating activity'
    });
  }
});

/**
 * @swagger
 * /api/activities/{id}:
 *   put:
 *     summary: Update an activity
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity ID
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
 *               category:
 *                 type: string
 *                 maxLength: 50
 *               experience_reward:
 *                 type: integer
 *                 minimum: 0
 *               badge_reward_id:
 *                 type: integer
 *                 minimum: 1
 *               is_repeatable:
 *                 type: boolean
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Activity updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Activity not found
 */
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate input
    const { error, value } = updateActivitySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    // Check if activity exists
    const existingActivity = await prisma.activity.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingActivity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    // Build update data dynamically
    const updateData = {};
    
    if (value.name !== undefined) updateData.name = value.name;
    if (value.description !== undefined) updateData.description = value.description;
    if (value.category !== undefined) updateData.category = value.category;
    if (value.experience_reward !== undefined) updateData.experienceReward = value.experience_reward;
    if (value.badge_reward_id !== undefined) updateData.badgeRewardId = value.badge_reward_id;
    if (value.is_repeatable !== undefined) updateData.isRepeatable = value.is_repeatable;
    if (value.is_active !== undefined) updateData.isActive = value.is_active;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    const activity = await prisma.activity.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        experienceReward: true,
        badgeRewardId: true,
        isRepeatable: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: {
        id: activity.id,
        name: activity.name,
        description: activity.description,
        category: activity.category,
        experience_reward: activity.experienceReward,
        badge_reward_id: activity.badgeRewardId,
        is_repeatable: activity.isRepeatable,
        is_active: activity.isActive,
        created_at: activity.createdAt,
        updated_at: activity.updatedAt
      }
    });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error updating activity'
    });
  }
});

/**
 * @swagger
 * /api/activities/{id}/complete:
 *   post:
 *     summary: Complete an activity
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Activity completed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Activity or user not found
 *       409:
 *         description: Activity already completed
 */
router.post('/:id/complete', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    // Validate input
    if (!user_id || isNaN(parseInt(user_id))) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required and must be a number'
      });
    }

    // Check if activity exists
    const activity = await prisma.activity.findFirst({
      where: { 
        id: parseInt(id),
        isActive: true
      }
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found or inactive'
      });
    }

    // Check if user exists
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

    // Check if activity is already completed
    const existingCompletion = await prisma.userActivity.findFirst({
      where: {
        userId: parseInt(user_id),
        activityId: parseInt(id)
      }
    });

    if (existingCompletion) {
      return res.status(200).json({
        success: true,
        message: 'You already completed this activity!',
        data: {
          alreadyCompleted: true,
          completedAt: existingCompletion.completedAt,
          experienceGained: existingCompletion.experienceGained
        }
      });
    }

    // Complete activity and update user stats
    const result = await prisma.$transaction(async (tx) => {
      // Record activity completion
      await tx.userActivity.create({
        data: {
          userId: parseInt(user_id),
          activityId: parseInt(id),
          experienceGained: activity.experienceReward
        }
      });

      // Update user experience
      const updatedUser = await tx.user.update({
        where: { id: parseInt(user_id) },
        data: {
          experiencePoints: {
            increment: activity.experienceReward
          }
        }
      });

      // Log experience change
      if (activity.experienceReward > 0) {
        await tx.experienceLog.create({
          data: {
            userId: parseInt(user_id),
            activityType: 'activity_completion',
            activityId: parseInt(id),
            experienceChange: activity.experienceReward
          }
        });
      }

      // Check and update level
      await checkAndUpdateLevel(parseInt(user_id), tx);

      // Award badge if applicable
      if (activity.badgeRewardId) {
        const badgeCheck = await tx.userBadge.findFirst({
          where: {
            userId: parseInt(user_id),
            badgeId: activity.badgeRewardId
          }
        });

        if (!badgeCheck) {
          await tx.userBadge.create({
            data: {
              userId: parseInt(user_id),
              badgeId: activity.badgeRewardId,
              awardedBy: req.user.id
            }
          });

          await tx.user.update({
            where: { id: parseInt(user_id) },
            data: {
              totalBadges: {
                increment: 1
              }
            }
          });
        }
      }

      // Check and unlock achievements
      await checkAndUnlockAchievements(parseInt(user_id), tx);

      return { activity, user };
    });

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${user_id}`).emit('activity-completed', {
        activity: {
          id: activity.id,
          name: activity.name,
          experience_reward: activity.experienceReward,
          badge_reward_id: activity.badgeRewardId
        },
        experienceGained: activity.experienceReward,
        badgeAwarded: activity.badgeRewardId ? true : false
      });
    }

    res.json({
      success: true,
      message: 'Activity completed successfully!',
      data: {
        activity: {
          id: activity.id,
          name: activity.name,
          experience_reward: activity.experienceReward,
          badge_reward_id: activity.badgeRewardId
        },
        user: user,
        experienceGained: activity.experienceReward,
        badgeAwarded: activity.badgeRewardId ? true : false,
        alreadyCompleted: false
      }
    });
  } catch (error) {
    console.error('Complete activity error:', error);
    
    // Handle unique constraint violation (activity already completed)
    if (error.code === 'P2002' && error.meta?.target?.includes('user_activities_userId_activityId_key')) {
      return res.status(200).json({
        success: true,
        message: 'You already completed this activity!',
        data: {
          alreadyCompleted: true
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error completing activity'
    });
  }
});

/**
 * @swagger
 * /api/activities/{id}:
 *   delete:
 *     summary: Delete an activity
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity ID
 *     responses:
 *       200:
 *         description: Activity deleted successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Activity not found
 */
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if activity exists
    const existingActivity = await prisma.activity.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingActivity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    // Delete activity (this will cascade to user_activities)
    await prisma.activity.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error deleting activity'
    });
  }
});

module.exports = router; 