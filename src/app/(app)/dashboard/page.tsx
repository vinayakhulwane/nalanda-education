'use client';

import { StudentDashboard } from "@/components/student-dashboard";
import { TeacherDashboard } from "@/components/teacher-dashboard";
import { useUser, useDoc, useFirestore } from "@/firebase";
import type { User as AppUser } from "@/types";
import { doc } from "firebase/firestore";
import { Loader2, GraduationCap } from "lucide-react"; // Added Icon
import { useMemo } from "react";

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userDocRef);

  // Modern Loading Screen
  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] w-full items-center justify-center gap-4 bg-slate-50/50 dark:bg-slate-950/50">
        <div className="relative">
             <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
             <div className="relative bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-lg border">
                <GraduationCap className="h-8 w-8 text-primary animate-bounce" />
             </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Loading your dashboard...</span>
        </div>
      </div>
    );
  }
  
  if (!userProfile) {
    return (
        <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
             <div className="text-center space-y-2">
                <p className="font-semibold text-lg">Profile Not Found</p>
                <p className="text-muted-foreground text-sm">We couldn't load your user profile.</p>
             </div>
        </div>
    )
  }

  if (userProfile.role === 'student') {
    return <StudentDashboard user={userProfile} />;
  }
  
  if (userProfile.role === 'teacher' || userProfile.role === 'admin') {
    return <TeacherDashboard user={userProfile} />;
  }

  return null;
}