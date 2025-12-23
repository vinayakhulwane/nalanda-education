'use client';
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockStudent, mockTeacher } from "@/lib/data";
import { BookOpen, LayoutDashboard, BarChart3, FilePlus2, BookPlus, Settings, LogOut, ChevronsRightLeft, User, Users } from "lucide-react";
import Link from "next/link";
import { Logo } from "./logo";
import { useUser } from "@/firebase";
import { getAuth, signOut } from "firebase/auth";

export function AppSidebar() {
  const { user } = useUser();
  // For now, we'll default to student. In a real app, you'd fetch the user's role from your database.
  const role = 'student'; 

  const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth);
  }

  const studentMenu = (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Dashboard" isActive>
          <Link href="/dashboard"><LayoutDashboard /><span>Dashboard</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Courses">
          <Link href="/courses"><BookOpen /><span>My Courses</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Progress">
          <Link href="/progress"><BarChart3 /><span>My Progress</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  );

  const teacherMenu = (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Dashboard" isActive>
          <Link href="/dashboard"><LayoutDashboard /><span>Dashboard</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Worksheets">
          <Link href="/worksheets"><FilePlus2 /><span>Worksheets</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Questions">
          <Link href="/questions/new"><BookPlus /><span>Question Bank</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Students">
          <Link href="#"><Users /><span>Students</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  );

  return (
    <>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {role === 'student' ? studentMenu : teacherMenu}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
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
