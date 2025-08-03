const express = require('express');
const Joi = require('joi');
const { protect, admin } = require('../middleware/auth');
const { prisma } = require('../config/database');

const router = express.Router();

// Validation schemas
const updateUserSchema = Joi.object({
  // Accept both camelCase and snake_case
  firstName: Joi.string().min(1).max(50).optional(),
  lastName: Joi.string().min(1).max(50).optional(),
  avatarUrl: Joi.string().uri().optional(),
  first_name: Joi.string().min(1).max(50).optional(),
  last_name: Joi.string().min(1).max(50).optional(),
  avatar_url: Joi.string().uri().optional(),
  is_active: Joi.boolean().optional(),
  is_admin: Joi.boolean().optional()
}).unknown(); // Allow any additional fields

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username or email
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Not authorized
 */
router.get('/', protect, admin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, active } = req.query;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where = {};
    
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Only show active users by default, unless explicitly requested
    if (active !== undefined) {
      where.isActive = active === 'true';
    } else {
      where.isActive = true;
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
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
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving users'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
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
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving user'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *               first_name:
 *                 type: string
 *                 maxLength: 50
 *               last_name:
 *                 type: string
 *                 maxLength: 50
 *               avatar_url:
 *                 type: string
 *                 format: uri
 *               is_active:
 *                 type: boolean
 *               is_admin:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 *       404:
 *         description: User not found
 */
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate input
    console.log('Request body:', req.body);
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      console.log('Validation error:', error.details);
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    console.log('Validated value:', value);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Build update data object
    const updateData = {};
    
    // Handle both camelCase and snake_case formats
    if (value.firstName !== undefined) updateData.firstName = value.firstName;
    else if (value.first_name !== undefined) updateData.firstName = value.first_name;
    
    if (value.lastName !== undefined) updateData.lastName = value.lastName;
    else if (value.last_name !== undefined) updateData.lastName = value.last_name;
    
    if (value.avatarUrl !== undefined) updateData.avatarUrl = value.avatarUrl;
    else if (value.avatar_url !== undefined) updateData.avatarUrl = value.avatar_url;
    
    if (value.is_active !== undefined) updateData.isActive = value.is_active;
    if (value.is_admin !== undefined) updateData.isAdmin = value.is_admin;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
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

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error updating user'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: User not found
 */
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Real delete - remove user from database
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error deleting user'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User statistics
 *       404:
 *         description: User not found
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
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

    // Get user statistics using Prisma - simplified approach
    console.log('Fetching user statistics for user ID:', id);
    
    try {
      // Get basic counts first
      const totalBadges = await prisma.userBadge.count({
        where: { userId: parseInt(id) }
      });
      console.log('Total badges:', totalBadges);

      const totalAchievements = await prisma.userAchievement.count({
        where: { userId: parseInt(id) }
      });
      console.log('Total achievements:', totalAchievements);

      const totalActivities = await prisma.userActivity.count({
        where: { userId: parseInt(id) }
      });
      console.log('Total activities:', totalActivities);

      // Get experience logs
      const experienceLogs = await prisma.experienceLog.findMany({
        where: { userId: parseInt(id) },
        orderBy: { createdAt: 'desc' }
      });
      console.log('Experience logs count:', experienceLogs.length);

      // Get recent badges (simplified)
      const recentBadges = await prisma.userBadge.findMany({
        where: { userId: parseInt(id) },
        include: {
          badge: true
        },
        orderBy: { awardedAt: 'desc' },
        take: 5
      });
      console.log('Recent badges count:', recentBadges.length);

      // Get level info
      const levelInfo = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        select: {
          experiencePoints: true,
          currentLevel: true
        }
      });
      console.log('Level info:', levelInfo);

      // Calculate stats
      const totalExperienceGained = experienceLogs.reduce((sum, log) => sum + log.experienceChange, 0);
      const lastActivity = experienceLogs.length > 0 ? experienceLogs[0].createdAt : null;

    res.json({
      success: true,
      data: {
        user,
        stats: {
          total_badges: totalBadges,
          total_achievements: totalAchievements,
          total_activities: totalActivities,
          total_experience_events: experienceLogs.length,
          total_experience_gained: totalExperienceGained,
          last_activity: lastActivity
        },
        recent_badges: recentBadges.map(ub => ({
          name: ub.badge.name,
          rarity: ub.badge.rarity,
          awarded_at: ub.awardedAt
        })),
        level_info: {
          experiencePoints: levelInfo.experiencePoints,
          currentLevel: levelInfo.currentLevel
        }
      }
    });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error retrieving user statistics',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving user statistics',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/users/{id}/experience:
 *   get:
 *     summary: Get user experience history
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
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
 *     responses:
 *       200:
 *         description: User experience history
 *       404:
 *         description: User not found
 */
router.get('/:id/experience', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
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

    // Get total count
    const total = await prisma.experienceLog.count({
      where: { userId: parseInt(id) }
    });

    // Get experience history
    const experienceHistory = await prisma.experienceLog.findMany({
      where: { userId: parseInt(id) },
      select: {
        activityType: true,
        activityId: true,
        experienceChange: true,
        previousLevel: true,
        newLevel: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(offset),
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        user,
        experience_history: experienceHistory.map(log => ({
          activity_type: log.activityType,
          activity_id: log.activityId,
          experience_change: log.experienceChange,
          previous_level: log.previousLevel,
          new_level: log.newLevel,
          created_at: log.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user experience error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving user experience'
    });
  }
});

module.exports = router; 