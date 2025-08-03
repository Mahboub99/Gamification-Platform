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
import { Badge } from '@/components/ui/Badge';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Navigation from '@/components/Navigation';

const badgeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  criteria_type: z.enum(['experience', 'badges', 'activities', 'achievements', 'custom']),
  criteria_value: z.number().min(1, 'Criteria value must be at least 1'),
  experience_reward: z.number().min(0, 'Experience reward cannot be negative'),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
});

type BadgeForm = z.infer<typeof badgeSchema>;

export default function BadgeManagementPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingBadge, setDeletingBadge] = useState<any>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BadgeForm>({
    resolver: zodResolver(badgeSchema),
    defaultValues: {
      criteria_type: 'experience',
      experience_reward: 0,
      rarity: 'common',
    },
  });

  const { data: badges, isLoading } = useQuery({
    queryKey: ['badges'],
    queryFn: () => api.badges.getAll(),
  });

  // Debug logging
  console.log('Badges data:', badges);
  console.log('Badges data.data:', badges?.data);
  console.log('Badges data.data.data:', badges?.data?.data);
  console.log('Is badges.data.data an array?', Array.isArray(badges?.data?.data));

  const createBadgeMutation = useMutation({
    mutationFn: (data: BadgeForm) => api.badges.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      toast.success('Badge created successfully');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create badge');
    },
  });

  const updateBadgeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BadgeForm }) =>
      api.badges.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      toast.success('Badge updated successfully');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update badge');
    },
  });

  const deleteBadgeMutation = useMutation({
    mutationFn: (id: number) => api.badges.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      toast.success('Badge deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete badge');
    },
  });

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingBadge(null);
    reset();
  };

  const handleEditBadge = (badge: any) => {
    setEditingBadge(badge);
    reset({
      name: badge.name,
      description: badge.description,
      image_url: badge.imageUrl || '',
      criteria_type: badge.criteriaType,
      criteria_value: badge.criteriaValue,
      experience_reward: badge.experienceReward,
      rarity: badge.rarity,
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: BadgeForm) => {
    if (editingBadge) {
      updateBadgeMutation.mutate({ id: parseInt(editingBadge.id), data });
    } else {
      createBadgeMutation.mutate(data);
    }
  };

  const handleDeleteBadge = (badge: any) => {
    setDeletingBadge(badge);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (deletingBadge) {
      deleteBadgeMutation.mutate(parseInt(deletingBadge.id));
      setIsDeleteModalOpen(false);
      setDeletingBadge(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setDeletingBadge(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Badge Management</h1>
            <p className="text-gray-600">Create and manage badges for the platform</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Badge</span>
          </Button>
        </div>

        {/* Badge Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {editingBadge ? 'Edit Badge' : 'Create New Badge'}
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
                      placeholder="Badge name"
                      error={errors.name?.message}
                      {...register('name')}
                    />
                    <Input
                      label="Description"
                      placeholder="Badge description"
                      error={errors.description?.message}
                      {...register('description')}
                    />
                  </div>
                  
                  <Input
                    label="Image URL"
                    placeholder="https://example.com/image.jpg"
                    error={errors.image_url?.message}
                    {...register('image_url')}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Input
                      label="Criteria Value"
                      type="number"
                      placeholder="100"
                      error={errors.criteria_value?.message}
                      {...register('criteria_value', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Experience Reward"
                      type="number"
                      placeholder="50"
                      error={errors.experience_reward?.message}
                      {...register('experience_reward', { valueAsNumber: true })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rarity
                      </label>
                      <select
                        {...register('rarity')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="common">Common</option>
                        <option value="rare">Rare</option>
                        <option value="epic">Epic</option>
                        <option value="legendary">Legendary</option>
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
                      isLoading={createBadgeMutation.isPending || updateBadgeMutation.isPending}
                    >
                      {editingBadge ? 'Update Badge' : 'Create Badge'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && deletingBadge && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <Trash2 className="h-5 w-5 mr-2" />
                  Delete Badge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Are you sure you want to delete the badge <strong>"{deletingBadge.name}"</strong>?
                  </p>
                  <p className="text-sm text-gray-600">
                    This action cannot be undone. The badge will be permanently removed from the platform.
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
                      isLoading={deleteBadgeMutation.isPending}
                    >
                      Delete Badge
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Click outside to close dropdown */}
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

        {/* Badges Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.isArray(badges?.data?.data) ? (
              badges.data.data.map((badge: any) => (
                <Card key={badge.id} className="relative">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <Badge
                        name={badge.name}
                        description={badge.description}
                        imageUrl={badge.imageUrl}
                        rarity={badge.rarity}
                        experienceReward={badge.experienceReward}
                      />
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditBadge(badge)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBadge(badge)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><strong>Criteria:</strong> {badge.criteriaType} ≥ {badge.criteriaValue}</p>
                      <p><strong>Reward:</strong> +{badge.experienceReward} XP</p>
                      <p><strong>Rarity:</strong> {badge.rarity}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-600">No badges found or data structure error</p>
                <p className="text-sm text-gray-500 mt-2">Debug: {JSON.stringify(badges?.data)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 