'use client';

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <Image 
          src="/HD_Logo_TBG.png" 
          alt="Nalanda Loading" 
          width={128} 
          height={128} 
          className="animate-pulse-once"
          priority
        />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
        <Sidebar collapsible="icon" variant="inset" side="left">
            <AppSidebar />
        </Sidebar>
        <SidebarInset>
            <AppHeader />
            <main className="p-4 lg:p-6 !pt-0">
                {children}
            </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
