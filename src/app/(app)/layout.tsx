
"use client"; 

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { Loader2, AlertCircle } from 'lucide-react';
import { NexusLearnLogo } from '@/components/icons/nexuslearn-logo';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading, isFirebaseConfigured, error: authError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!isFirebaseConfigured) {
        // Error will be shown by the !isFirebaseConfigured block
        return;
      }

      if (!user) {
        router.push('/login');
        return;
      }

      // User is logged in, check if profile and plan are set
      if (user && userProfile === null) {
        // Profile is still loading or failed to load, wait for AuthProvider to update.
        // The loading screen below will cover this.
        return;
      }
      
      if (user && userProfile && userProfile.plan === null) {
        // User is logged in, profile loaded, but plan not selected
        if (pathname !== '/select-plan') {
          router.push('/select-plan');
        }
      } else if (user && userProfile && userProfile.plan && pathname === '/select-plan') {
        // User has a plan but somehow landed on select-plan, redirect to dashboard
        router.push('/dashboard');
      }
    }
  }, [user, userProfile, loading, router, isFirebaseConfigured, pathname]);

  if (loading || (user && userProfile === null && isFirebaseConfigured)) { // Keep loading if user exists but profile is not yet loaded
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
        <NexusLearnLogo className="h-20 w-auto text-primary mb-6" />
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading NexusLearn AI...</p>
      </div>
    );
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-center">
        <NexusLearnLogo className="h-20 w-auto text-primary mb-6" />
        <Alert variant="destructive" className="max-w-lg w-full">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-xl font-semibold">Application Configuration Error</AlertTitle>
          <AlertDescription className="mt-2 text-base text-left">
            <p className="mb-3">
              {authError || "NexusLearn AI cannot start due to a Firebase configuration issue."}
            </p>
            <p className="mb-3">
              Please ensure that Firebase API keys (e.g., <code>NEXT_PUBLIC_FIREBASE_API_KEY</code>, etc.) are correctly set up in your environment configuration file (<code>.env.local</code>).
            </p>
            <p>
              If you are an administrator, please verify the Firebase project setup and environment variables.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user) {
    // This state should ideally be brief as useEffect redirects to /login.
    return (
       <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
        <NexusLearnLogo className="h-20 w-auto text-primary mb-6" />
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }
  
  // If user is logged in but plan is not selected, and we are not on select-plan page,
  // this indicates redirection is in progress by useEffect. Show loader.
  if (userProfile && userProfile.plan === null && pathname !== '/select-plan') {
     return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
        <NexusLearnLogo className="h-20 w-auto text-primary mb-6" />
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Finalizing setup...</p>
      </div>
    );
  }


  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-secondary/30">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
