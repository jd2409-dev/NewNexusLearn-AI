"use client";

import { useState, type FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { NexusLearnLogo } from "@/components/icons/nexuslearn-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const { signIn, signUp, loading: authLoading, error: authError, clearError, user, isFirebaseConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !authLoading && isFirebaseConfigured) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router, isFirebaseConfigured]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured) {
        // Error message is already set by AuthProvider and displayed in the Alert.
        return;
    }
    clearError();
    let result;
    if (isSigningUp) {
      result = await signUp(email, password);
    } else {
      result = await signIn(email, password);
    }
    if (result) {
      // AuthProvider or useEffect above will handle redirect
    }
  };

  if (user && !authLoading && isFirebaseConfigured) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/30">
        <NexusLearnLogo className="h-20 w-auto mx-auto text-primary mb-6" />
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="items-center text-center">
          <NexusLearnLogo className="h-16 w-auto text-primary mb-4" />
          <CardTitle className="text-2xl">{isSigningUp ? "Create Your Account" : "Welcome Back!"}</CardTitle>
          <CardDescription>
            {isFirebaseConfigured 
              ? (isSigningUp ? "Sign up to unlock your learning potential with NexusLearn AI." : "Log in to continue your personalized learning journey.")
              : "Application is not correctly configured."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {authError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{!isFirebaseConfigured ? "Configuration Error" : "Authentication Error"}</AlertTitle>
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={authLoading || !isFirebaseConfigured}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={authLoading || !isFirebaseConfigured}
              />
            </div>
            <Button type="submit" className="w-full" disabled={authLoading || !isFirebaseConfigured}>
              {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSigningUp ? "Sign Up" : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center">
          <Button 
            variant="link" 
            onClick={() => { 
              if (isFirebaseConfigured) { 
                setIsSigningUp(!isSigningUp); 
                clearError(); 
              }
            }} 
            disabled={authLoading || !isFirebaseConfigured}
          >
            {isSigningUp ? "Already have an account? Login" : "Don't have an account? Sign Up"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
