'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, token } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const storedToken = localStorage.getItem('token');
      
      console.log('AuthGuard Check:', {
        requireAuth,
        isAuthenticated,
        hasUser: !!user,
        hasToken: !!token,
        storedToken: !!storedToken
      });

      if (requireAuth) {
        // For protected routes, check if user is authenticated
        if (!isAuthenticated || !user || !token || !storedToken) {
          console.log('Redirecting to login - authentication required');
          router.push('/auth/login');
          return;
        }
      } else {
        // For public routes (like login/register), redirect if already authenticated
        if (isAuthenticated && user && token && storedToken) {
          console.log('Redirecting to dashboard - already authenticated');
          router.push('/dashboard');
          return;
        }
      }

      setIsChecking(false);
    };

    // Small delay to ensure store is hydrated
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [requireAuth, isAuthenticated, user, token, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {requireAuth ? 'Checking Authentication...' : 'Loading...'}
          </h1>
          <p className="text-gray-600">Please wait.</p>
        </div>
      </div>
    );
  }

  if (requireAuth && (!user || !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h1>
          <p className="text-gray-600 mb-4">Please log in to access this page.</p>
          <Button onClick={() => router.push('/auth/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 