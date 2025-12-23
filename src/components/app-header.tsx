'use client';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "./user-nav";
import { useDoc, useFirestore, useUser } from "@/firebase";
import type { User as AppUser } from "@/types";
import { doc } from "firebase/firestore";
import { useMemo } from "react";
import { Skeleton } from "./ui/skeleton";

export function AppHeader() {
    const { user } = useUser();
    const firestore = useFirestore();

     const userDocRef = useMemo(() => {
        if (!firestore || !user?.uid) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user?.uid]);

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userDocRef);


    if (isProfileLoading || !userProfile) {
        return (
             <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
                <SidebarTrigger className="md:hidden" />
                <div className="ml-auto">
                    <Skeleton className="h-9 w-9 rounded-full" />
                </div>
            </header>
        )
    }

    return (
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
                <div className="ml-auto flex-1 sm:flex-initial">
                </div>
                {userProfile && <UserNav user={userProfile}/>}
            </div>
        </header>
    )
}
