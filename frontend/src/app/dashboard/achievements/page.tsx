'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Edit, Trash2, X, Trophy, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import Navigation from '@/components/Navigation';

const achievementSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  icon_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  category: z.enum(['onboarding', 'engagement', 'collection', 'progression', 'social', 'custom']),
  criteria_type: z.enum(['experience', 'badges', 'activities', 'achievements', 'custom']),
  criteria_value: z.number().min(1, 'Criteria value must be at least 1'),
  experience_reward: z.number().min(0, 'Experience reward cannot be negative'),
  badge_reward_id: z.number().optional().or(z.literal('')),
  is_active: z.boolean().default(true),
});

type AchievementForm = z.infer<typeof achievementSchema>;

export default function AchievementManagementPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingAchievement, setDeletingAchievement] = useState<any>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AchievementForm>({
    resolver: zodResolver(achievementSchema),
    defaultValues: {
      category: 'engagement',
      criteria_type: 'experience',
      experience_reward: 0,
      is_active: true,
    },
  });

  const { data: achievements, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => api.achievements.getAll(),
  });

  // Debug logging
  console.log('Achievements data:', achievements);
  console.log('Achievements data.data:', achievements?.data);
  console.log('Is achievements.data an array?', Array.isArray(achievements?.data));
  console.log('Achievements data length:', achievements?.data?.length);

  const createAchievementMutation = useMutation({
    mutationFn: (data: Omit<AchievementForm, 'is_active'>) => api.achievements.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      toast.success('Achievement created successfully');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create achievement');
    },
  });

  const updateAchievementMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AchievementForm }) =>
      api.achievements.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      toast.success('Achievement updated successfully');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update achievement');
    },
  });

  const deleteAchievementMutation = useMutation({
    mutationFn: (id: number) => api.achievements.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      toast.success('Achievement deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete achievement');
    },
  });

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAchievement(null);
    reset();
  };

  const handleEditAchievement = (achievement: any) => {
    setEditingAchievement(achievement);
    reset({
      name: achievement.name,
      description: achievement.description,
      icon_url: achievement.icon_url || '',
      category: achievement.category,
      criteria_type: achievement.criteria_type,
      criteria_value: achievement.criteria_value,
      experience_reward: achievement.experience_reward,
      badge_reward_id: achievement.badge_reward_id || '',
      is_active: achievement.is_active,
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: AchievementForm) => {
    if (editingAchievement) {
      updateAchievementMutation.mutate({ id: parseInt(editingAchievement.id), data });
    } else {
      // Remove is_active from data when creating new achievement
      const { is_active, ...createData } = data;
      createAchievementMutation.mutate(createData);
    }
  };

  const handleDeleteAchievement = (achievement: any) => {
    setDeletingAchievement(achievement);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (deletingAchievement) {
      deleteAchievementMutation.mutate(parseInt(deletingAchievement.id));
      setIsDeleteModalOpen(false);
      setDeletingAchievement(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setDeletingAchievement(null);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      onboarding: 'bg-blue-100 text-blue-800',
      engagement: 'bg-green-100 text-green-800',
      collection: 'bg-purple-100 text-purple-800',
      progression: 'bg-orange-100 text-orange-800',
      social: 'bg-pink-100 text-pink-800',
      custom: 'bg-gray-100 text-gray-800',
    };
    return colors[category as keyof typeof colors] || colors.custom;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Achievement Management</h1>
            <p className="text-gray-600">Create and manage achievements for the platform</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Achievement</span>
          </Button>
        </div>

        {/* Achievement Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {editingAchievement ? 'Edit Achievement' : 'Create New Achievement'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseForm}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Name"
                      placeholder="Achievement name"
                      error={errors.name?.message}
                      {...register('name')}
                    />
                    <Input
                      label="Description"
                      placeholder="Achievement description"
                      error={errors.description?.message}
                      {...register('description')}
                    />
                  </div>
                  
                  <Input
                    label="Icon URL"
                    placeholder="https://example.com/icon.png"
                    error={errors.icon_url?.message}
                    {...register('icon_url')}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        {...register('category')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="onboarding">Onboarding</option>
                        <option value="engagement">Engagement</option>
                        <option value="collection">Collection</option>
                        <option value="progression">Progression</option>
                        <option value="social">Social</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Criteria Type
                      </label>
                      <select
                        {...register('criteria_type')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                                                 <option value="experience">Experience Points</option>
                         <option value="badges">Badges Earned</option>
                         <option value="activities">Activities Completed</option>
                         <option value="achievements">Achievements Unlocked</option>
                         <option value="custom">Custom</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Criteria Value"
                      type="number"
                      placeholder="100"
                      error={errors.criteria_value?.message}
                      {...register('criteria_value', { valueAsNumber: true })}
                    />
                    <Input
                      label="Experience Reward"
                      type="number"
                      placeholder="50"
                      error={errors.experience_reward?.message}
                      {...register('experience_reward', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <Input
                       label="Badge Reward ID (Optional)"
                       type="number"
                       placeholder="1"
                       error={errors.badge_reward_id?.message}
                       {...register('badge_reward_id', { 
                         setValueAs: (value: string) => value === '' ? undefined : Number(value)
                       })}
                     />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        {...register('is_active', { setValueAs: (value) => value === 'true' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseForm}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      isLoading={createAchievementMutation.isPending || updateAchievementMutation.isPending}
                    >
                      {editingAchievement ? 'Update Achievement' : 'Create Achievement'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && deletingAchievement && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <Trash2 className="h-5 w-5 mr-2" />
                  Delete Achievement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Are you sure you want to delete the achievement <strong>"{deletingAchievement.name}"</strong>?
                  </p>
                  <p className="text-sm text-gray-600">
                    This action cannot be undone. The achievement will be permanently removed from the platform.
                  </p>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelDelete}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={confirmDelete}
                      isLoading={deleteAchievementMutation.isPending}
                    >
                      Delete Achievement
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Click outside to close modals */}
        {(isFormOpen || isDeleteModalOpen) && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              if (isFormOpen) handleCloseForm();
              if (isDeleteModalOpen) cancelDelete();
            }}
          />
        )}

        {/* Achievements Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {Array.isArray(achievements?.data?.data) ? (
              achievements.data.data.map((achievement: any) => (
                <Card key={achievement.id} className="relative">
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-4">
                                              <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                            <Star className="h-8 w-8 text-white" />
                          </div>
                                                  <div>
                            <h3 className="text-lg font-semibold text-gray-900">{achievement.name}</h3>
                            <span className={`inline-block px-3 py-1 text-sm rounded-full ${getCategoryColor(achievement.category)}`}>
                              {achievement.category}
                            </span>
                          </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAchievement(achievement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAchievement(achievement)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3 text-base">
                      <p className="text-gray-700">{achievement.description}</p>
                      <p><strong>Criteria:</strong> {achievement.criteria_type} ≥ {achievement.criteria_value}</p>
                      <p><strong>Reward:</strong> +{achievement.experience_reward} XP</p>
                      {achievement.badge_reward_id && (
                        <p><strong>Badge Reward:</strong> ID {achievement.badge_reward_id}</p>
                      )}
                      <div className="flex items-center space-x-2">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${achievement.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {achievement.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-600">No achievements found or data structure error</p>
                <p className="text-sm text-gray-500 mt-2">Debug: {JSON.stringify(achievements?.data)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 