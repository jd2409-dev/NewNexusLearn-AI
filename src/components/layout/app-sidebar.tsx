
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NexusLearnLogo } from "@/components/icons/nexuslearn-logo";
import {
  Home,
  BookOpenText,
  ClipboardCheck,
  ScanText,
  Lightbulb,
  MessageSquareHeart,
  BarChart3,
  Settings,
  LifeBuoy,
  ChevronDown,
  ChevronUp,
  LogOut,
  User,
  Edit3, // Icon for Writing Assistant
} from "lucide-react";
import React from "react";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/learning-paths", icon: BookOpenText, label: "Learning Paths" },
  { href: "/exam-prep", icon: ClipboardCheck, label: "Exam Prep" },
  { href: "/textbook-analyzer", icon: ScanText, label: "Textbook Analyzer" },
  { href: "/quizzes", icon: Lightbulb, label: "Quizzes" },
  { href: "/ai-coach", icon: MessageSquareHeart, label: "AI Coach" },
  { href: "/writing-assistant", icon: Edit3, label: "Writing Assistant" }, // New item
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { open, setOpenMobile } = useSidebar();
  const { user, signOut, loading: authLoading } = useAuth();
  const [isAccountOpen, setIsAccountOpen] = React.useState(false);

  const closeMobileSidebar = () => {
    if (open && setOpenMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    closeMobileSidebar();
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

  if (!user) { // Should not happen if AppLayout protection works, but as a safeguard
    return null;
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={closeMobileSidebar}>
          <NexusLearnLogo className="h-8 w-auto text-primary group-data-[collapsible=icon]:hidden" />
           <NexusLearnLogo className="h-8 w-8 group-data-[collapsible=icon]:block hidden" />
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                  onClick={closeMobileSidebar}
                  tooltip={item.label}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border">
          <SidebarMenu>
              <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setIsAccountOpen(!isAccountOpen)} className="justify-between">
                      <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                              <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} alt="User avatar" data-ai-hint="user avatar"/>
                              <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                          </Avatar>
                          <span className="group-data-[collapsible=icon]:hidden truncate max-w-[120px]">{user.displayName || user.email?.split('@')[0] || "Account"}</span>
                      </div>
                      {isAccountOpen ? <ChevronUp className="h-4 w-4 group-data-[collapsible=icon]:hidden" /> : <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden" />}
                  </SidebarMenuButton>
              </SidebarMenuItem>
              {isAccountOpen && (
                   <SidebarMenuSub>
                      {/* <SidebarMenuSubItem>
                          <SidebarMenuSubButton onClick={() => {router.push('/profile'); closeMobileSidebar();}} isActive={pathname === "/profile"}>
                              <User className="h-4 w-4" /> Profile
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton onClick={() => {router.push('/settings'); closeMobileSidebar();}} isActive={pathname === "/settings"}>
                              <Settings className="h-4 w-4" /> Settings
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                       <SidebarMenuSubItem>
                          <SidebarMenuSubButton onClick={() => {router.push('/support'); closeMobileSidebar();}} isActive={pathname === "/support"}>
                              <LifeBuoy className="h-4 w-4" /> Support
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem> */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton onClick={handleLogout} disabled={authLoading}>
                            <LogOut className="h-4 w-4" /> Log Out
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                   </SidebarMenuSub>
              )}
          </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
