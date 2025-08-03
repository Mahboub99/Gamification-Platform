const { prisma } = require('../config/database');

class Badge {
  // Create a new badge
  static async create(badgeData) {
    return await prisma.badge.create({
      data: badgeData,
    });
  }

  // Find badge by ID
  static async findById(id) {
    return await prisma.badge.findUnique({
      where: { id: parseInt(id) },
      include: {
        userBadges: {
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
      },
    });
  }

  // Find badge by name
  static async findByName(name) {
    return await prisma.badge.findUnique({
      where: { name },
    });
  }

  // Get all badges with pagination and filters
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      rarity = '',
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

    if (rarity) {
      where.rarity = rarity;
    }

    if (isActive !== null) {
      where.isActive = isActive;
    }

    const [badges, total] = await Promise.all([
      prisma.badge.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              userBadges: true,
            },
          },
        },
      }),
      prisma.badge.count({ where }),
    ]);

    return {
      badges,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Update badge
  static async update(id, updateData) {
    return await prisma.badge.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
  }

  // Delete badge
  static async delete(id) {
    return await prisma.badge.delete({
      where: { id: parseInt(id) },
    });
  }

  // Award badge to user
  static async awardToUser(badgeId, userId, awardedBy = null) {
    const badge = await prisma.badge.findUnique({
      where: { id: parseInt(badgeId) },
    });

    if (!badge) {
      throw new Error('Badge not found');
    }

    // Check if user already has this badge
    const existingUserBadge = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId: parseInt(userId),
          badgeId: parseInt(badgeId),
        },
      },
    });

    if (existingUserBadge) {
      throw new Error('User already has this badge');
    }

    // Award the badge
    const userBadge = await prisma.userBadge.create({
      data: {
        userId: parseInt(userId),
        badgeId: parseInt(badgeId),
        awardedBy: awardedBy ? parseInt(awardedBy) : null,
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
        badge: true,
      },
    });

    // Update user's total badges count
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        totalBadges: {
          increment: 1,
        },
      },
    });

    return userBadge;
  }

  // Get badges for a specific user
  static async getUserBadges(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      rarity = '',
      sortBy = 'awardedAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const where = {
      userId: parseInt(userId),
    };

    if (rarity) {
      where.badge = {
        rarity,
      };
    }

    const [userBadges, total] = await Promise.all([
      prisma.userBadge.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          badge: true,
          awarder: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.userBadge.count({ where }),
    ]);

    return {
      userBadges,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get badges by rarity
  static async getByRarity(rarity) {
    return await prisma.badge.findMany({
      where: {
        rarity,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            userBadges: true,
          },
        },
      },
    });
  }

  // Get most awarded badges
  static async getMostAwarded(limit = 10) {
    return await prisma.badge.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            userBadges: true,
          },
        },
      },
      orderBy: {
        userBadges: {
          _count: 'desc',
        },
      },
      take: limit,
    });
  }

  // Get badges that match criteria
  static async getByCriteria(criteriaType, criteriaValue) {
    return await prisma.badge.findMany({
      where: {
        criteriaType,
        criteriaValue: {
          lte: criteriaValue,
        },
        isActive: true,
      },
    });
  }

  // Get badge statistics
  static async getStats() {
    const [totalBadges, activeBadges, totalAwards] = await Promise.all([
      prisma.badge.count(),
      prisma.badge.count({ where: { isActive: true } }),
      prisma.userBadge.count(),
    ]);

    const rarityStats = await prisma.badge.groupBy({
      by: ['rarity'],
      _count: {
        id: true,
      },
      where: { isActive: true },
    });

    return {
      totalBadges,
      activeBadges,
      totalAwards,
      rarityStats,
    };
  }

  // Check if user qualifies for badge
  static async checkUserQualification(userId, badgeId) {
    const badge = await prisma.badge.findUnique({
      where: { id: parseInt(badgeId) },
    });

    if (!badge) return false;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        userBadges: true,
        userActivities: true,
        userAchievements: true,
      },
    });

    if (!user) return false;

    // Check if user already has this badge
    const hasBadge = user.userBadges.some(ub => ub.badgeId === parseInt(badgeId));
    if (hasBadge) return false;

    // Check criteria based on badge type
    switch (badge.criteriaType) {
      case 'activity_completion':
        return user.userActivities.length >= badge.criteriaValue;
      
      case 'badge_count':
        return user.userBadges.length >= badge.criteriaValue;
      
      case 'achievement_count':
        return user.userAchievements.length >= badge.criteriaValue;
      
      case 'level_reached':
        return user.currentLevel >= badge.criteriaValue;
      
      case 'experience_points':
        return user.experiencePoints >= badge.criteriaValue;
      
      default:
        return false;
    }
  }
}

module.exports = Badge; 