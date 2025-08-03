'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Trophy, Users, Award, TrendingUp, Activity, Settings, History, CheckCircle, Clock } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, token, isHydrated, initializeAuth } = useAuthStore();

  useEffect(() => {
    // Initialize auth on mount
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    // Only check auth after hydration
    if (!isHydrated) return;

    const storedToken = localStorage.getItem('token');
    console.log('Dashboard Auth Check:', { 
      isHydrated,
      isAuthenticated, 
      hasUser: !!user, 
      hasToken: !!token, 
      storedToken: !!storedToken 
    });

    if (!isAuthenticated || !user || !token || !storedToken) {
      console.log('Not authenticated, redirecting to login');
      router.push('/auth/login');
    }
  }, [isHydrated, isAuthenticated, user, token, router]);

  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: () => api.users.getStats(user!.id),
    enabled: !!user?.id && isHydrated,
  });

  const { data: userActivitiesData } = useQuery({
    queryKey: ['userActivities'],
    queryFn: () => api.activities.getUserActivities(),
    enabled: !!user?.id && isHydrated,
  });

  const { data: userBadgesData } = useQuery({
    queryKey: ['userBadges', user?.id],
    queryFn: () => api.badges.getUserBadges(user!.id),
    enabled: !!user?.id && isHydrated,
  });

  const { data: currentUserData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.profile(),
    enabled: !!user?.id && isHydrated,
  });

  const userActivities = userActivitiesData?.data?.data?.userActivities || [];
  const recentActivities = userActivities.slice(0, 2); // Get last 2 activities
  const userBadges = userBadgesData?.data?.data?.badges || [];
  const currentUser = currentUserData?.data?.data || user;

  // Show loading while hydrating or checking auth
  if (!isHydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
          <p className="text-gray-600">Please wait while we load your dashboard.</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Experience Points',
      value: currentUser.experiencePoints?.toLocaleString() || '0',
      icon: TrendingUp,
      color: 'text-blue-600',
    },
    {
      title: 'Current Level',
      value: currentUser.currentLevel || 1,
      icon: Trophy,
      color: 'text-yellow-600',
    },
    {
      title: 'Total Badges',
      value: currentUser.totalBadges || 0,
      icon: Award,
      color: 'text-purple-600',
    },
    {
      title: 'Achievements',
      value: currentUser.totalAchievements || 0,
      icon: Users,
      color: 'text-green-600',
    },
  ];

  // User features (available to all users)
  const userFeatures = [
    {
      title: 'View Leaderboards',
      description: 'See how you rank against other users',
      href: '/dashboard/leaderboards',
      icon: Trophy,
    },
    {
      title: 'Complete Activities',
      description: 'Earn XP and badges by completing activities',
      href: '/dashboard/activities',
      icon: Activity,
    },
  ];

  // Admin features (only for admins)
  const adminFeatures = [
    {
      title: 'Manage Badges',
      description: 'Create and edit badges for the platform',
      href: '/dashboard/badges',
      icon: Award,
    },
    {
      title: 'Users Management',
      description: 'View and manage all platform users',
      href: '/dashboard/users',
      icon: Users,
    },
    {
      title: 'Achievement Management',
      description: 'Create and manage achievements',
      href: '/dashboard/achievements',
      icon: Trophy,
    },
    {
      title: 'Level Management',
      description: 'Configure level requirements and rewards',
      href: '/dashboard/levels',
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.firstName || user.username}!
          </h1>
          <p className="text-gray-600">
            {user.isAdmin ? 'Admin Dashboard' : 'User Dashboard'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${stat.color} bg-opacity-10`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* User Features */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userFeatures.map((feature) => (
              <Card key={feature.title} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <feature.icon className="h-8 w-8 text-blue-600" />
                    <h3 className="text-lg font-semibold ml-3">{feature.title}</h3>
                  </div>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  <Button
                    variant="outline"
                    onClick={() => router.push(feature.href)}
                    className="w-full"
                  >
                    Access
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Admin Features */}
        {user.isAdmin && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {adminFeatures.map((feature) => (
                <Card key={feature.title} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <feature.icon className="h-8 w-8 text-red-600" />
                      <h3 className="text-lg font-semibold ml-3">{feature.title}</h3>
                    </div>
                    <p className="text-gray-600 mb-4">{feature.description}</p>
                    <Button
                      variant="outline"
                      onClick={() => router.push(feature.href)}
                      className="w-full"
                    >
                      Manage
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <History className="h-6 w-6 mr-2 text-blue-600" />
            Recent Activity
          </h2>
          <Card>
            <CardContent className="p-6">
              {recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity: any) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Trophy className="h-5 w-5 text-green-600" />
                        <div>
                          <h3 className="font-semibold text-gray-800">{activity.activity.name}</h3>
                          <p className="text-sm text-gray-600">{activity.activity.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          +{activity.activity.experience_reward} XP
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No recent activity to display.</p>
                  <p className="text-sm text-gray-500 mt-2">Complete some activities to see them here!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Badges */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="h-6 w-6 mr-2 text-purple-600" />
            Your Badges
          </h2>
          <Card>
            <CardContent className="p-6">
              {userBadges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userBadges.map((badge: any) => (
                    <div key={badge.id} className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <Award className="h-6 w-6 text-purple-600" />
                      <div>
                        <h3 className="font-semibold text-gray-800">{badge.name}</h3>
                        <p className="text-sm text-gray-600">{badge.description}</p>
                        <p className="text-xs text-purple-600 mt-1">Awarded: {new Date(badge.awarded_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No badges earned yet.</p>
                  <p className="text-sm text-gray-500 mt-2">Complete activities to earn badges!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 