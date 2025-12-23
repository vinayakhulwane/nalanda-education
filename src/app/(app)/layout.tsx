import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
