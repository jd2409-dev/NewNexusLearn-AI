"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Settings, User, LogOut, LogInIcon } from "lucide-react";
import { NexusLearnLogo } from "@/components/icons/nexuslearn-logo";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

export function AppHeader() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
  };

  const getInitials = (email?: string | null) => {
    if (!email) return "NL";
    const namePart = email.split("@")[0];
    if (namePart.includes('.')) {
      return namePart.split('.').map(p => p[0]).slice(0,2).join("").toUpperCase();
    }
    if (namePart.includes('_')) {
      return namePart.split('_').map(p => p[0]).slice(0,2).join("").toUpperCase();
    }
     if (namePart.includes('-')) {
      return namePart.split('-').map(p => p[0]).slice(0,2).join("").toUpperCase();
    }
    return namePart.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <div className="hidden md:block">
        <Link href={user ? "/dashboard" : "/login"}>
          <NexusLearnLogo className="h-8 w-auto" />
        </Link>
      </div>
      <div className="flex w-full items-center justify-end gap-4">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} alt="User avatar" data-ai-hint="user avatar" />
                  <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate">
                    {user.displayName || user.email?.split('@')[0] || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* These routes would need to be created */}
              {/* <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator /> */}
              <DropdownMenuItem onClick={handleLogout} disabled={loading}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
           !loading && ( // Only show login if not loading and no user
            <Button onClick={() => router.push('/login')} variant="outline">
              <LogInIcon className="mr-2 h-4 w-4" />
              Login
            </Button>
           )
        )}
      </div>
    </header>
  );
}
