'use client';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "./user-nav";
import { useUser } from "@/firebase";
import type { User as AppUser } from "@/types";

export function AppHeader() {
    const { user } = useUser();

    // Create a mock user structure from the firebase user
    const appUser: AppUser | null = user ? {
        id: user.uid,
        name: user.displayName || 'Anonymous',
        email: user.email || '',
        avatar: user.photoURL || '',
        role: 'student', // default role
        virtualCurrency: {
            coins: 0,
            gold: 0,
            diamonds: 0
        }
    } : null;

    return (
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
                <div className="ml-auto flex-1 sm:flex-initial">
                </div>
                {appUser && <UserNav user={appUser}/>}
            </div>
        </header>
    )
}
