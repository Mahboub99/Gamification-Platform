const { prisma } = require('../config/database');

class Activity {
  // Create a new activity
  static async create(activityData) {
    return await prisma.activity.create({
      data: activityData,
    });
  }

  // Find activity by ID
  static async findById(id) {
    return await prisma.activity.findUnique({
      where: { id: parseInt(id) },
      include: {
        userActivities: {
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

  // Find activity by name
  static async findByName(name) {
    return await prisma.activity.findUnique({
      where: { name },
    });
  }

  // Get all activities with pagination and filters
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      isActive = null,
      isRepeatable = null,
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

    if (isRepeatable !== null) {
      where.isRepeatable = isRepeatable;
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          badgeReward: true,
          _count: {
            select: {
              userActivities: true,
            },
          },
        },
      }),
      prisma.activity.count({ where }),
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Update activity
  static async update(id, updateData) {
    return await prisma.activity.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
  }

  // Delete activity
  static async delete(id) {
    return await prisma.activity.delete({
      where: { id: parseInt(id) },
    });
  }

  // Complete activity for user
  static async completeForUser(activityId, userId) {
    const activity = await prisma.activity.findUnique({
      where: { id: parseInt(activityId) },
    });

    if (!activity) {
      throw new Error('Activity not found');
    }

    if (!activity.isActive) {
      throw new Error('Activity is not active');
    }

    // Check if user has already completed this activity (if not repeatable)
    if (!activity.isRepeatable) {
      const existingCompletion = await prisma.userActivity.findUnique({
        where: {
          userId_activityId: {
            userId: parseInt(userId),
            activityId: parseInt(activityId),
          },
        },
      });

      if (existingCompletion) {
        throw new Error('Activity already completed');
      }
    }

    // Complete the activity
    const userActivity = await prisma.userActivity.create({
      data: {
        userId: parseInt(userId),
        activityId: parseInt(activityId),
        experienceGained: activity.experienceReward,
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
        activity: true,
      },
    });

    // Add experience to user
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        experiencePoints: {
          increment: activity.experienceReward,
        },
      },
    });

    // Log experience change
    await prisma.experienceLog.create({
      data: {
        userId: parseInt(userId),
        activityType: 'activity_completion',
        activityId: parseInt(activityId),
        experienceChange: activity.experienceReward,
      },
    });

    return userActivity;
  }

  // Get activities for a specific user
  static async getUserActivities(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      category = '',
      completed = null,
      sortBy = 'completedAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const where = {
      userId: parseInt(userId),
    };

    if (category) {
      where.activity = {
        category,
      };
    }

    if (completed !== null) {
      if (completed) {
        // Get completed activities
        const [userActivities, total] = await Promise.all([
          prisma.userActivity.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
              activity: {
                include: {
                  badgeReward: true,
                },
              },
            },
          }),
          prisma.userActivity.count({ where }),
        ]);

        return {
          userActivities,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      } else {
        // Get available activities (not completed)
        const completedActivityIds = await prisma.userActivity.findMany({
          where: { userId: parseInt(userId) },
          select: { activityId: true },
        });

        const completedIds = completedActivityIds.map(ua => ua.activityId);

        const [activities, total] = await Promise.all([
          prisma.activity.findMany({
            where: {
              id: { notIn: completedIds },
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
          prisma.activity.count({
            where: {
              id: { notIn: completedIds },
              isActive: true,
              ...(category && { category }),
            },
          }),
        ]);

        return {
          activities,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      }
    }

    // Get all user activities
    const [userActivities, total] = await Promise.all([
      prisma.userActivity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          activity: {
            include: {
              badgeReward: true,
            },
          },
        },
      }),
      prisma.userActivity.count({ where }),
    ]);

    return {
      userActivities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get activities by category
  static async getByCategory(category) {
    return await prisma.activity.findMany({
      where: {
        category,
        isActive: true,
      },
      include: {
        badgeReward: true,
        _count: {
          select: {
            userActivities: true,
          },
        },
      },
    });
  }

  // Get most popular activities
  static async getMostPopular(limit = 10) {
    return await prisma.activity.findMany({
      where: { isActive: true },
      include: {
        badgeReward: true,
        _count: {
          select: {
            userActivities: true,
          },
        },
      },
      orderBy: {
        userActivities: {
          _count: 'desc',
        },
      },
      take: limit,
    });
  }

  // Get activity statistics
  static async getStats() {
    const [totalActivities, activeActivities, totalCompletions] = await Promise.all([
      prisma.activity.count(),
      prisma.activity.count({ where: { isActive: true } }),
      prisma.userActivity.count(),
    ]);

    const categoryStats = await prisma.activity.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
      where: { isActive: true },
    });

    const repeatableStats = await prisma.activity.groupBy({
      by: ['isRepeatable'],
      _count: {
        id: true,
      },
      where: { isActive: true },
    });

    return {
      totalActivities,
      activeActivities,
      totalCompletions,
      categoryStats,
      repeatableStats,
    };
  }

  // Get user's activity progress
  static async getUserProgress(userId) {
    const [completedActivities, totalActivities] = await Promise.all([
      prisma.userActivity.count({
        where: { userId: parseInt(userId) },
      }),
      prisma.activity.count({
        where: { isActive: true },
      }),
    ]);

    const categoryProgress = await prisma.userActivity.groupBy({
      by: ['activity'],
      _count: {
        id: true,
      },
      where: { userId: parseInt(userId) },
      include: {
        activity: {
          select: {
            category: true,
          },
        },
      },
    });

    return {
      completedActivities,
      totalActivities,
      completionRate: totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0,
      categoryProgress,
    };
  }
}

module.exports = Activity; 