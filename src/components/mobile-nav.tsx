'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, TrendingUp, Wallet } from "lucide-react"; // ✅ Imported new icons
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  // Helper function to check if link is active
  const isActive = (path: string) => pathname === path || pathname?.startsWith(`${path}/`);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-2 py-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] safe-area-pb">
      <div className="flex justify-between items-end max-w-md mx-auto">
        
        {/* 1. HOME */}
        <Link 
          href="/dashboard" 
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors",
            isActive('/dashboard') ? "text-primary" : "text-muted-foreground hover:text-primary"
          )}
        >
          <Home className={cn("h-6 w-6", isActive('/dashboard') && "fill-current/20")} />
          <span className="text-[10px] font-bold">Home</span>
        </Link>

        {/* 2. MY COURSES */}
        <Link 
          href="/courses" 
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors",
            isActive('/courses') ? "text-primary" : "text-muted-foreground hover:text-primary"
          )}
        >
          <BookOpen className={cn("h-6 w-6", isActive('/courses') && "fill-current/20")} />
          <span className="text-[10px] font-medium">My Courses</span>
        </Link>

        {/* 3. MY PROGRESS */}
        <Link 
          href="/progress" 
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors",
            isActive('/progress') ? "text-primary" : "text-muted-foreground hover:text-primary"
          )}
        >
          <TrendingUp className={cn("h-6 w-6", isActive('/progress') && "fill-current/20")} />
          <span className="text-[10px] font-medium">My Progress</span>
        </Link>

        {/* 4. WALLET */}
        {/* Ensure you have a page at /wallet or change this href to /profile if the wallet is there */}
        <Link 
          href="/wallet" 
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors",
            isActive('/wallet') ? "text-primary" : "text-muted-foreground hover:text-primary"
          )}
        >
          <Wallet className={cn("h-6 w-6", isActive('/wallet') && "fill-current/20")} />
          <span className="text-[10px] font-medium">Wallet</span>
        </Link>

      </div>
    </nav>
  );
}