const { prisma } = require('../config/database');

class Achievement {
  // Create a new achievement
  static async create(achievementData) {
    return await prisma.achievement.create({
      data: achievementData,
    });
  }

  // Find achievement by ID
  static async findById(id) {
    return await prisma.achievement.findUnique({
      where: { id: parseInt(id) },
      include: {
        userAchievements: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        badgeReward: true,
      },
    });
  }

  // Find achievement by name
  static async findByName(name) {
    return await prisma.achievement.findUnique({
      where: { name },
    });
  }

  // Get all achievements with pagination and filters
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      isActive = null,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== null) {
      where.isActive = isActive;
    }

    const [achievements, total] = await Promise.all([
      prisma.achievement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          badgeReward: true,
          _count: {
            select: {
              userAchievements: true,
            },
          },
        },
      }),
      prisma.achievement.count({ where }),
    ]);

    return {
      achievements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Update achievement
  static async update(id, updateData) {
    return await prisma.achievement.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
  }

  // Delete achievement
  static async delete(id) {
    return await prisma.achievement.delete({
      where: { id: parseInt(id) },
    });
  }

  // Unlock achievement for user
  static async unlockForUser(achievementId, userId) {
    const achievement = await prisma.achievement.findUnique({
      where: { id: parseInt(achievementId) },
    });

    if (!achievement) {
      throw new Error('Achievement not found');
    }

    if (!achievement.isActive) {
      throw new Error('Achievement is not active');
    }

    // Check if user has already unlocked this achievement
    const existingUnlock = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId: parseInt(userId),
          achievementId: parseInt(achievementId),
        },
      },
    });

    if (existingUnlock) {
      throw new Error('Achievement already unlocked');
    }

    // Unlock the achievement
    const userAchievement = await prisma.userAchievement.create({
      data: {
        userId: parseInt(userId),
        achievementId: parseInt(achievementId),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            experiencePoints: true,
            currentLevel: true,
          },
        },
        achievement: true,
      },
    });

    // Add experience to user
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        experiencePoints: {
          increment: achievement.experienceReward,
        },
        totalAchievements: {
          increment: 1,
        },
      },
    });

    // Log experience change
    await prisma.experienceLog.create({
      data: {
        userId: parseInt(userId),
        activityType: 'achievement_unlock',
        activityId: parseInt(achievementId),
        experienceChange: achievement.experienceReward,
      },
    });

    return userAchievement;
  }

  // Get achievements for a specific user
  static async getUserAchievements(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      category = '',
      unlocked = null,
      sortBy = 'unlockedAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const where = {
      userId: parseInt(userId),
    };

    if (category) {
      where.achievement = {
        category,
      };
    }

    if (unlocked !== null) {
      if (unlocked) {
        // Get unlocked achievements
        const [userAchievements, total] = await Promise.all([
          prisma.userAchievement.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
              achievement: {
                include: {
                  badgeReward: true,
                },
              },
            },
          }),
          prisma.userAchievement.count({ where }),
        ]);

        return {
          userAchievements,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      } else {
        // Get available achievements (not unlocked)
        const unlockedAchievementIds = await prisma.userAchievement.findMany({
          where: { userId: parseInt(userId) },
          select: { achievementId: true },
        });

        const unlockedIds = unlockedAchievementIds.map(ua => ua.achievementId);

        const [achievements, total] = await Promise.all([
          prisma.achievement.findMany({
            where: {
              id: { notIn: unlockedIds },
              isActive: true,
              ...(category && { category }),
            },
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
              badgeReward: true,
            },
          }),
          prisma.achievement.count({
            where: {
              id: { notIn: unlockedIds },
              isActive: true,
              ...(category && { category }),
            },
          }),
        ]);

        return {
          achievements,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      }
    }

    // Get all user achievements
    const [userAchievements, total] = await Promise.all([
      prisma.userAchievement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          achievement: {
            include: {
              badgeReward: true,
            },
          },
        },
      }),
      prisma.userAchievement.count({ where }),
    ]);

    return {
      userAchievements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get achievements by category
  static async getByCategory(category) {
    return await prisma.achievement.findMany({
      where: {
        category,
        isActive: true,
      },
      include: {
        badgeReward: true,
        _count: {
          select: {
            userAchievements: true,
          },
        },
      },
    });
  }

  // Get most unlocked achievements
  static async getMostUnlocked(limit = 10) {
    return await prisma.achievement.findMany({
      where: { isActive: true },
      include: {
        badgeReward: true,
        _count: {
          select: {
            userAchievements: true,
          },
        },
      },
      orderBy: {
        userAchievements: {
          _count: 'desc',
        },
      },
      take: limit,
    });
  }

  // Get achievement statistics
  static async getStats() {
    const [totalAchievements, activeAchievements, totalUnlocks] = await Promise.all([
      prisma.achievement.count(),
      prisma.achievement.count({ where: { isActive: true } }),
      prisma.userAchievement.count(),
    ]);

    const categoryStats = await prisma.achievement.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
      where: { isActive: true },
    });

    return {
      totalAchievements,
      activeAchievements,
      totalUnlocks,
      categoryStats,
    };
  }

  // Check if user qualifies for achievement
  static async checkUserQualification(userId, achievementId) {
    const achievement = await prisma.achievement.findUnique({
      where: { id: parseInt(achievementId) },
    });

    if (!achievement) return false;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        userBadges: true,
        userActivities: true,
        userAchievements: true,
      },
    });

    if (!user) return false;

    // Check if user already has this achievement
    const hasAchievement = user.userAchievements.some(ua => ua.achievementId === parseInt(achievementId));
    if (hasAchievement) return false;

    // Check criteria based on achievement type
    switch (achievement.criteriaType) {
      case 'registration':
        return true; // Always true for registration achievements
      
      case 'activity_completion':
        return user.userActivities.length >= achievement.criteriaValue;
      
      case 'badge_count':
        return user.userBadges.length >= achievement.criteriaValue;
      
      case 'achievement_count':
        return user.userAchievements.length >= achievement.criteriaValue;
      
      case 'level_reached':
        return user.currentLevel >= achievement.criteriaValue;
      
      case 'experience_points':
        return user.experiencePoints >= achievement.criteriaValue;
      
      default:
        return false;
    }
  }

  // Get user's achievement progress
  static async getUserProgress(userId) {
    const [unlockedAchievements, totalAchievements] = await Promise.all([
      prisma.userAchievement.count({
        where: { userId: parseInt(userId) },
      }),
      prisma.achievement.count({
        where: { isActive: true },
      }),
    ]);

    const categoryProgress = await prisma.userAchievement.groupBy({
      by: ['achievement'],
      _count: {
        id: true,
      },
      where: { userId: parseInt(userId) },
      include: {
        achievement: {
          select: {
            category: true,
          },
        },
      },
    });

    return {
      unlockedAchievements,
      totalAchievements,
      unlockRate: totalAchievements > 0 ? (unlockedAchievements / totalAchievements) * 100 : 0,
      categoryProgress,
    };
  }
}

module.exports = Achievement; 