'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Trophy, Award, Users, TrendingUp } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  const features = [
    {
      title: 'Earn Experience Points',
      description: 'Complete activities and earn XP to level up',
      icon: TrendingUp,
      color: 'text-blue-600',
    },
    {
      title: 'Collect Badges',
      description: 'Unlock badges for your achievements',
      icon: Award,
      color: 'text-yellow-600',
    },
    {
      title: 'Compete on Leaderboards',
      description: 'See how you rank against other users',
      icon: Trophy,
      color: 'text-purple-600',
    },
    {
      title: 'Track Progress',
      description: 'Monitor your gamification journey',
      icon: Users,
      color: 'text-green-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">
              Gamification Platform
            </h1>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/auth/login')}
              >
                Sign In
              </Button>
              <Button
                onClick={() => router.push('/auth/register')}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to the
            <span className="text-blue-600"> Gamification Platform</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transform your experience with our powerful gamification system. 
            Earn points, unlock badges, and compete with others in a fun and engaging way.
          </p>
          <div className="flex justify-center space-x-4">
            <Button
              size="lg"
              onClick={() => router.push('/auth/register')}
              className="px-8 py-3"
            >
              Start Your Journey
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push('/auth/login')}
              className="px-8 py-3"
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature) => (
            <Card key={feature.title} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className={`mx-auto w-12 h-12 rounded-full bg-opacity-10 flex items-center justify-center mb-4 ${feature.color}`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Get Started?</CardTitle>
              <CardDescription>
                Join thousands of users who are already enjoying our gamification platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => router.push('/auth/register')}
                  className="px-6"
                >
                  Create Account
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/auth/login')}
                  className="px-6"
                >
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
