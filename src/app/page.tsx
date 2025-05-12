
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { NexusLearnLogo } from "@/components/icons/nexuslearn-logo";

export default function HomePage() {
  const { user, userProfile, loading, isFirebaseConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isFirebaseConfigured) {
        // Errors are handled by AuthProvider and AppLayout
        // Fallback to login page where detailed error can be shown
        router.replace('/login');
        return;
      }

      if (user) {
        if (userProfile && userProfile.plan) {
          router.replace('/dashboard');
        } else if (userProfile && userProfile.plan === null) {
          router.replace('/select-plan');
        }
        // If userProfile is still loading, AppLayout will handle redirection or show loader.
      } else {
        router.replace('/login');
      }
    }
  }, [user, userProfile, loading, router, isFirebaseConfigured]);

  // Display a loading spinner while authentication and profile checks are in progress.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
      <NexusLearnLogo className="h-20 w-auto text-primary mb-6" />
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Loading NexusLearn AI...</p>
    </div>
  );
}
