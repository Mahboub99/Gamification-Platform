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
import { Plus, Edit, Trash2, X, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import Navigation from '@/components/Navigation';

const levelSchema = z.object({
  level_number: z.number().min(1, 'Level number must be at least 1'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  experience_required: z.number().min(0, 'Experience required cannot be negative'),
  badge_reward_id: z.number().optional().or(z.literal('')),
});

type LevelForm = z.infer<typeof levelSchema>;

export default function LevelManagementPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingLevel, setDeletingLevel] = useState<any>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LevelForm>({
    resolver: zodResolver(levelSchema),
    defaultValues: {
      experience_required: 0,
    },
  });

  const { data: levels, isLoading } = useQuery({
    queryKey: ['levels'],
    queryFn: () => api.levels.getAll(),
  });

  // Debug logging
  console.log('Levels data:', levels);
  console.log('Levels data.data:', levels?.data);
  console.log('Is levels.data an array?', Array.isArray(levels?.data));
  console.log('Levels data length:', levels?.data?.length);

  const createLevelMutation = useMutation({
    mutationFn: (data: LevelForm) => api.levels.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels'] });
      toast.success('Level created successfully');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create level');
    },
  });

  const updateLevelMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Omit<LevelForm, 'level_number'> }) =>
      api.levels.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels'] });
      toast.success('Level updated successfully');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update level');
    },
  });

  const deleteLevelMutation = useMutation({
    mutationFn: (id: number) => api.levels.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels'] });
      toast.success('Level deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete level');
    },
  });

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingLevel(null);
    reset();
  };

  const handleEditLevel = (level: any) => {
    setEditingLevel(level);
    reset({
      level_number: level.level_number,
      name: level.name,
      description: level.description,
      experience_required: level.experience_required,
      badge_reward_id: level.badge_reward_id || '',
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: LevelForm) => {
    if (editingLevel) {
      // Remove level_number from data when updating level
      const { level_number, ...updateData } = data;
      updateLevelMutation.mutate({ id: parseInt(editingLevel.id), data: updateData });
    } else {
      createLevelMutation.mutate(data);
    }
  };

  const handleDeleteLevel = (level: any) => {
    setDeletingLevel(level);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (deletingLevel) {
      deleteLevelMutation.mutate(parseInt(deletingLevel.id));
      setIsDeleteModalOpen(false);
      setDeletingLevel(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setDeletingLevel(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Level Management</h1>
            <p className="text-gray-600">Create and manage levels for the platform</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Level</span>
          </Button>
        </div>

        {/* Level Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {editingLevel ? 'Edit Level' : 'Create New Level'}
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
                      label="Level Number"
                      type="number"
                      placeholder="1"
                      error={errors.level_number?.message}
                      {...register('level_number', { valueAsNumber: true })}
                    />
                    <Input
                      label="Name"
                      placeholder="Beginner"
                      error={errors.name?.message}
                      {...register('name')}
                    />
                  </div>
                  
                  <Input
                    label="Description"
                    placeholder="Starting your journey"
                    error={errors.description?.message}
                    {...register('description')}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Experience Required"
                      type="number"
                      placeholder="0"
                      error={errors.experience_required?.message}
                      {...register('experience_required', { valueAsNumber: true })}
                    />
                    <Input
                      label="Badge Reward ID (Optional)"
                      type="number"
                      placeholder="1"
                      error={errors.badge_reward_id?.message}
                      {...register('badge_reward_id', { valueAsNumber: true })}
                    />
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
                      isLoading={createLevelMutation.isPending || updateLevelMutation.isPending}
                    >
                      {editingLevel ? 'Update Level' : 'Create Level'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && deletingLevel && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <Trash2 className="h-5 w-5 mr-2" />
                  Delete Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Are you sure you want to delete the level <strong>"{deletingLevel.name}"</strong>?
                  </p>
                  <p className="text-sm text-gray-600">
                    This action cannot be undone. The level will be permanently removed from the platform.
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
                      isLoading={deleteLevelMutation.isPending}
                    >
                      Delete Level
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

        {/* Levels Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.isArray(levels?.data?.data) ? (
              levels.data.data.map((level: any) => (
                <Card key={level.id} className="relative">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                          <Trophy className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{level.name}</h3>
                          <p className="text-sm text-gray-600">Level {level.level_number}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLevel(level)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLevel(level)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">{level.description}</p>
                      <p><strong>Experience Required:</strong> {level.experience_required} XP</p>
                      {level.badge_reward_id && (
                        <p><strong>Badge Reward:</strong> ID {level.badge_reward_id}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-600">No levels found or data structure error</p>
                <p className="text-sm text-gray-500 mt-2">Debug: {JSON.stringify(levels?.data)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 