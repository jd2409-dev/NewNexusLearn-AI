
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
import { Button } from '@/components/ui/button'; // For potential logout button in error state

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading, isFirebaseConfigured, error: authError, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!isFirebaseConfigured) {
        // Error will be shown by the !isFirebaseConfigured block below
        return;
      }

      if (!user) {
        router.push('/login');
        return;
      }

      // User is logged in, check if profile and plan are set
      if (user && userProfile === null && !authError) {
        // Profile is still loading or truly null without an authError, AuthProvider is handling it.
        // The main loading screen below will cover this.
        return;
      }

      if (user && userProfile && userProfile.plan === null) {
        // User is logged in, profile loaded, but plan not selected (should be auto-assigned to free)
        // This scenario might indicate an issue with auto-assignment or if plan selection page was re-introduced
        if (pathname !== '/select-plan') { // Assuming select-plan is still the route for plan selection
          router.push('/select-plan');
        }
      } else if (user && userProfile && userProfile.plan && pathname === '/select-plan') {
        // User has a plan but somehow landed on select-plan, redirect to dashboard
        router.push('/dashboard');
      }
    }
  }, [user, userProfile, loading, router, isFirebaseConfigured, pathname, authError]);


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
              Please ensure that Firebase API keys are correctly set up in your environment configuration file (<code>src/firebase.ts</code>).
            </p>
            <p>
              If you are an administrator, please verify the Firebase project setup and environment variables.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If there's an authError from AuthProvider, and we're past initial loading,
  // and user is logged in but profile failed to load.
  if (!loading && isFirebaseConfigured && user && !userProfile && authError) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-center">
        <NexusLearnLogo className="h-20 w-auto text-primary mb-6" />
        <Alert variant="destructive" className="max-w-lg w-full">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-xl font-semibold">Account Initialization Error</AlertTitle>
          <AlertDescription className="mt-2 text-base text-left">
            <p className="mb-3">
              There was a problem loading your account details: {authError}
            </p>
            <p className="mb-3">
              Please try logging out and signing in again.
            </p>
            <Button onClick={async () => {
                await signOut(); // Call signOut from useAuth
                router.push('/login'); // Redirect to login after sign out
              }}
              className="mt-4"
            >
              Logout and Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Main loading condition:
  // Show loader if auth is loading OR
  // if user is logged in, Firebase is configured, no auth error yet, but profile is still null (being fetched/created)
  if (loading || (user && userProfile === null && isFirebaseConfigured && !authError)) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
        <NexusLearnLogo className="h-20 w-auto text-primary mb-6" />
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading NexusLearn AI...</p>
      </div>
    );
  }


  if (!user) {
    // This state should ideally be brief as useEffect redirects to /login.
    // If it's reached and loading is false, it means redirect is happening.
     return (
       <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
        <NexusLearnLogo className="h-20 w-auto text-primary mb-6" />
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  // If user is logged in but plan is not selected (should be auto-assigned to free),
  // and we are not on select-plan page, this indicates redirection is in progress by useEffect.
  if (userProfile && userProfile.plan === null && pathname !== '/select-plan' && !authError) {
     return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
        <NexusLearnLogo className="h-20 w-auto text-primary mb-6" />
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Finalizing account setup...</p>
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
