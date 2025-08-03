const express = require('express');
const Joi = require('joi');
const { protect, admin } = require('../middleware/auth');
const { prisma } = require('../config/database');

const router = express.Router();

// Validation schemas
const createAchievementSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  icon_url: Joi.string().uri().optional(),
  category: Joi.string().max(50).optional(),
  criteria_type: Joi.string().valid('experience', 'badges', 'activities', 'achievements', 'custom').required(),
  criteria_value: Joi.number().integer().min(1).required(),
  experience_reward: Joi.number().integer().min(0).default(0),
  badge_reward_id: Joi.number().integer().min(1).optional()
});

const updateAchievementSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  icon_url: Joi.string().uri().optional(),
  category: Joi.string().max(50).optional(),
  criteria_type: Joi.string().valid('experience', 'badges', 'activities', 'achievements', 'custom').optional(),
  criteria_value: Joi.number().integer().min(1).optional(),
  experience_reward: Joi.number().integer().min(0).optional(),
  badge_reward_id: Joi.number().integer().min(1).optional(),
  is_active: Joi.boolean().optional()
});

/**
 * @swagger
 * /api/achievements:
 *   get:
 *     summary: Get all achievements
 *     tags: [Achievements]
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
 *         description: List of achievements
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
    const total = await prisma.achievement.count({ where });

    // Get achievements with pagination
    const achievements = await prisma.achievement.findMany({
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
      data: achievements.map(achievement => ({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon_url: achievement.iconUrl,
        category: achievement.category,
        criteria_type: achievement.criteriaType,
        criteria_value: achievement.criteriaValue,
        experience_reward: achievement.experienceReward,
        badge_reward_id: achievement.badgeRewardId,
        is_active: achievement.isActive,
        created_at: achievement.createdAt,
        updated_at: achievement.updatedAt,
        badge_name: achievement.badgeReward?.name,
        badge_image: achievement.badgeReward?.imageUrl
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving achievements'
    });
  }
});

/**
 * @swagger
 * /api/achievements/{id}:
 *   get:
 *     summary: Get achievement by ID
 *     tags: [Achievements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Achievement ID
 *     responses:
 *       200:
 *         description: Achievement details
 *       404:
 *         description: Achievement not found
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const achievement = await prisma.achievement.findUnique({
      where: { id: parseInt(id) },
      include: {
        badgeReward: {
          select: {
            name: true,
            imageUrl: true
          }
        }
      }
    });

    if (!achievement) {
      return res.status(404).json({
        success: false,
        error: 'Achievement not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon_url: achievement.iconUrl,
        category: achievement.category,
        criteria_type: achievement.criteriaType,
        criteria_value: achievement.criteriaValue,
        experience_reward: achievement.experienceReward,
        badge_reward_id: achievement.badgeRewardId,
        is_active: achievement.isActive,
        created_at: achievement.createdAt,
        updated_at: achievement.updatedAt,
        badge_name: achievement.badgeReward?.name,
        badge_image: achievement.badgeReward?.imageUrl
      }
    });
  } catch (error) {
    console.error('Get achievement error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving achievement'
    });
  }
});

/**
 * @swagger
 * /api/achievements:
 *   post:
 *     summary: Create a new achievement
 *     tags: [Achievements]
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
 *               icon_url:
 *                 type: string
 *                 format: uri
 *               category:
 *                 type: string
 *                 maxLength: 50
 *               criteria_type:
 *                 type: string
 *                 enum: [experience, badges, activities, achievements, custom]
 *               criteria_value:
 *                 type: integer
 *                 minimum: 1
 *               experience_reward:
 *                 type: integer
 *                 minimum: 0
 *               badge_reward_id:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Achievement created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 */
router.post('/', protect, admin, async (req, res) => {
  try {
    // Validate input
    const { error, value } = createAchievementSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const {
      name, description, icon_url, category, criteria_type, criteria_value,
      experience_reward, badge_reward_id
    } = value;

    const achievement = await prisma.achievement.create({
      data: {
        name,
        description,
        iconUrl: icon_url,
        category,
        criteriaType: criteria_type,
        criteriaValue: criteria_value,
        experienceReward: experience_reward,
        badgeRewardId: badge_reward_id
      },
      select: {
        id: true,
        name: true,
        description: true,
        iconUrl: true,
        category: true,
        criteriaType: true,
        criteriaValue: true,
        experienceReward: true,
        badgeRewardId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon_url: achievement.iconUrl,
        category: achievement.category,
        criteria_type: achievement.criteriaType,
        criteria_value: achievement.criteriaValue,
        experience_reward: achievement.experienceReward,
        badge_reward_id: achievement.badgeRewardId,
        is_active: achievement.isActive,
        created_at: achievement.createdAt,
        updated_at: achievement.updatedAt
      }
    });
  } catch (error) {
    console.error('Create achievement error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error creating achievement'
    });
  }
});

