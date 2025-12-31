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
import Image from "next/image";
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
    <Link 
      href="/dashboard" 
      className={cn(
        "flex items-center transition-all duration-300 ease-in-out",
        // When open: normal gap. When closed: center the icon, remove gap.
        isOpen ? "gap-3 px-1" : "gap-0 justify-center px-0" 
      )}
    >
      {/* Logo Container:
          - Expanded: h-10 w-10 (40px)
          - Collapsed: h-8 w-8 (32px)
      */}
      <div 
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full shadow-md bg-white border-2 border-indigo-500/50 transition-all duration-300",
          isOpen ? "h-10 w-10" : "h-8 w-8"
        )}
      >
        <Image 
            src="/HD_Logo_TBG.png" 
            alt="Nalanda Logo" 
            fill
            className="object-cover p-0.5" 
            priority
        />
      </div>
      
      {/* Text: Smoothly hides width and opacity */}
      <div 
        className={cn(
          "flex flex-col justify-center overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap",
          isOpen ? "w-auto opacity-100 ml-1" : "w-0 opacity-0 ml-0"
        )}
      >
        <span className="font-bold text-xl text-white tracking-tight leading-none">Nalanda</span>
      </div>
    </Link>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const firestore = useFirestore();
  const pathname = usePathname();
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
                <SidebarMenuSkeleton showIcon className="opacity-20" />
                <SidebarMenuSkeleton showIcon className="opacity-20" />
                <SidebarMenuSkeleton showIcon className="opacity-20" />
            </div>
        )
    }

    return menuItems.map((item) => {
         const isActive = pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard');
         return (
            <SidebarMenuItem key={item.href + item.label}>
                <SidebarMenuButton 
                    asChild 
                    tooltip={item.label} 
                    isActive={isActive}
                    className={cn(
                        "h-11 transition-all duration-200 ease-in-out font-medium",
                        isActive 
                            ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white shadow-md shadow-indigo-900/20" 
                            : "text-slate-400 hover:bg-white/10 hover:text-white"
                    )}
                >
                    <Link href={item.href}>
                        <item.icon className="!h-5 !w-5" />
                        <span>{item.label}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
         );
    });
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-slate-900 text-slate-100" {...props}>
      
      {/* Header - Adjusted Padding for Collapse State */}
      <SidebarHeader 
        className={cn(
            "h-16 border-b border-slate-800 flex flex-row items-center transition-all bg-slate-900",
            isExpanded ? "justify-between px-4" : "justify-center px-0"
        )}
      >
        <SidebarLogo isOpen={isExpanded} />
        
        {/* Toggle Button - Hidden when collapsed to keep icon clean */}
        {isExpanded && (
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSidebar} 
                className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 hidden md:flex"
            >
                <ChevronsLeft className="h-4 w-4" />
                <span className="sr-only">Collapse Sidebar</span>
            </Button>
        )}
      </SidebarHeader>

      {/* Content */}
      <SidebarContent className="py-4 bg-slate-900 custom-scrollbar">
        <SidebarMenu className="gap-1.5 px-2">
          {renderMenuItems()}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-slate-800 p-2 bg-slate-900">
        <SidebarMenu className="gap-1">
           {sharedMenuItems.map((item) => (
            <SidebarMenuItem key={item.href + item.label}>
                <SidebarMenuButton 
                    asChild 
                    tooltip={item.label} 
                    className={cn("h-10 text-slate-400 hover:bg-white/10 hover:text-white", pathname.startsWith(item.href) && "text-white bg-white/10")}
                >
                    <Link href={item.href}><item.icon className="!h-5 !w-5" /><span>{item.label}</span></Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings" className="h-10 text-slate-400 hover:bg-white/10 hover:text-white">
              <Link href="#"><Settings className="!h-5 !w-5" /><span>Settings</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton 
                asChild 
                tooltip="Sign Out" 
                onClick={handleSignOut}
                className="h-10 text-red-400 hover:text-red-300 hover:bg-red-950/30 mt-2"
            >
              <Link href="/"><LogOut className="!h-5 !w-5" /><span>Sign Out</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail className="hover:after:bg-indigo-500/50" />
    </Sidebar>
  );
}