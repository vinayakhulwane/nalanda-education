'use client';

import { StudentDashboard } from "@/components/student-dashboard";
import { TeacherDashboard } from "@/components/teacher-dashboard";
import { useUser, useDoc, useFirestore } from "@/firebase";
import { mockCourses } from "@/lib/data";
import type { User as AppUser } from "@/types";
import { doc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userDocRef);

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!userProfile) {
    // This can happen briefly or if the user document doesn't exist
    return (
         <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
            <p>Could not load user profile.</p>
        </div>
    )
  }

  if (userProfile.role === 'student') {
    return <StudentDashboard user={userProfile} courses={mockCourses} />;
  }
  
  if (userProfile.role === 'teacher' || userProfile.role === 'admin') {
    return <TeacherDashboard user={userProfile} />;
  }

  return null;
}
