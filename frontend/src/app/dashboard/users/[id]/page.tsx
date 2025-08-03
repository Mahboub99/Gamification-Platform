'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Trophy, Award, TrendingUp, Calendar, User, Activity, Zap, Clock, Target, BarChart3 } from 'lucide-react';
import { formatNumber, formatDate } from '@/lib/utils';
import Navigation from '@/components/Navigation';

export default function UserProfilePage() {
  const params = useParams();
  const userId = parseInt(params.id as string);

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.users.getById(userId),
  });

  const { data: userBadges, isLoading: badgesLoading } = useQuery({
    queryKey: ['userBadges', userId],
    queryFn: () => api.badges.getUserBadges(userId),
  });

  const { data: userAchievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ['userAchievements', userId],
    queryFn: () => api.achievements.getUserAchievements(userId),
  });

  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['userStats', userId],
    queryFn: () => api.users.getStats(userId),
  });

  const { data: experienceHistory, isLoading: experienceLoading } = useQuery({
    queryKey: ['experienceHistory', userId],
    queryFn: () => api.users.getExperienceHistory(userId),
  });

  if (userLoading || badgesLoading || achievementsLoading || statsLoading || experienceLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const user = userData?.data?.data;
  const badges = userBadges?.data?.data?.badges || [];
  const achievements = userAchievements?.data?.data?.achievements || [];
  const stats = userStats?.data?.data?.stats;
  const experienceHistoryData = experienceHistory?.data?.data?.experience_history || [];

  console.log('User data:', user);
  console.log('Badges data:', userBadges);
  console.log('Achievements data:', userAchievements);
  console.log('Stats data:', stats);
  console.log('Experience history:', experienceHistoryData);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">User Not Found</h1>
          <p className="text-gray-600">The requested user could not be found.</p>
        </div>
      </div>
    );
  }

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'activity_completion':
        return <Activity className="h-4 w-4 text-green-600" />;
      case 'badge_award':
        return <Award className="h-4 w-4 text-purple-600" />;
      case 'achievement_unlock':
        return <Trophy className="h-4 w-4 text-yellow-600" />;
      case 'level_up':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      default:
        return <Zap className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityLabel = (activityType: string) => {
    switch (activityType) {
      case 'activity_completion':
        return 'Activity Completed';
      case 'badge_award':
        return 'Badge Awarded';
      case 'achievement_unlock':
        return 'Achievement Unlocked';
      case 'level_up':
        return 'Level Up';
      default:
        return 'Experience Gained';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user?.firstName?.[0] || user?.username[0]}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {user?.firstName && user?.lastName
                  ? `${user?.firstName} ${user?.lastName}`
                  : user?.username}
              </h1>
              <p className="text-gray-600">@{user?.username}</p>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                Level {user?.currentLevel}
              </div>
              <div className="text-sm text-gray-600">
                {formatNumber(user?.experiencePoints || 0)} XP
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Experience Points</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(user?.experiencePoints || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Current Level</p>
                  <p className="text-2xl font-bold text-gray-900">{user?.currentLevel || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Award className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Badges</p>
                  <p className="text-2xl font-bold text-gray-900">{user?.totalBadges || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <User className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Achievements</p>
                  <p className="text-2xl font-bold text-gray-900">{user?.totalAchievements || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Experience History Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Experience History</h2>
          {experienceHistoryData.length > 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {experienceHistoryData.map((event: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getActivityIcon(event.activity_type)}
                        <div>
                          <p className="font-medium text-gray-900">
                            {getActivityLabel(event.activity_type)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(event.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${event.experience_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {event.experience_change > 0 ? '+' : ''}{event.experience_change} XP
                        </p>
                        {event.new_level && (
                          <p className="text-sm text-blue-600">Level {event.new_level}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600">No experience history available.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Statistics */}
        {stats && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Statistics</h2>
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Award className="h-5 w-5 text-purple-600" />
                        <span className="text-gray-700 font-medium">Total Badges</span>
                      </div>
                      <span className="font-bold text-gray-900">{stats.total_badges || 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Trophy className="h-5 w-5 text-yellow-600" />
                        <span className="text-gray-700 font-medium">Total Achievements</span>
                      </div>
                      <span className="font-bold text-gray-900">{stats.total_achievements || 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Activity className="h-5 w-5 text-blue-600" />
                        <span className="text-gray-700 font-medium">Total Activities</span>
                      </div>
                      <span className="font-bold text-gray-900">{stats.total_activities || 0}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Zap className="h-5 w-5 text-orange-600" />
                        <span className="text-gray-700 font-medium">Experience Events</span>
                      </div>
                      <span className="font-bold text-gray-900">{stats.total_experience_events || 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <BarChart3 className="h-5 w-5 text-indigo-600" />
                        <span className="text-gray-700 font-medium">Total Experience Gained</span>
                      </div>
                      <span className="font-bold text-gray-900">{formatNumber(stats.total_experience_gained || 0)} XP</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Clock className="h-5 w-5 text-gray-600" />
                        <span className="text-gray-700 font-medium">Last Activity</span>
                      </div>
                      <span className="font-semibold text-gray-900 text-sm">
                        {stats.last_activity ? formatDate(stats.last_activity) : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <span className="text-gray-700 font-medium">Member Since</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {user.createdAt ? formatDate(user.createdAt) : 'Unknown'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Badges Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Badges Earned</h2>
          {badges.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {badges.map((badge: any) => (
                <Card key={badge.id}>
                  <CardContent className="p-6">
                    <Badge
                      name={badge.name}
                      description={badge.description}
                      imageUrl={badge.imageUrl}
                      rarity={badge.rarity}
                      experienceReward={badge.experienceReward}
                    />
                    <div className="mt-4 text-sm text-gray-600">
                      <p>Earned: {formatDate(badge.awardedAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600">No badges earned yet.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Achievements Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Achievements Unlocked</h2>
          {achievements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement: any) => (
                <Card key={achievement.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white">
                        <Trophy className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{achievement.name}</h3>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><strong>Type:</strong> {achievement.type}</p>
                      <p><strong>Unlocked:</strong> {formatDate(achievement.unlockedAt)}</p>
                      {achievement.experienceReward && (
                        <p><strong>Reward:</strong> +{achievement.experienceReward} XP</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600">No achievements unlocked yet.</p>
              </CardContent>
            </Card>
          )}
        </div>


      </div>
    </div>
  );
} 