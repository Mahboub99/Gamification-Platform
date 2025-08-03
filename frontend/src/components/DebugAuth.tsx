'use client';

import { useAuthStore } from '@/lib/store';

export default function DebugAuth() {
  const { user, isAuthenticated, token, isHydrated } = useAuthStore();
  
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <div className="space-y-1">
        <div>Hydrated: {isHydrated ? '✅' : '❌'}</div>
        <div>Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
        <div>Has User: {user ? '✅' : '❌'}</div>
        <div>Has Token: {token ? '✅' : '❌'}</div>
        <div>Stored Token: {storedToken ? '✅' : '❌'}</div>
        <div>Stored User: {storedUser ? '✅' : '❌'}</div>
        {user && (
          <div>User: {user.username} (ID: {user.id})</div>
        )}
      </div>
    </div>
  );
} 