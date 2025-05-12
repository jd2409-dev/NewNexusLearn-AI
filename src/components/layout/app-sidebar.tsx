"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
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
} from "lucide-react";
import React from "react";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/learning-paths", icon: BookOpenText, label: "Learning Paths" },
  { href: "/exam-prep", icon: ClipboardCheck, label: "Exam Prep" },
  { href: "/textbook-analyzer", icon: ScanText, label: "Textbook Analyzer" },
  { href: "/quizzes", icon: Lightbulb, label: "Quizzes" },
  { href: "/ai-coach", icon: MessageSquareHeart, label: "AI Coach" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { open, setOpenMobile } = useSidebar();
  const [isAccountOpen, setIsAccountOpen] = React.useState(false);

  const closeMobileSidebar = () => {
    if (open && setOpenMobile) {
      setOpenMobile(false);
    }
  };

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
                            <AvatarImage src="https://picsum.photos/100/100?random=user" alt="User avatar" data-ai-hint="user avatar"/>
                            <AvatarFallback>NL</AvatarFallback>
                        </Avatar>
                        <span className="group-data-[collapsible=icon]:hidden">User Account</span>
                    </div>
                    {isAccountOpen ? <ChevronUp className="h-4 w-4 group-data-[collapsible=icon]:hidden" /> : <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden" />}
                </SidebarMenuButton>
            </SidebarMenuItem>
            {isAccountOpen && (
                 <SidebarMenuSub>
                    <SidebarMenuSubItem>
                        <Link href="/settings" passHref legacyBehavior>
                            <SidebarMenuSubButton isActive={pathname === "/settings"} onClick={closeMobileSidebar}>
                                <Settings className="h-4 w-4" /> Settings
                            </SidebarMenuSubButton>
                        </Link>
                    </SidebarMenuSubItem>
                     <SidebarMenuSubItem>
                        <Link href="/support" passHref legacyBehavior>
                            <SidebarMenuSubButton isActive={pathname === "/support"} onClick={closeMobileSidebar}>
                                <LifeBuoy className="h-4 w-4" /> Support
                            </SidebarMenuSubButton>
                        </Link>
                    </SidebarMenuSubItem>
                 </SidebarMenuSub>
            )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
