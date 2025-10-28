'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredLeague?: string;
  requiredRole?: string;
}

const LEAGUE_HIERARCHY = ['CHANDRIKA', 'VAJRA', 'AGNEYASTRA', 'VARUNASTRA', 'PASHUPATASTRA', 'BRAHMASTRA'];

export default function ProtectedRoute({ children, requiredLeague, requiredRole }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (requiredLeague && user) {
      const userLeagueIndex = LEAGUE_HIERARCHY.indexOf(user.league);
      const requiredLeagueIndex = LEAGUE_HIERARCHY.indexOf(requiredLeague);
      
      if (userLeagueIndex < requiredLeagueIndex) {
        router.push('/unauthorized');
        return;
      }
    }

    if (requiredRole && user && user.role !== requiredRole) {
      router.push('/unauthorized');
      return;
    }
  }, [isAuthenticated, user, requiredLeague, requiredRole, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (requiredLeague && user) {
    const userLeagueIndex = LEAGUE_HIERARCHY.indexOf(user.league);
    const requiredLeagueIndex = LEAGUE_HIERARCHY.indexOf(requiredLeague);
    
    if (userLeagueIndex < requiredLeagueIndex) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600">Redirecting...</p>
          </div>
        </div>
      );
    }
  }

  if (requiredRole && user && user.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
