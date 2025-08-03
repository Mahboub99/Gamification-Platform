'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Trophy, Medal, Award, TrendingUp, Users } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import Navigation from '@/components/Navigation';

type LeaderboardType = 'levels' | 'experience' | 'badges' | 'achievements' | 'activity';

const leaderboardConfig = {
  levels: {
    title: 'Level Leaderboard',
    icon: Trophy,
    description: 'Top users by level',
  },
  experience: {
    title: 'Experience Leaderboard',
    icon: TrendingUp,
    description: 'Top users by experience points',
  },
  badges: {
    title: 'Badge Leaderboard',
    icon: Award,
    description: 'Top users by badges earned',
  },
  achievements: {
    title: 'Achievement Leaderboard',
    icon: Medal,
    description: 'Top users by achievements unlocked',
  },
  activity: {
    title: 'Activity Leaderboard',
    icon: Users,
    description: 'Top users by activity completion',
  },
};

export default function LeaderboardsPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('levels');

  const { data: leaderboardData, isLoading, error } = useQuery({
    queryKey: ['leaderboard', activeTab],
    queryFn: async () => {
      console.log('Calling API for:', activeTab);
      const result = await (() => {
        switch (activeTab) {
          case 'levels':
            return api.leaderboards.getLevels();
          case 'experience':
            return api.leaderboards.getExperience();
          case 'badges':
            return api.leaderboards.getBadges();
          case 'achievements':
            return api.leaderboards.getAchievements();
          case 'activity':
            return api.leaderboards.getActivity();
          default:
            return api.leaderboards.getLevels();
        }
      })();
      console.log('API response:', result);
      return result;
    },
  });

  // Debug logging
  console.log('Leaderboard data:', leaderboardData);
  console.log('Active tab:', activeTab);
  console.log('Data structure:', leaderboardData?.data);
  console.log('Nested data structure:', leaderboardData?.data?.data);
  console.log('Leaderboard array:', leaderboardData?.data?.data?.leaderboard);
  console.log('Leaderboard length:', leaderboardData?.data?.data?.leaderboard?.length);
  console.log('Error:', error);
  console.log('Is loading:', isLoading);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getValueByType = (user: any, type: LeaderboardType) => {
    switch (type) {
      case 'levels':
        return user.current_level;
      case 'experience':
        return formatNumber(user.experience_points);
      case 'badges':
        return user.total_badges || 0;
      case 'achievements':
        return user.total_achievements || 0;
      case 'activity':
        return user.activities_completed || 0;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leaderboards</h1>
          <p className="text-gray-600">See how you rank against other users</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 mb-8">
          {Object.entries(leaderboardConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as LeaderboardType)}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <config.icon className="h-4 w-4 mr-2" />
              {config.title}
            </button>
          ))}
        </div>

        {/* Leaderboard Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {(() => {
                const IconComponent = leaderboardConfig[activeTab].icon;
                return <IconComponent className="h-6 w-6 mr-2" />;
              })()}
              {leaderboardConfig[activeTab].title}
            </CardTitle>
            <p className="text-gray-600">{leaderboardConfig[activeTab].description}</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">Error loading leaderboard: {error.message}</p>
              </div>
            ) : leaderboardData?.data?.data?.leaderboard && leaderboardData.data.data.leaderboard.length > 0 ? (
              <div className="space-y-4">
                {leaderboardData.data.data.leaderboard.map((user: any, index: number) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">
                        {getRankIcon(user.rank || index + 1)}
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {user.first_name?.[0] || user.username[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {user.first_name && user.last_name
                              ? `${user.first_name} ${user.last_name}`
                              : user.username}
                          </p>
                          <p className="text-sm text-gray-600">@{user.username}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {getValueByType(user, activeTab)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {activeTab === 'levels' && 'Level'}
                        {activeTab === 'experience' && 'XP'}
                        {activeTab === 'badges' && 'Badges'}
                        {activeTab === 'achievements' && 'Achievements'}
                        {activeTab === 'activity' && 'Activities'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No data available</p>
                <p className="text-sm text-gray-500 mt-2">Debug: {JSON.stringify(leaderboardData?.data)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 