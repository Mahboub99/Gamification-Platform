const express = require('express');
const Joi = require('joi');
const { protect, admin } = require('../middleware/auth');
const { prisma } = require('../config/database');

const router = express.Router();

// Validation schemas
const createLevelSchema = Joi.object({
  level_number: Joi.number().integer().min(1).required(),
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  experience_required: Joi.number().integer().min(0).required(),
  badge_reward_id: Joi.number().integer().min(1).optional()
});

const updateLevelSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  experience_required: Joi.number().integer().min(0).optional(),
  badge_reward_id: Joi.number().integer().min(1).optional()
});

/**
 * @swagger
 * /api/levels:
 *   get:
 *     summary: Get all levels
 *     tags: [Levels]
 *     responses:
 *       200:
 *         description: List of levels
 */
router.get('/', async (req, res) => {
  try {
    const levels = await prisma.level.findMany({
      include: {
        badgeReward: {
          select: {
            name: true,
            imageUrl: true
          }
        }
      },
      orderBy: { levelNumber: 'asc' }
    });

    res.json({
      success: true,
      data: levels.map(level => ({
        id: level.id,
        level_number: level.levelNumber,
        name: level.name,
        description: level.description,
        experience_required: level.experienceRequired,
        badge_reward_id: level.badgeRewardId,
        badge_name: level.badgeReward?.name,
        badge_image: level.badgeReward?.imageUrl
      }))
    });
  } catch (error) {
    console.error('Get levels error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving levels'
    });
  }
});

/**
 * @swagger
 * /api/levels/{id}:
 *   get:
 *     summary: Get level by ID
 *     tags: [Levels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Level ID
 *     responses:
 *       200:
 *         description: Level details
 *       404:
 *         description: Level not found
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const level = await prisma.level.findUnique({
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

    if (!level) {
      return res.status(404).json({
        success: false,
        error: 'Level not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: level.id,
        level_number: level.levelNumber,
        name: level.name,
        description: level.description,
        experience_required: level.experienceRequired,
        badge_reward_id: level.badgeRewardId,
        badge_name: level.badgeReward?.name,
        badge_image: level.badgeReward?.imageUrl
      }
    });
  } catch (error) {
    console.error('Get level error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving level'
    });
  }
});

/**
 * @swagger
 * /api/levels:
 *   post:
 *     summary: Create a new level
 *     tags: [Levels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - level_number
 *               - name
 *               - experience_required
 *             properties:
 *               level_number:
 *                 type: integer
 *                 minimum: 1
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               experience_required:
 *                 type: integer
 *                 minimum: 0
 *               badge_reward_id:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Level created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 */
router.post('/', protect, admin, async (req, res) => {
  try {
    // Validate input
    const { error, value } = createLevelSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { level_number, name, description, experience_required, badge_reward_id } = value;

    // Check if level number already exists
    const existingLevel = await prisma.level.findFirst({
      where: { levelNumber: level_number }
    });

    if (existingLevel) {
      return res.status(409).json({
        success: false,
        error: 'Level number already exists'
      });
    }

    const level = await prisma.level.create({
      data: {
        levelNumber: level_number,
        name,
        description,
        experienceRequired: experience_required,
        badgeRewardId: badge_reward_id
      },
      select: {
        id: true,
        levelNumber: true,
        name: true,
        description: true,
        experienceRequired: true,
        badgeRewardId: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: level.id,
        level_number: level.levelNumber,
        name: level.name,
        description: level.description,
        experience_required: level.experienceRequired,
        badge_reward_id: level.badgeRewardId,
        created_at: level.createdAt
      }
    });
  } catch (error) {
    console.error('Create level error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error creating level'
    });
  }
});

/**
 * @swagger
 * /api/levels/{id}:
 *   put:
 *     summary: Update a level
 *     tags: [Levels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Level ID
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
 *               experience_required:
 *                 type: integer
 *                 minimum: 0
 *               badge_reward_id:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Level updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Level not found
 */
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate input
    const { error, value } = updateLevelSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    // Check if level exists
    const existingLevel = await prisma.level.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingLevel) {
      return res.status(404).json({
        success: false,
        error: 'Level not found'
      });
    }

    // Build update data object
    const updateData = {};
    
    if (value.name !== undefined) updateData.name = value.name;
    if (value.description !== undefined) updateData.description = value.description;
    if (value.experience_required !== undefined) updateData.experienceRequired = value.experience_required;
    if (value.badge_reward_id !== undefined) updateData.badgeRewardId = value.badge_reward_id;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    const level = await prisma.level.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        levelNumber: true,
        name: true,
        description: true,
        experienceRequired: true,
        badgeRewardId: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: {
        id: level.id,
        level_number: level.levelNumber,
        name: level.name,
        description: level.description,
        experience_required: level.experienceRequired,
        badge_reward_id: level.badgeRewardId,
        created_at: level.createdAt
      }
    });
  } catch (error) {
    console.error('Update level error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error updating level'
    });
  }
});

/**
 * @swagger
 * /api/levels/{id}:
 *   delete:
 *     summary: Delete a level
 *     tags: [Levels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Level ID
 *     responses:
 *       200:
 *         description: Level deleted successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Level not found
 */
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if level exists
    const existingLevel = await prisma.level.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingLevel) {
      return res.status(404).json({
        success: false,
        error: 'Level not found'
      });
    }

    // Delete level
    await prisma.level.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Level deleted successfully'
    });
  } catch (error) {
    console.error('Delete level error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error deleting level'
    });
  }
});

module.exports = router; 