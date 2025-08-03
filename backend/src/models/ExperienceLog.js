const { prisma } = require('../config/database');

class ExperienceLog {
  // Create a new experience log entry
  static async create(logData) {
    return await prisma.experienceLog.create({
      data: logData,
    });
  }

  // Find experience log by ID
  static async findById(id) {
    return await prisma.experienceLog.findUnique({
      where: { id: parseInt(id) },
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
    });
  }

  // Get experience logs for a specific user
  static async getUserLogs(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      activityType = '',
      startDate = null,
      endDate = null,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const where = {
      userId: parseInt(userId),
    };

    if (activityType) {
      where.activityType = activityType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.experienceLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
      }),
      prisma.experienceLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get all experience logs with pagination and filters
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      userId = null,
      activityType = '',
      startDate = null,
      endDate = null,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const where = {};

    if (userId) {
      where.userId = parseInt(userId);
    }

    if (activityType) {
      where.activityType = activityType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.experienceLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
      }),
      prisma.experienceLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get user's total experience gained
  static async getUserTotalExperience(userId) {
    const result = await prisma.experienceLog.aggregate({
      where: {
        userId: parseInt(userId),
        experienceChange: {
          gt: 0,
        },
      },
      _sum: {
        experienceChange: true,
      },
    });

    return result._sum.experienceChange || 0;
  }

  // Get user's experience gained in a date range
  static async getUserExperienceInRange(userId, startDate, endDate) {
    const result = await prisma.experienceLog.aggregate({
      where: {
        userId: parseInt(userId),
        experienceChange: {
          gt: 0,
        },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      _sum: {
        experienceChange: true,
      },
    });

    return result._sum.experienceChange || 0;
  }

  // Get experience statistics for a user
  static async getUserExperienceStats(userId) {
    const [totalExperience, positiveExperience, negativeExperience, logCount] = await Promise.all([
      prisma.experienceLog.aggregate({
        where: { userId: parseInt(userId) },
        _sum: { experienceChange: true },
      }),
      prisma.experienceLog.aggregate({
        where: {
          userId: parseInt(userId),
          experienceChange: { gt: 0 },
        },
        _sum: { experienceChange: true },
      }),
      prisma.experienceLog.aggregate({
        where: {
          userId: parseInt(userId),
          experienceChange: { lt: 0 },
        },
        _sum: { experienceChange: true },
      }),
      prisma.experienceLog.count({
        where: { userId: parseInt(userId) },
      }),
    ]);

    const activityTypeStats = await prisma.experienceLog.groupBy({
      by: ['activityType'],
      where: { userId: parseInt(userId) },
      _sum: {
        experienceChange: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalExperience: totalExperience._sum.experienceChange || 0,
      positiveExperience: positiveExperience._sum.experienceChange || 0,
      negativeExperience: negativeExperience._sum.experienceChange || 0,
      logCount,
      activityTypeStats,
    };
  }

  // Get experience gained by activity type
  static async getExperienceByActivityType(userId) {
    return await prisma.experienceLog.groupBy({
      by: ['activityType'],
      where: {
        userId: parseInt(userId),
        experienceChange: { gt: 0 },
      },
      _sum: {
        experienceChange: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          experienceChange: 'desc',
        },
      },
    });
  }

  // Get recent experience gains
  static async getRecentExperienceGains(userId, limit = 10) {
    return await prisma.experienceLog.findMany({
      where: {
        userId: parseInt(userId),
        experienceChange: { gt: 0 },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
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
    });
  }

  // Get experience logs with level changes
  static async getLevelChangeLogs(userId) {
    return await prisma.experienceLog.findMany({
      where: {
        userId: parseInt(userId),
        OR: [
          { previousLevel: { not: null } },
          { newLevel: { not: null } },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
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
    });
  }

  // Get experience trends over time
  static async getExperienceTrends(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await prisma.experienceLog.groupBy({
      by: ['createdAt'],
      where: {
        userId: parseInt(userId),
        createdAt: {
          gte: startDate,
        },
      },
      _sum: {
        experienceChange: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // Get global experience statistics
  static async getGlobalExperienceStats() {
    const [totalExperience, totalLogs, averageExperiencePerLog] = await Promise.all([
      prisma.experienceLog.aggregate({
        _sum: { experienceChange: true },
      }),
      prisma.experienceLog.count(),
      prisma.experienceLog.aggregate({
        _avg: { experienceChange: true },
      }),
    ]);

    const activityTypeStats = await prisma.experienceLog.groupBy({
      by: ['activityType'],
      _sum: {
        experienceChange: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          experienceChange: 'desc',
        },
      },
    });

    return {
      totalExperience: totalExperience._sum.experienceChange || 0,
      totalLogs,
      averageExperiencePerLog: averageExperiencePerLog._avg.experienceChange || 0,
      activityTypeStats,
    };
  }

  // Get top experience gainers
  static async getTopExperienceGainers(limit = 10, timeRange = null) {
    const where = {
      experienceChange: { gt: 0 },
    };

    if (timeRange) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);
      where.createdAt = {
        gte: startDate,
      };
    }

    const topGainers = await prisma.experienceLog.groupBy({
      by: ['userId'],
      where,
      _sum: {
        experienceChange: true,
      },
      orderBy: {
        _sum: {
          experienceChange: 'desc',
        },
      },
      take: limit,
    });

    // Get user details for top gainers
    const topGainersWithDetails = await Promise.all(
      topGainers.map(async (gainer) => {
        const user = await prisma.user.findUnique({
          where: { id: gainer.userId },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            experiencePoints: true,
            currentLevel: true,
          },
        });

        return {
          user,
          totalExperienceGained: gainer._sum.experienceChange,
        };
      })
    );

    return topGainersWithDetails;
  }

  // Delete experience logs for a user
  static async deleteUserLogs(userId) {
    return await prisma.experienceLog.deleteMany({
      where: { userId: parseInt(userId) },
    });
  }

  // Delete experience logs older than a certain date
  static async deleteOldLogs(beforeDate) {
    return await prisma.experienceLog.deleteMany({
      where: {
        createdAt: {
          lt: new Date(beforeDate),
        },
      },
    });
  }
}

module.exports = ExperienceLog; 