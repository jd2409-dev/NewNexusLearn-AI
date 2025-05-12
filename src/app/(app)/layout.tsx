"use client"; 

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
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
  const { user, loading, isFirebaseConfigured, error: authError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isFirebaseConfigured) {
        if (!user) {
          router.push('/login');
        }
      }
      // If Firebase is not configured, the !isFirebaseConfigured block below
      // will render an error message. No automatic redirect from here in that case.
    }
  }, [user, loading, router, isFirebaseConfigured]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
        <NexusLearnLogo className="h-20 w-auto mx-auto text-primary mb-6" />
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading NexusLearn AI...</p>
      </div>
    );
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-center">
        <NexusLearnLogo className="h-20 w-auto mx-auto text-primary mb-6" />
        <Alert variant="destructive" className="max-w-lg w-full">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-xl font-semibold">Application Configuration Error</AlertTitle>
          <AlertDescription className="mt-2 text-base text-left">
            <p className="mb-3">
              {authError || "NexusLearn AI cannot start due to a Firebase configuration issue."}
            </p>
            <p className="mb-3">
              Please ensure that Firebase API keys (e.g., <code>NEXT_PUBLIC_FIREBASE_API_KEY</code>, <code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code>, etc.) are correctly set up in your environment configuration file (<code>.env</code> or <code>.env.local</code>).
            </p>
            <p>
              If you are an administrator, please verify the Firebase project setup and environment variables. If the issue persists, check server logs for more details.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // At this point, Firebase IS configured. Now check for user.
  if (!user) {
    // This state should ideally be brief as useEffect redirects to /login.
    // This also handles cases where a non-authenticated user tries to access a protected route directly.
    return (
       <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
        <NexusLearnLogo className="h-20 w-auto mx-auto text-primary mb-6" />
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  // Firebase is configured and user exists
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
