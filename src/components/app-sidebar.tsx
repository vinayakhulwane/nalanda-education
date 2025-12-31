'use client';

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  BookOpen, 
  LayoutDashboard, 
  BarChart3, 
  FilePlus2, 
  BookPlus, 
  Settings, 
  LogOut, 
  Users, 
  Wallet, 
  Building2, 
  Briefcase, 
  Info, 
  ChevronsLeft,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image"; // ✅ Import Image component
import { useDoc, useFirestore, useUser } from "@/firebase";
import { getAuth, signOut } from "firebase/auth";
import type { User as AppUser } from "@/types";
import { doc } from "firebase/firestore";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { SidebarMenuSkeleton } from "./ui/sidebar";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

// --- CUSTOM LOGO COMPONENT ---
function SidebarLogo({ isOpen }: { isOpen: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 py-2 overflow-hidden transition-all duration-300">
      {/* The Icon (Always Visible) - Now using your Custom Image */}
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
        <Image 
            src="/HD_Logo_TBG.png" 
            alt="Nalanda Logo" 
            fill
            className="object-cover"
            priority
        />
      </div>
      
      {/* The Text (Hidden when collapsed) */}
      <div className={cn("grid flex-1 text-left text-sm leading-tight transition-all duration-300 ease-in-out", isOpen ? "opacity-100 w-auto ml-1" : "opacity-0 w-0 overflow-hidden")}>
        <span className="truncate font-bold text-xl text-indigo-950 dark:text-indigo-100 tracking-tight">Nalanda</span>
      </div>
    </Link>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const firestore = useFirestore();
  const pathname = usePathname();
  // Get the sidebar state (expanded/collapsed)
  const { toggleSidebar, state } = useSidebar();
  const isExpanded = state === "expanded";

  const userDocRef = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userDocRef);

  const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth);
  }

  // --- MENU CONFIGURATION ---
  const studentMenu = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/courses", icon: BookOpen, label: "My Courses" },
    { href: "/progress", icon: BarChart3, label: "My Progress" },
    { href: "/wallet", icon: Wallet, label: "My Wallet" },
  ];

  const adminMenu = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/user-management", icon: Users, label: "User Management" },
    { href: "/academics", icon: Briefcase, label: "Academics" },
    { href: "/numerical-management", icon: BookPlus, label: "Numerical Management" },
    { href: "/worksheets", icon: FilePlus2, label: "Worksheet Generator" },
    { href: "/economy-settings", icon: Building2, label: "Economy Setting" },
  ];
  
  const teacherMenu = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/worksheets", icon: FilePlus2, label: "Worksheets" },
    { href: "/questions/new", icon: BookPlus, label: "Question Bank" },
    { href: "#", icon: Users, label: "Students" },
  ];

  const sharedMenuItems = [
      { href: "/about", icon: Info, label: "About Platform" },
  ];

  let menuItems: { href: string; icon: any; label: string }[] = [];
  if (userProfile?.role === 'admin') {
    menuItems = adminMenu;
  } else if (userProfile?.role === 'student') {
    menuItems = studentMenu;
  } else if (userProfile?.role === 'teacher') {
    menuItems = teacherMenu;
  }
  
  const renderMenuItems = () => {
    if (isProfileLoading) {
        return (
            <div className="space-y-2 px-2">
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
            </div>
        )
    }

    return menuItems.map((item) => (
         <SidebarMenuItem key={item.href + item.label}>
            <SidebarMenuButton 
                asChild 
                tooltip={item.label} 
                isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                className="transition-all duration-200 ease-in-out hover:bg-slate-100 dark:hover:bg-slate-800 h-10"
            >
                <Link href={item.href}>
                    <item.icon className="!h-5 !w-5" />
                    <span className="font-medium">{item.label}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    ));
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-16 border-b border-sidebar-border flex flex-row items-center justify-between px-4 transition-all bg-white dark:bg-slate-950">
        {/* Responsive Logo with Custom Image */}
        <SidebarLogo isOpen={isExpanded} />
        
        {/* Toggle Button (Only visible when expanded for a cleaner look) */}
        {isExpanded && (
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSidebar} 
                className="h-7 w-7 text-muted-foreground hover:text-foreground hidden md:flex"
            >
                <ChevronsLeft className="h-4 w-4" />
                <span className="sr-only">Collapse Sidebar</span>
            </Button>
        )}
      </SidebarHeader>

      <SidebarContent className="py-4 bg-slate-50/50 dark:bg-slate-900/50">
        <SidebarMenu className="gap-1.5 px-2">
          {renderMenuItems()}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2 bg-white dark:bg-slate-950">
        <SidebarMenu>
           {sharedMenuItems.map((item) => (
            <SidebarMenuItem key={item.href + item.label}>
                <SidebarMenuButton asChild tooltip={item.label} isActive={pathname.startsWith(item.href)} className="h-10">
                    <Link href={item.href}><item.icon className="!h-5 !w-5" /><span>{item.label}</span></Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings" className="h-10">
              <Link href="#"><Settings className="!h-5 !w-5" /><span>Settings</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton 
                asChild 
                tooltip="Sign Out" 
                onClick={handleSignOut}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 h-10"
            >
              <Link href="/"><LogOut className="!h-5 !w-5" /><span>Sign Out</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      {/* Interactive Rail for resizing/hovering */}
      <SidebarRail />
    </Sidebar>
  );
}