"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { setUserPlan } from "@/lib/user-service";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NexusLearnLogo } from "@/components/icons/nexuslearn-logo";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SelectPlanPage() {
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "setting_plan" | "redirecting" | "error">("loading");

  useEffect(() => {
    if (authLoading) {
      setStatus("loading");
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (userProfile) {
      if (userProfile.plan) { // User already has a plan (e.g. 'free' or any other)
        setStatus("redirecting");
        router.replace("/dashboard");
      } else {
        // User exists, profile loaded, but plan is null. Auto-assign 'free' plan.
        const autoAssignPlan = async () => {
          if (status === "setting_plan") return;
          setStatus("setting_plan");
          try {
            await setUserPlan(user.uid, "free"); // All features are free, so 'free' plan implies access to everything
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
            console.error("Error auto-assigning plan:", error);
            setStatus("error");
          }
        };
        autoAssignPlan();
      }
    }
    // If userProfile is null and authLoading is false, AuthProvider is still fetching/creating it.
  }, [user, userProfile, authLoading, router, toast, refreshUserProfile, status]);

  if (status === "loading" || status === "setting_plan" || status === "redirecting") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/30">
        <NexusLearnLogo className="h-20 w-auto text-primary mb-6" />
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {status === "setting_plan" ? "Setting up your account..." : 
           status === "redirecting" ? "Redirecting to your dashboard..." :
           "Finalizing your access..."}
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
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  );
}
