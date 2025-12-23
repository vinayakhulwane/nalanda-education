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

// In a real app, you'd get the user from a session or context
const user = mockStudent; // or mockTeacher

export function AppSidebar() {
  const currentUser = user.role === 'student' ? mockStudent : mockTeacher;

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
          {currentUser.role === 'student' ? studentMenu : teacherMenu}
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
            <SidebarMenuButton asChild tooltip="Sign Out">
              <Link href="/"><LogOut /><span>Sign Out</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
