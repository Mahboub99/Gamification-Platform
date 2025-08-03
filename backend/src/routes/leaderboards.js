const express = require('express');
const { prisma } = require('../config/database');

const router = express.Router();

/**
 * @swagger
 * /api/leaderboards/experience:
 *   get:
 *     summary: Get experience leaderboard
 *     tags: [Leaderboards]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of top players to return
 *     responses:
 *       200:
 *         description: Experience leaderboard
 */
router.get('/experience', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        experiencePoints: true,
        currentLevel: true,
        totalBadges: true,
        totalAchievements: true
      },
      orderBy: { experiencePoints: 'desc' },
      take: parseInt(limit)
    });

    const leaderboard = users.map((user, index) => ({
      id: user.id,
      username: user.username,
      first_name: user.firstName,
      last_name: user.lastName,
      avatar_url: user.avatarUrl,
      // Experience-specific fields
      experience_points: user.experiencePoints,
      current_level: user.currentLevel,
      level_progress: calculateLevelProgress(user.experiencePoints, user.currentLevel),
      xp_to_next_level: calculateXPToNextLevel(user.experiencePoints, user.currentLevel),
      rank: index + 1
    }));

    res.json({
      success: true,
      data: {
        type: 'experience',
        title: 'Experience Leaders',
        description: 'Top players by total experience points',
        leaderboard,
        metadata: {
          total_players: await prisma.user.count({ where: { isActive: true } }),
          average_xp: await calculateAverageXP(),
          top_xp: users.length > 0 ? users[0].experiencePoints : 0
        }
      }
    });
  } catch (error) {
    console.error('Get experience leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving experience leaderboard'
    });
  }
});

// Helper functions for experience calculations
function calculateLevelProgress(xp, level) {
  const xpForCurrentLevel = getXPForLevel(level);
  const xpForNextLevel = getXPForLevel(level + 1);
  const xpInCurrentLevel = xp - xpForCurrentLevel;
  const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
  return Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));
}

function calculateXPToNextLevel(xp, level) {
  const xpForNextLevel = getXPForLevel(level + 1);
  return Math.max(0, xpForNextLevel - xp);
}

function getXPForLevel(level) {
  if (level <= 1) return 0;
  if (level <= 2) return 100;
  if (level <= 3) return 250;
  if (level <= 4) return 500;
  if (level <= 5) return 1000;
  if (level <= 6) return 2000;
  if (level <= 7) return 3500;
  if (level <= 8) return 5000;
  if (level <= 9) return 7000;
  if (level <= 10) return 10000;
  return (level - 1) * 1000;
}

async function calculateAverageXP() {
  const result = await prisma.user.aggregate({
    where: { isActive: true },
    _avg: { experiencePoints: true }
  });
  return Math.round(result._avg.experiencePoints || 0);
}

/**
 * @swagger
 * /api/leaderboards/badges:
 *   get:
 *     summary: Get badge count leaderboard
 *     tags: [Leaderboards]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of top players to return
 *     responses:
 *       200:
 *         description: Badge count leaderboard
 */
router.get('/badges', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get users with their badge details
    const users = await prisma.user.findMany({
      where: { isActive: true },
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
        userBadges: {
          include: {
            badge: {
              select: {
                name: true,
                rarity: true,
                experienceReward: true
              }
            }
          }
        }
      },
      orderBy: [
        { totalBadges: 'desc' },
        { experiencePoints: 'desc' }
      ],
      take: parseInt(limit)
    });

    const leaderboard = users.map((user, index) => {
      // Calculate badge statistics
      const badgeStats = calculateBadgeStats(user.userBadges);
      
      return {
        id: user.id,
        username: user.username,
        first_name: user.firstName,
        last_name: user.lastName,
        avatar_url: user.avatarUrl,
        // Badge-specific fields
        total_badges: user.totalBadges,
        badge_rarity_breakdown: badgeStats.rarityBreakdown,
        rare_badges_count: badgeStats.rareCount,
        epic_badges_count: badgeStats.epicCount,
        legendary_badges_count: badgeStats.legendaryCount,
        total_badge_xp: badgeStats.totalXP,
        rank: index + 1
      };
    });

    res.json({
      success: true,
      data: {
        type: 'badges',
        title: 'Badge Collectors',
        description: 'Top players by number of badges collected',
        leaderboard,
        metadata: {
          total_players: await prisma.user.count({ where: { isActive: true } }),
          average_badges: await calculateAverageBadges(),
          total_badges_awarded: await prisma.userBadge.count(),
          badge_types_available: await prisma.badge.count({ where: { isActive: true } })
        }
      }
    });
  } catch (error) {
    console.error('Get badge leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving badge leaderboard'
    });
  }
});

