// src/app/(app)/select-plan/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ensureFreePlan } from "@/lib/user-service"; // Changed from setUserPlan
import { Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NexusLearnLogo } from "@/components/icons/nexuslearn-logo";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SelectPlanPage() {
  const { user, userProfile, loading: authLoading, refreshUserProfile, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "setting_plan" | "redirecting" | "error">("loading");

  useEffect(() => {
    if (authLoading) {
      setStatus("loading");
      return;
    }

    if (!isFirebaseConfigured) {
        setStatus("error"); // Firebase config error
        return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    // User is logged in. Check profile and plan.
    if (userProfile) {
      if (userProfile.plan === "free") { // User already has the 'free' plan
        setStatus("redirecting");
        router.replace("/dashboard");
      } else {
        // User exists, profile loaded, but plan is not 'free' or is null. Auto-assign/ensure 'free' plan.
        const autoAssignPlan = async () => {
          if (status === "setting_plan" || status === "redirecting") return; // Prevent re-entry
          setStatus("setting_plan");
          try {
            await ensureFreePlan(user.uid); // Ensures 'free' plan is set
            await refreshUserProfile(); 
            toast({
              title: "Account Setup Complete!",
              description: "Welcome to NexusLearn AI! All features are available to you.",
            });
            setStatus("redirecting");
            router.replace("/dashboard");
          } catch (error) {
            toast({
              title: "Error During Setup",
              description: "Could not finalize your account setup. Please try logging in again.",
              variant: "destructive",
            });
            console.error("Error auto-assigning/ensuring free plan:", error);
            setStatus("error");
          }
        };
        autoAssignPlan();
      }
    } else if (user && !userProfile && !authLoading) {
      // This case means auth is done, user exists, but profile is still null (being fetched by AuthProvider)
      // We let AuthProvider handle creating/fetching the profile.
      // If ensureFreePlan is robust, AuthProvider's profile listener will eventually pick up correct state.
      // For safety, we could trigger ensureFreePlan here as well once profile becomes available,
      // but current logic in AuthProvider + this useEffect should cover it.
      // Keep showing loader.
      setStatus("loading");
    }

  }, [user, userProfile, authLoading, router, toast, refreshUserProfile, status, isFirebaseConfigured]);

  if (status === "loading" || status === "setting_plan" || status === "redirecting") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/30">
        <NexusLearnLogo className="h-20 w-auto text-primary mb-6" />
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {status === "setting_plan" ? "Finalizing your account..." : 
           status === "redirecting" ? "Redirecting to your dashboard..." :
           "Loading your experience..."}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
       <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/30">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="items-center text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <CardTitle className="text-xl">Account Setup Failed</CardTitle>
            <CardDescription>
              We encountered an error while setting up your account. Please try logging in again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => router.replace("/login")}>Return to Login</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fallback, should ideally be covered by states above
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/30">
      <NexusLearnLogo className="h-20 w-auto text-primary mb-6" />
      <p className="mt-4 text-muted-foreground">Please wait...</p>
    </div>
  );
}
