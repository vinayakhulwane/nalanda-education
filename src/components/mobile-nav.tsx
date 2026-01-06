'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, BookOpen, TrendingUp, Wallet, LayoutDashboard, Users, 
  Briefcase, BookPlus, FilePlus2, BrainCircuit, Building2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/firebase";

// --- Student Navigation Items ---
const studentNavItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/courses", icon: BookOpen, label: "My Courses" },
  { href: "/progress", icon: TrendingUp, label: "My Progress" },
  { href: "/wallet", icon: Wallet, label: "Wallet" },
];

// --- Admin Navigation Items ---
const adminNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/user-management", icon: Users, label: "Users" },
  { href: "/academics", icon: Briefcase, label: "Academics" },
  { href: "/numerical-management", icon: BookPlus, label: "Numericals" },
  { href: "/worksheets", icon: FilePlus2, label: "Worksheets" },
  { href: "/ai-settings", icon: BrainCircuit, label: "AI" },
  { href: "/economy-settings", icon: Building2, label: "Economy" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { userProfile, isUserProfileLoading } = useUser();

  const isActive = (path: string) => {
      // Special case for dashboard to avoid matching all sub-routes
      if (path === '/dashboard') {
          return pathname === path;
      }
      return pathname?.startsWith(path);
  };
  
  // Don't render anything if loading or if there's no profile
  if (isUserProfileLoading || !userProfile) {
    return null;
  }

  // --- ADMIN VIEW ---
  if (userProfile.role === 'admin' || userProfile.role === 'teacher') {
    return (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 px-2 py-2 shadow-[0_-4px_10px_rgba(0,0,0,0.2)] safe-area-pb">
        <div className="flex items-center overflow-x-auto no-scrollbar gap-1">
          {adminNavItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href} 
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1 rounded-lg transition-colors min-w-[60px]",
                isActive(item.href) ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive(item.href) && "fill-current/20")} />
              <span className="text-[10px] font-bold truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    );
  }

  // --- STUDENT VIEW (Default) ---
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-2 py-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] safe-area-pb">
      <div className="flex justify-between items-end max-w-md mx-auto">
        {studentNavItems.map((item) => (
          <Link 
            key={item.href}
            href={item.href} 
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors",
              isActive(item.href) ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <item.icon className={cn("h-6 w-6", isActive(item.href) && "fill-current/20")} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
