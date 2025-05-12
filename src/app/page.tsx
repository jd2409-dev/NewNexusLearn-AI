"use client";

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { NexusLearnLogo } from "@/components/icons/nexuslearn-logo";

export default function HomePage() {
  const { user, loading, isFirebaseConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isFirebaseConfigured) {
        if (user) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      }
      // If Firebase is not configured, this page will show the loading spinner.
      // The user will be directed to /login by browser history or manual navigation,
      // where the configuration error from AuthProvider will be displayed.
      // Or, if they navigate to a protected route, AppLayout will show the error.
    }
  }, [user, loading, router, isFirebaseConfigured]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
      <NexusLearnLogo className="h-20 w-auto mx-auto text-primary mb-6" />
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Loading NexusLearn AI...</p>
    </div>
  );
}