// Helper function to calculate badge statistics
function calculateBadgeStats(userBadges) {
  const rarityBreakdown = { common: 0, rare: 0, epic: 0, legendary: 0 };
  let totalXP = 0;
  let rareCount = 0, epicCount = 0, legendaryCount = 0;

  userBadges.forEach(userBadge => {
    const badge = userBadge.badge;
    if (badge) {
      rarityBreakdown[badge.rarity]++;
      totalXP += badge.experienceReward || 0;
      
      if (badge.rarity === 'rare') rareCount++;
      else if (badge.rarity === 'epic') epicCount++;
      else if (badge.rarity === 'legendary') legendaryCount++;
    }
  });

  return {
    rarityBreakdown,
    totalXP,
    rareCount,
    epicCount,
    legendaryCount
  };
}

async function calculateAverageBadges() {
  const result = await prisma.user.aggregate({
    where: { isActive: true },
    _avg: { totalBadges: true }
  });
  return Math.round(result._avg.totalBadges || 0);
}

/**
 * @swagger
 * /api/leaderboards/achievements:
 *   get:
 *     summary: Get achievement count leaderboard
 *     tags: [Leaderboards]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of top players to return
 *     responses:
 *       200:
 *         description: Achievement count leaderboard
 */
router.get('/achievements', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get users with their achievement details
    const users = await prisma.user.findMany({
      where: { isActive: true },
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
        userAchievements: {
          include: {
            achievement: {
              select: {
                name: true,
                category: true,
                experienceReward: true
              }
            }
          }
        }
      },
      orderBy: [
        { totalAchievements: 'desc' },
        { experiencePoints: 'desc' }
      ],
      take: parseInt(limit)
    });

    const leaderboard = users.map((user, index) => {
      // Calculate achievement statistics
      const achievementStats = calculateAchievementStats(user.userAchievements);
      
      return {
        id: user.id,
        username: user.username,
        first_name: user.firstName,
        last_name: user.lastName,
        avatar_url: user.avatarUrl,
        // Achievement-specific fields
        total_achievements: user.totalAchievements,
        achievement_category_breakdown: achievementStats.categoryBreakdown,
        total_achievement_xp: achievementStats.totalXP,
        average_achievement_xp: achievementStats.averageXP,
        completion_rate: achievementStats.completionRate,
        rank: index + 1
      };
    });

    res.json({
      success: true,
      data: {
        type: 'achievements',
        title: 'Achievement Hunters',
        description: 'Top players by number of achievements unlocked',
        leaderboard,
        metadata: {
          total_players: await prisma.user.count({ where: { isActive: true } }),
          average_achievements: await calculateAverageAchievements(),
          total_achievements_unlocked: await prisma.userAchievement.count(),
          achievements_available: await prisma.achievement.count({ where: { isActive: true } })
        }
      }
    });
  } catch (error) {
    console.error('Get achievement leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving achievement leaderboard'
    });
  }
});

// Helper function to calculate achievement statistics
function calculateAchievementStats(userAchievements) {
  const categoryBreakdown = {};
  let totalXP = 0;
  let totalAchievements = userAchievements.length;

  userAchievements.forEach(userAchievement => {
    const achievement = userAchievement.achievement;
    if (achievement) {
      categoryBreakdown[achievement.category] = (categoryBreakdown[achievement.category] || 0) + 1;
      totalXP += achievement.experienceReward || 0;
    }
  });

  return {
    totalXP,
    averageXP: totalAchievements > 0 ? Math.round(totalXP / totalAchievements) : 0,
    categoryBreakdown,
    completionRate: totalAchievements > 0 ? (totalAchievements / 50) * 100 : 0 // Assuming 50 total achievements
  };
}

