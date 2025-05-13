
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { setUserPlan } from "@/lib/user-service";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NexusLearnLogo } from "@/components/icons/nexuslearn-logo";

export default function SelectPlanPage() {
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSettingPlan, setIsSettingPlan] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return; // Wait for auth state to resolve
    }

    if (!user) {
      router.replace("/login"); // Should be handled by AppLayout, but as a safeguard
      return;
    }

    if (userProfile) {
      if (userProfile.plan) {
        router.replace("/dashboard"); // User already has a plan
      } else {
        // User exists, profile loaded, but plan is null. Auto-assign free plan.
        const autoAssignPlan = async () => {
          if (isSettingPlan) return;
          setIsSettingPlan(true);
          try {
            await setUserPlan(user.uid, "free");
            await refreshUserProfile(); // Refresh context with new plan info
            toast({ 
              title: "Account Setup Complete!", 
              description: "Your account has been set up with the default plan." 
            });
            router.replace("/dashboard");
          } catch (error) {
            toast({ 
              title: "Error", 
              description: "Could not set up your default plan. Please try logging in again.", 
              variant: "destructive" 
            });
            console.error("Error auto-assigning plan:", error);
            // Potentially log out user or redirect to an error page
            router.replace("/login"); 
          } finally {
            setIsSettingPlan(false);
          }
        };
        autoAssignPlan();
      }
    }
    // If userProfile is null and authLoading is false, AuthProvider is still fetching/creating it.
    // Loop will continue until userProfile is available.
  }, [user, userProfile, authLoading, router, toast, refreshUserProfile, isSettingPlan]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/30">
      <NexusLearnLogo className="h-20 w-auto text-primary mb-6" />
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">
        {isSettingPlan ? "Setting up your account..." : "Finalizing your access..."}
      </p>
    </div>
  );
}
