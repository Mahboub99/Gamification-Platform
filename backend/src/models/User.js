const { prisma } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Create a new user
  static async create(userData) {
    const { password, ...userFields } = userData;
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    
    return await prisma.user.create({
      data: {
        ...userFields,
        passwordHash,
      },
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
        updatedAt: true,
      },
    });
  }

  // Find user by ID
  static async findById(id) {
    return await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        userBadges: {
          include: {
            badge: true,
          },
        },
        userActivities: {
          include: {
            activity: true,
          },
        },
        userAchievements: {
          include: {
            achievement: true,
          },
        },
      },
    });
  }

  // Find user by email
  static async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  // Find user by username
  static async findByUsername(username) {
    return await prisma.user.findUnique({
      where: { username },
    });
  }

  // Get all users with pagination and filters
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      isActive = null,
      isAdmin = null,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const where = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== null) {
      where.isActive = isActive;
    }

    if (isAdmin !== null) {
      where.isAdmin = isAdmin;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Update user
  static async update(id, updateData) {
    const { password, ...fields } = updateData;
    const data = { ...fields };

    if (password) {
      data.passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    }

    return await prisma.user.update({
      where: { id: parseInt(id) },
      data,
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
        updatedAt: true,
      },
    });
  }

  // Update last login
  static async updateLastLogin(id) {
    return await prisma.user.update({
      where: { id: parseInt(id) },
      data: { lastLogin: new Date() },
    });
  }

  // Update user stats
  static async updateStats(id, stats) {
    return await prisma.user.update({
      where: { id: parseInt(id) },
      data: stats,
    });
  }

  // Add experience points
  static async addExperience(id, experiencePoints) {
    return await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        experiencePoints: {
          increment: experiencePoints,
        },
      },
    });
  }

  // Deactivate user
  static async deactivate(id) {
    return await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });
  }

  // Get user statistics
  static async getStats(id) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        userBadges: {
          include: {
            badge: true,
          },
        },
        userActivities: {
          include: {
            activity: true,
          },
        },
        userAchievements: {
          include: {
            achievement: true,
          },
        },
        experienceLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) return null;

    const totalExperience = user.experienceLogs.reduce((sum, log) => sum + log.experienceChange, 0);
    const uniqueBadges = user.userBadges.length;
    const uniqueAchievements = user.userAchievements.length;
    const completedActivities = user.userActivities.length;

    return {
      user,
      stats: {
        totalExperience,
        uniqueBadges,
        uniqueAchievements,
        completedActivities,
        averageExperiencePerActivity: completedActivities > 0 ? totalExperience / completedActivities : 0,
      },
    };
  }

  // Verify password
  static async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.passwordHash);
  }

  // Get top users by experience
  static async getTopByExperience(limit = 10) {
    return await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { experiencePoints: 'desc' },
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

  // Get user's rank in leaderboard
  static async getUserRank(userId) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { experiencePoints: true },
    });

    if (!user) return null;

    const rank = await prisma.user.count({
      where: {
        experiencePoints: { gt: user.experiencePoints },
        isActive: true,
      },
    });

    return rank + 1;
  }
}

module.exports = User; 