async function calculateAverageAchievements() {
  const result = await prisma.user.aggregate({
    where: { isActive: true },
    _avg: { totalAchievements: true }
  });
  return Math.round(result._avg.totalAchievements || 0);
}

/**
 * @swagger
 * /api/leaderboards/levels:
 *   get:
 *     summary: Get level leaderboard
 *     tags: [Leaderboards]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of top players to return
 *     responses:
 *       200:
 *         description: Level leaderboard
 */
router.get('/levels', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        experiencePoints: true,
        currentLevel: true,
        totalBadges: true,
        totalAchievements: true
      },
      orderBy: [
        { currentLevel: 'desc' },
        { experiencePoints: 'desc' }
      ],
      take: parseInt(limit)
    });

    const leaderboard = users.map((user, index) => ({
      id: user.id,
      username: user.username,
      first_name: user.firstName,
      last_name: user.lastName,
      avatar_url: user.avatarUrl,
      // Level-specific fields
      current_level: user.currentLevel,
      experience_points: user.experiencePoints,
      level_progress: calculateLevelProgress(user.experiencePoints, user.currentLevel),
      xp_to_next_level: calculateXPToNextLevel(user.experiencePoints, user.currentLevel),
      level_title: getLevelTitle(user.currentLevel),
      level_description: getLevelDescription(user.currentLevel),
      rank: index + 1
    }));

    res.json({
      success: true,
      data: {
        type: 'levels',
        title: 'Level Champions',
        description: 'Top players by current level',
        leaderboard,
        metadata: {
          total_players: await prisma.user.count({ where: { isActive: true } }),
          average_level: await calculateAverageLevel(),
          max_level: users.length > 0 ? users[0].currentLevel : 1,
          levels_available: await prisma.level.count()
        }
      }
    });
  } catch (error) {
    console.error('Get level leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving level leaderboard'
    });
  }
});

// Helper functions for level calculations
function getLevelTitle(level) {
  const titles = {
    1: 'Novice',
    2: 'Apprentice',
    3: 'Explorer',
    4: 'Adventurer',
    5: 'Veteran',
    6: 'Expert',
    7: 'Master',
    8: 'Grandmaster',
    9: 'Legend',
    10: 'Mythic'
  };
  return titles[level] || `Level ${level}`;
}

function getLevelDescription(level) {
  const descriptions = {
    1: 'Just getting started on your journey',
    2: 'Learning the ropes and gaining experience',
    3: 'Exploring the platform and discovering features',
    4: 'Becoming an active member of the community',
    5: 'A seasoned user with significant experience',
    6: 'Demonstrating expertise in various areas',
    7: 'Achieving mastery in multiple domains',
    8: 'Reaching the highest levels of achievement',
    9: 'Becoming a legend in the community',
    10: 'Transcending to mythical status'
  };
  return descriptions[level] || `Level ${level} achievement`;
}

async function calculateAverageLevel() {
  const result = await prisma.user.aggregate({
    where: { isActive: true },
    _avg: { currentLevel: true }
  });
  return Math.round(result._avg.currentLevel || 1);
}

/**
 * @swagger
 * /api/leaderboards/activity:
 *   get:
 *     summary: Get activity completion leaderboard
 *     tags: [Leaderboards]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of top players to return
 *     responses:
 *       200:
 *         description: Activity completion leaderboard
 */
router.get('/activity', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get users with their activity completion counts
    const usersWithActivities = await prisma.user.findMany({
      where: { isActive: true },
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
        userActivities: {
          select: {
            id: true
          }
        }
      },
      orderBy: { experiencePoints: 'desc' },
      take: parseInt(limit)
    });

    const leaderboard = usersWithActivities.map((user, index) => ({
      id: user.id,
      username: user.username,
      first_name: user.firstName,
      last_name: user.lastName,
      avatar_url: user.avatarUrl,
      experience_points: user.experiencePoints,
      current_level: user.currentLevel,
      total_badges: user.totalBadges,
      total_achievements: user.totalAchievements,
      activities_completed: user.userActivities.length,
      rank: index + 1
    }));

    res.json({
      success: true,
      data: {
        type: 'activity',
        title: 'Activity Masters',
        description: 'Top players by number of activities completed',
        leaderboard,
        metadata: {
          total_players: await prisma.user.count({ where: { isActive: true } }),
          total_activities_completed: await prisma.userActivity.count(),
          activities_available: await prisma.activity.count({ where: { isActive: true } })
        }
      }
    });
  } catch (error) {
    console.error('Get activity leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving activity leaderboard'
    });
  }
});

