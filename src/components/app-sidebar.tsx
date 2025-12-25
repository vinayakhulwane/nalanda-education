'use client';
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { mockStudent, mockTeacher } from "@/lib/data";
import { BookOpen, LayoutDashboard, BarChart3, FilePlus2, BookPlus, Settings, LogOut, Users, Wallet, Home, Building2, Briefcase, BookCopy, History } from "lucide-react";
import Link from "next/link";
import { Logo } from "./logo";
import { useDoc, useFirestore, useUser } from "@/firebase";
import { getAuth, signOut } from "firebase/auth";
import type { User as AppUser } from "@/types";
import { doc } from "firebase/firestore";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { SidebarMenuSkeleton } from "./ui/sidebar";

export function AppSidebar() {
  const { user } = useUser();
  const firestore = useFirestore();
  const pathname = usePathname();

  const userDocRef = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userDocRef);

  const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth);
  }

  const studentMenu = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/courses", icon: BookOpen, label: "My Courses" },
    { href: "/progress", icon: BarChart3, label: "My Progress" },
    { href: "#", icon: Wallet, label: "My Wallet" },
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
            <>
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
            </>
        )
    }

    return menuItems.map((item) => (
         <SidebarMenuItem key={item.href + item.label}>
            <SidebarMenuButton asChild tooltip={item.label} isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}>
                <Link href={item.href}><item.icon /><span>{item.label}</span></Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    ));
  }


  return (
    <>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {renderMenuItems()}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <Link href="#"><Settings /><span>Settings</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Sign Out" onClick={handleSignOut}>
              <Link href="/"><LogOut /><span>Sign Out</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
