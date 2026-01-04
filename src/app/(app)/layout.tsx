'use client';

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { BrandLogo } from "@/components/brand-logo";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
        <div className="animate-pulse">
            <BrandLogo variant='primary' size={64} />
        </div>
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