// Helper function to calculate activity statistics
function calculateActivityStats(userActivities) {
  const categoryBreakdown = {};
  let totalXP = 0;
  let totalActivities = userActivities.length;

  userActivities.forEach(userActivity => {
    const activity = userActivity.activity;
    if (activity) {
      categoryBreakdown[activity.category] = (categoryBreakdown[activity.category] || 0) + 1;
      totalXP += activity.experienceReward || 0;
    }
  });

  return {
    totalXP,
    averageXP: totalActivities > 0 ? Math.round(totalXP / totalActivities) : 0,
    categoryBreakdown,
    completionRate: totalActivities > 0 ? (totalActivities / 100) * 100 : 0 // Assuming 100 total activities
  };
}

async function calculateAverageActivities() {
  const result = await prisma.user.aggregate({
    where: { isActive: true },
    _avg: { totalActivities: true }
  });
  return Math.round(result._avg.totalActivities || 0);
}

/**
 * @swagger
 * /api/leaderboards/user/{userId}/position:
 *   get:
 *     summary: Get user's position in various leaderboards
 *     tags: [Leaderboards]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User's positions in leaderboards
 *       404:
 *         description: User not found
 */
router.get('/user/:userId/position', async (req, res) => {
  try {
    console.log('Starting user position calculation for userId:', req.params.userId);
    const { userId } = req.params;

    // Check if user exists and get their stats
    console.log('Fetching user data...');
    const user = await prisma.user.findFirst({
      where: { 
        id: parseInt(userId),
        isActive: true
      },
      select: {
        id: true,
        username: true,
        experiencePoints: true,
        totalBadges: true,
        totalAchievements: true,
        currentLevel: true
      }
    });

    console.log('User data:', user);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's activity count
    console.log('Fetching user activity count...');
    const userActivityCount = await prisma.userActivity.count({
      where: { userId: parseInt(userId) }
    });
    console.log('User activity count:', userActivityCount);

    // Calculate positions by counting users with better stats
    console.log('Calculating experience position...');
    const experiencePosition = await prisma.user.count({
      where: {
        experiencePoints: { gt: user.experiencePoints },
        isActive: true
      }
    });
    console.log('Experience position:', experiencePosition);

    console.log('Calculating badge position...');
    const badgePosition = await prisma.user.count({
      where: {
        totalBadges: { gt: user.totalBadges },
        isActive: true
      }
    });
    console.log('Badge position:', badgePosition);

    console.log('Calculating achievement position...');
    const achievementPosition = await prisma.user.count({
      where: {
        totalAchievements: { gt: user.totalAchievements },
        isActive: true
      }
    });
    console.log('Achievement position:', achievementPosition);

    console.log('Calculating level position...');
    const levelPosition = await prisma.user.count({
      where: {
        currentLevel: { gt: user.currentLevel },
        isActive: true
      }
    });
    console.log('Level position:', levelPosition);

    // For activity position, we need to get all users with their activity counts
    console.log('Fetching all users with activities...');
    const allUsersWithActivities = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        userActivities: {
          select: { id: true }
        }
      }
    });
    console.log('All users with activities count:', allUsersWithActivities.length);

    // Calculate how many users have more activities than this user
    const usersWithMoreActivities = allUsersWithActivities.filter(
      u => u.userActivities.length > userActivityCount
    ).length;
    console.log('Users with more activities:', usersWithMoreActivities);

    const result = {
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username
        },
        positions: {
          experience: experiencePosition + 1,
          badges: badgePosition + 1,
          achievements: achievementPosition + 1,
          levels: levelPosition + 1,
          activity: usersWithMoreActivities + 1
        }
      }
    };

    console.log('Final result:', result);
    res.json(result);
  } catch (error) {
    console.error('Get user position error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving user position'
    });
  }
});

module.exports = router; 