/**
 * @swagger
 * /api/achievements/{id}:
 *   put:
 *     summary: Update an achievement
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Achievement ID
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
 *               icon_url:
 *                 type: string
 *                 format: uri
 *               category:
 *                 type: string
 *                 maxLength: 50
 *               criteria_type:
 *                 type: string
 *                 enum: [experience, badges, activities, achievements, custom]
 *               criteria_value:
 *                 type: integer
 *                 minimum: 1
 *               experience_reward:
 *                 type: integer
 *                 minimum: 0
 *               badge_reward_id:
 *                 type: integer
 *                 minimum: 1
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Achievement updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Achievement not found
 */
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate input
    const { error, value } = updateAchievementSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    // Check if achievement exists
    const existingAchievement = await prisma.achievement.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingAchievement) {
      return res.status(404).json({
        success: false,
        error: 'Achievement not found'
      });
    }

    // Build update data dynamically
    const updateData = {};
    
    if (value.name !== undefined) updateData.name = value.name;
    if (value.description !== undefined) updateData.description = value.description;
    if (value.icon_url !== undefined) updateData.iconUrl = value.icon_url;
    if (value.category !== undefined) updateData.category = value.category;
    if (value.criteria_type !== undefined) updateData.criteriaType = value.criteria_type;
    if (value.criteria_value !== undefined) updateData.criteriaValue = value.criteria_value;
    if (value.experience_reward !== undefined) updateData.experienceReward = value.experience_reward;
    if (value.badge_reward_id !== undefined) updateData.badgeRewardId = value.badge_reward_id;
    if (value.is_active !== undefined) updateData.isActive = value.is_active;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    const achievement = await prisma.achievement.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        iconUrl: true,
        category: true,
        criteriaType: true,
        criteriaValue: true,
        experienceReward: true,
        badgeRewardId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon_url: achievement.iconUrl,
        category: achievement.category,
        criteria_type: achievement.criteriaType,
        criteria_value: achievement.criteriaValue,
        experience_reward: achievement.experienceReward,
        badge_reward_id: achievement.badgeRewardId,
        is_active: achievement.isActive,
        created_at: achievement.createdAt,
        updated_at: achievement.updatedAt
      }
    });
  } catch (error) {
    console.error('Update achievement error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error updating achievement'
    });
  }
});

/**
 * @swagger
 * /api/achievements/{id}:
 *   delete:
 *     summary: Delete an achievement
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Achievement ID
 *     responses:
 *       200:
 *         description: Achievement deleted successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Achievement not found
 */
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if achievement exists
    const existingAchievement = await prisma.achievement.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingAchievement) {
      return res.status(404).json({
        success: false,
        error: 'Achievement not found'
      });
    }

    // Delete achievement (this will cascade to user_achievements)
    await prisma.achievement.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Achievement deleted successfully'
    });
  } catch (error) {
    console.error('Delete achievement error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error deleting achievement'
    });
  }
});

/**
 * @swagger
 * /api/achievements/user/{userId}:
 *   get:
 *     summary: Get achievements for a specific user
 *     tags: [Achievements]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User achievements retrieved successfully
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

    // Get user achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: {
        userId: parseInt(userId)
      },
      include: {
        achievement: {
          select: {
            id: true,
            name: true,
            description: true,
            iconUrl: true,
            category: true,
            criteriaType: true,
            criteriaValue: true,
            experienceReward: true
          }
        }
      },
      orderBy: {
        unlockedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        user: user,
        achievements: userAchievements.map(ua => ({
          id: ua.achievement.id,
          name: ua.achievement.name,
          description: ua.achievement.description,
          icon_url: ua.achievement.iconUrl,
          category: ua.achievement.category,
          criteria_type: ua.achievement.criteriaType,
          criteria_value: ua.achievement.criteriaValue,
          experience_reward: ua.achievement.experienceReward,
          unlocked_at: ua.unlockedAt
        }))
      }
    });
  } catch (error) {
    console.error('Get user achievements error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving user achievements'
    });
  }
});

module.exports = router; 