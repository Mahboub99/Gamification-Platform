'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Users, Eye, TrendingUp, Award, Trophy, Trash2, Gift, X } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import Navigation from '@/components/Navigation';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.getAll(),
  });

  const { data: badgesData } = useQuery({
    queryKey: ['badges'],
    queryFn: () => api.badges.getAll(),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => api.users.delete(userId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(response.data?.message || 'User deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    },
  });

  const giveBadgeMutation = useMutation({
    mutationFn: ({ userId, badgeId }: { userId: number; badgeId: number }) =>
      api.badges.giveToUser(userId, badgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Badge given successfully');
      setIsBadgeModalOpen(false);
      setSelectedUser(null);
      setSelectedBadge('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to give badge');
    },
  });

  const users = Array.isArray(usersData?.data?.data) ? usersData.data.data : [];
  const badges = Array.isArray(badgesData?.data?.data) ? badgesData.data.data : [];

  // Debug logging
  console.log('Users data:', usersData);
  console.log('Users data.data:', usersData?.data);
  console.log('Badges data:', badges);


  const handleDeleteUser = (user: any) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const handleGiveBadge = (user: any) => {
    setSelectedUser(user);
    setIsBadgeModalOpen(true);
  };

  const handleBadgeSubmit = () => {
    if (selectedUser && selectedBadge) {
      giveBadgeMutation.mutate({
        userId: selectedUser.id,
        badgeId: parseInt(selectedBadge),
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">View and manage all platform users</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user: any) => (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {user.firstName?.[0] || user.username[0]}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.username}
                      </h3>
                      <p className="text-sm text-gray-600">@{user.username}</p>
                    </div>
                    {user.isAdmin && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-600">XP</p>
                        <p className="font-semibold">{formatNumber(user.experiencePoints)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Trophy className="h-4 w-4 text-yellow-600" />
                      <div>
                        <p className="text-xs text-gray-600">Level</p>
                        <p className="font-semibold">{user.currentLevel}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Award className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-600">Badges</p>
                        <p className="font-semibold">{user.totalBadges}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-600">Achievements</p>
                        <p className="font-semibold">{user.totalAchievements}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/users/${user.id}`)}
                      className="flex-1 flex items-center space-x-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Profile</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGiveBadge(user)}
                      className="flex items-center space-x-2"
                      disabled={user.isAdmin}
                    >
                      <Gift className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUser(user)}
                      className="flex items-center space-x-2"
                      disabled={user.isAdmin}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {users.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No users found.</p>
            </CardContent>
          </Card>
        )}

        {/* Badge Modal */}
        {isBadgeModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Give Badge to {selectedUser.username}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsBadgeModalOpen(false);
                      setSelectedUser(null);
                      setSelectedBadge('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Badge
                    </label>
                    <select
                      value={selectedBadge}
                      onChange={(e) => setSelectedBadge(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a badge...</option>
                      {badges.map((badge: any) => (
                        <option key={badge.id} value={badge.id}>
                          {badge.name} - {badge.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsBadgeModalOpen(false);
                        setSelectedUser(null);
                        setSelectedBadge('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBadgeSubmit}
                      disabled={!selectedBadge || giveBadgeMutation.isPending}
                      isLoading={giveBadgeMutation.isPending}
                    >
                      Give Badge
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && userToDelete && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Delete User</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setUserToDelete(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white">
                      <Trash2 className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Delete {userToDelete.firstName && userToDelete.lastName
                          ? `${userToDelete.firstName} ${userToDelete.lastName}`
                          : userToDelete.username}?
                      </p>
                      <p className="text-sm text-gray-600">
                        This action cannot be undone. All user data will be permanently deleted.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsDeleteModalOpen(false);
                        setUserToDelete(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={confirmDelete}
                      disabled={deleteUserMutation.isPending}
                      isLoading={deleteUserMutation.isPending}
                    >
                      Delete User
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 