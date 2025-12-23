'use client';

import { StudentDashboard } from "@/components/student-dashboard";
import { TeacherDashboard } from "@/components/teacher-dashboard";
import { useUser } from "@/firebase";
import { mockCourses } from "@/lib/data";
import type { User as AppUser } from "@/types";

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  // For now, we'll default to student. In a real app, you'd fetch the user's role from your database.
  const role: 'student' | 'teacher' = 'student';

  const appUser: AppUser | null = user ? {
    id: user.uid,
    name: user.displayName || 'Anonymous',
    email: user.email || '',
    avatar: user.photoURL || '',
    role: role,
    virtualCurrency: {
        coins: 0,
        gold: 0,
        diamonds: 0
    }
  } : null;


  if (role === 'student') {
    return <StudentDashboard user={appUser} courses={mockCourses} />;
  }
  
  if (role === 'teacher') {
    return <TeacherDashboard user={appUser!} />;
  }

  return null;
}
