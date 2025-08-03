'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Trophy, Users, Award, LogOut, Home, Activity, Settings, ChevronDown, Shield } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function Navigation() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/auth/login');
  };

  // Core navigation items (for all users)
  const coreNavigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
    },
    {
      name: 'Leaderboards',
      href: '/dashboard/leaderboards',
      icon: Trophy,
    },
    {
      name: 'Activities',
      href: '/dashboard/activities',
      icon: Activity,
    },
  ];

  // Admin management items (dropdown)
  const adminManagementItems = [
    {
      name: 'Badges',
      href: '/dashboard/badges',
      icon: Award,
    },
    {
      name: 'Users',
      href: '/dashboard/users',
      icon: Users,
    },
    {
      name: 'Achievements',
      href: '/dashboard/achievements',
      icon: Trophy,
    },
    {
      name: 'Levels',
      href: '/dashboard/levels',
      icon: Settings,
    },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-gray-900">
              Gamification Platform
            </h1>
            <div className="hidden md:flex space-x-4">
              {/* Core navigation items */}
              {coreNavigationItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </button>
              ))}
              
              {/* Admin Management Dropdown */}
              {user?.isAdmin && (
                <div className="relative">
                  <button
                    onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isAdminDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isAdminDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        {adminManagementItems.map((item) => (
                          <button
                            key={item.name}
                            onClick={() => {
                              router.push(item.href);
                              setIsAdminDropdownOpen(false);
                            }}
                            className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, {user?.firstName || user?.username}!
              {user?.isAdmin && (
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                  Admin
                </span>
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Click outside to close dropdown */}
      {isAdminDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsAdminDropdownOpen(false)}
        />
      )}
    </nav>
  );
} 