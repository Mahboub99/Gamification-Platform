const { prisma } = require('../config/database');

class Level {
  // Create a new level
  static async create(levelData) {
    return await prisma.level.create({
      data: levelData,
    });
  }

  // Find level by ID
  static async findById(id) {
    return await prisma.level.findUnique({
      where: { id: parseInt(id) },
      include: {
        badgeReward: true,
      },
    });
  }

  // Find level by level number
  static async findByLevelNumber(levelNumber) {
    return await prisma.level.findUnique({
      where: { levelNumber: parseInt(levelNumber) },
      include: {
        badgeReward: true,
      },
    });
  }

  // Get all levels with pagination and filters
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'levelNumber',
      sortOrder = 'asc',
    } = options;

    const skip = (page - 1) * limit;
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [levels, total] = await Promise.all([
      prisma.level.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          badgeReward: true,
        },
      }),
      prisma.level.count({ where }),
    ]);

    return {
      levels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Update level
  static async update(id, updateData) {
    return await prisma.level.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
  }

  // Delete level
  static async delete(id) {
    return await prisma.level.delete({
      where: { id: parseInt(id) },
    });
  }

  // Get user's current level
  static async getUserCurrentLevel(userId) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        experiencePoints: true,
        currentLevel: true,
      },
    });

    if (!user) return null;

    // Find the highest level the user qualifies for
    const currentLevel = await prisma.level.findFirst({
      where: {
        experienceRequired: {
          lte: user.experiencePoints,
        },
      },
      orderBy: {
        levelNumber: 'desc',
      },
      include: {
        badgeReward: true,
      },
    });

    return currentLevel;
  }

  // Get user's next level
  static async getUserNextLevel(userId) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        experiencePoints: true,
        currentLevel: true,
      },
    });

    if (!user) return null;

    // Find the next level the user can reach
    const nextLevel = await prisma.level.findFirst({
      where: {
        experienceRequired: {
          gt: user.experiencePoints,
        },
      },
      orderBy: {
        levelNumber: 'asc',
      },
      include: {
        badgeReward: true,
      },
    });

    return nextLevel;
  }

  // Update user's level based on experience
  static async updateUserLevel(userId) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        experiencePoints: true,
        currentLevel: true,
      },
    });

    if (!user) return null;

    // Find the highest level the user qualifies for
    const newLevel = await prisma.level.findFirst({
      where: {
        experienceRequired: {
          lte: user.experiencePoints,
        },
      },
      orderBy: {
        levelNumber: 'desc',
      },
    });

    if (!newLevel) return null;

    // Check if user has leveled up
    if (newLevel.levelNumber > user.currentLevel) {
      // Update user's level
      await prisma.user.update({
        where: { id: parseInt(userId) },
        data: {
          currentLevel: newLevel.levelNumber,
        },
      });

      // Log the level up
      await prisma.experienceLog.create({
        data: {
          userId: parseInt(userId),
          activityType: 'level_up',
          experienceChange: 0, // No experience change for level up
          previousLevel: user.currentLevel,
          newLevel: newLevel.levelNumber,
        },
      });

      return {
        previousLevel: user.currentLevel,
        newLevel: newLevel.levelNumber,
        level: newLevel,
      };
    }

    return null;
  }

  // Get level progress for user
  static async getUserLevelProgress(userId) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        experiencePoints: true,
        currentLevel: true,
      },
    });

    if (!user) return null;

    const [currentLevel, nextLevel] = await Promise.all([
      prisma.level.findFirst({
        where: {
          experienceRequired: {
            lte: user.experiencePoints,
          },
        },
        orderBy: {
          levelNumber: 'desc',
        },
      }),
      prisma.level.findFirst({
        where: {
          experienceRequired: {
            gt: user.experiencePoints,
          },
        },
        orderBy: {
          levelNumber: 'asc',
        },
      }),
    ]);

    if (!currentLevel) return null;

    const progress = {
      currentLevel,
      nextLevel,
      experienceInCurrentLevel: user.experiencePoints - currentLevel.experienceRequired,
      experienceForNextLevel: nextLevel ? nextLevel.experienceRequired - currentLevel.experienceRequired : 0,
      progressPercentage: nextLevel 
        ? ((user.experiencePoints - currentLevel.experienceRequired) / (nextLevel.experienceRequired - currentLevel.experienceRequired)) * 100
        : 100,
    };

    return progress;
  }

  // Get all levels with user count at each level
  static async getLevelStats() {
    const levels = await prisma.level.findMany({
      orderBy: {
        levelNumber: 'asc',
      },
      include: {
        badgeReward: true,
      },
    });

    // Get user count for each level
    const levelStats = await Promise.all(
      levels.map(async (level) => {
        const userCount = await prisma.user.count({
          where: {
            currentLevel: level.levelNumber,
            isActive: true,
          },
        });

        return {
          ...level,
          userCount,
        };
      })
    );

    return levelStats;
  }

  // Get top users by level
  static async getTopByLevel(limit = 10) {
    return await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { currentLevel: 'desc' },
      take: limit,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        experiencePoints: true,
        currentLevel: true,
        totalBadges: true,
        totalAchievements: true,
      },
    });
  }

  // Get level distribution
  static async getLevelDistribution() {
    return await prisma.user.groupBy({
      by: ['currentLevel'],
      _count: {
        id: true,
      },
      where: { isActive: true },
      orderBy: {
        currentLevel: 'asc',
      },
    });
  }

  // Get experience requirements for all levels
  static async getExperienceRequirements() {
    return await prisma.level.findMany({
      select: {
        levelNumber: true,
        name: true,
        experienceRequired: true,
      },
      orderBy: {
        levelNumber: 'asc',
      },
    });
  }

  // Check if user can level up
  static async canUserLevelUp(userId) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        experiencePoints: true,
        currentLevel: true,
      },
    });

    if (!user) return false;

    const nextLevel = await prisma.level.findFirst({
      where: {
        experienceRequired: {
          gt: user.experiencePoints,
        },
      },
      orderBy: {
        levelNumber: 'asc',
      },
    });

    return nextLevel !== null;
  }

  // Get level by experience points
  static async getLevelByExperience(experiencePoints) {
    return await prisma.level.findFirst({
      where: {
        experienceRequired: {
          lte: experiencePoints,
        },
      },
      orderBy: {
        levelNumber: 'desc',
      },
    });
  }
}

module.exports = Level; 