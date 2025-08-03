'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Activity, CheckCircle, Clock, Star, History, Trophy } from 'lucide-react';
import { formatNumber, formatDate } from '@/lib/utils';
import Navigation from '@/components/Navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: activitiesData, isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: () => api.activities.getAll(),
  });

  const { data: userActivitiesData } = useQuery({
    queryKey: ['userActivities'],
    queryFn: () => api.activities.getUserActivities(),
  });

  const completeActivityMutation = useMutation({
    mutationFn: (activityId: number) => api.activities.complete(activityId, user!.id),
    onSuccess: (response) => {
      console.log('Activity completion response:', response);
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['userActivities'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['userBadges'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      
      const { experienceGained, alreadyCompleted, message } = response.data;
      
      if (alreadyCompleted) {
        toast.success(message || 'You already completed this activity!');
        return;
      }
      
      let successMessage = message || `Activity completed! +${experienceGained} XP`;
      toast.success(successMessage);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to complete activity';
      if (errorMessage.includes('already completed')) {
        toast.success('You already completed this activity!');
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const activities = activitiesData?.data?.data || [];
  const userActivities = userActivitiesData?.data?.data?.userActivities || [];
  const completedActivityIds = userActivities.map((ua: any) => ua.activityId);

  // Debug logging
  console.log('Activities data:', activities);
  console.log('User activities data:', userActivities);
  console.log('Completed activity IDs:', completedActivityIds);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'hard':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <Star className="h-4 w-4" />;
      case 'medium':
        return <Star className="h-4 w-4" />;
      case 'hard':
        return <Star className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Since the API doesn't return difficulty, we'll use a default
  const getDefaultDifficulty = (activity: any) => {
    // Assign difficulty based on experience reward
    if (activity.experience_reward >= 50) return 'hard';
    if (activity.experience_reward >= 25) return 'medium';
    return 'easy';
  };

  const completedActivities = userActivities.map((userActivity: any) => {
    // The API already includes the activity data, so we can use it directly
    return {
      ...userActivity,
      activity: userActivity.activity // Use the activity data from the API response
    };
  });

  // Debug logging for completed activities
  console.log('Completed activities:', completedActivities);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Activities</h1>
          <p className="text-gray-600">Complete activities to earn experience points and badges</p>
        </div>

        {/* Available Activities */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Activities</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map((activity: any) => {
                const isCompleted = completedActivityIds.includes(activity.id);
                const userActivity = userActivities.find((ua: any) => ua.activityId === activity.id);
                
                return (
                  <Card key={activity.id} className="relative">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2">
                          <Activity className="h-5 w-5 text-blue-600" />
                          <span>{activity.name}</span>
                        </CardTitle>
                        {isCompleted && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(getDefaultDifficulty(activity))}`}>
                          {getDifficultyIcon(getDefaultDifficulty(activity))}
                          <span className="ml-1 capitalize">{getDefaultDifficulty(activity)}</span>
                        </div>
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          +{activity.experience_reward} XP
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">{activity.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>Category: {activity.category}</span>
                        </div>
                        {activity.badge_reward_id && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Star className="h-4 w-4" />
                            <span>Badge Reward: {activity.badge_reward_id}</span>
                          </div>
                        )}
                      </div>

                      {isCompleted ? (
                        <div className="space-y-2">
                          <Button disabled className="w-full bg-green-100 text-green-800">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Completed
                          </Button>
                          {userActivity && (
                            <p className="text-xs text-gray-500 text-center">
                              Completed {new Date(userActivity.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={() => completeActivityMutation.mutate(activity.id)}
                          disabled={completeActivityMutation.isPending}
                          className="w-full"
                        >
                          {completeActivityMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Complete Activity
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {activities.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-6 text-center">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No activities available.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Activity History */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <History className="h-6 w-6 mr-2 text-blue-600" />
            Activity History
          </h2>
          
          {completedActivities.length > 0 ? (
            <div className="space-y-4">
              {completedActivities.map((completedActivity: any) => (
                <div key={completedActivity.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <Trophy className="h-5 w-5 text-green-600" />
                        <div>
                          <h3 className="font-semibold text-gray-800">{completedActivity.activity.name}</h3>
                          <p className="text-sm text-gray-600">{completedActivity.activity.description}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        +{completedActivity.activity.experience_reward} XP
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>Category: {completedActivity.activity.category}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Completed: {formatDate(completedActivity.completedAt)}</span>
                    </div>
                    {completedActivity.activity.badge_reward_id && (
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4" />
                        <span>Badge: {completedActivity.activity.badge_reward_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No completed activities yet.</p>
                <p className="text-sm text-gray-500 mt-2">Complete some activities to see them here!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 