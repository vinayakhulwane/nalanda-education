'use client';

import { StudentDashboard } from "@/components/student-dashboard";
import { TeacherDashboard } from "@/components/teacher-dashboard";
import { useUser, useDoc, useFirestore } from "@/firebase";
import type { User as AppUser } from "@/types";
import { doc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import Image from "next/image";
import { BrandLogo } from "@/components/brand-logo";

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
      <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center gap-4 bg-background">
        <div className="animate-pulse">
            <BrandLogo variant='primary' size={64} />
        </div>
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
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
