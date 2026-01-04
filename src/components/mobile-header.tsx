'use client';

import { BrandLogo } from "@/components/brand-logo";
import { Bell } from "lucide-react";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { UserNav } from "./user-nav";
import { doc } from "firebase/firestore";
import type { User as AppUser } from "@/types";
import { Skeleton } from "./ui/skeleton";

export function MobileHeader() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Fetch the full user profile from Firestore
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userDocRef);

  return (
    <header className="lg:hidden sticky top-0 z-50 w-full bg-[#1e1b4b] text-white px-4 py-3 flex items-center justify-between shadow-md transition-all">
      {/* Left Side: Brand Logo */}
      <div className="flex items-center gap-3">
        <BrandLogo variant="white" size={32} />
        <span className="font-extrabold tracking-tight text-lg">Nalanda</span>
      </div>

      {/* Right Side: Notifications & Profile */}
      <div className="flex items-center gap-4">
        <button className="text-slate-300 hover:text-white transition-colors">
            <Bell className="h-5 w-5" />
        </button>

        {/* Profile Dropdown */}
        {isUserLoading || isProfileLoading ? (
            <Skeleton className="h-8 w-8 rounded-full bg-white/20" />
        ) : userProfile ? (
            <UserNav user={userProfile} />
        ) : null}
      </div>
    </header>
  );
}
