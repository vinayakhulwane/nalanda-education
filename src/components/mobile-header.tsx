'use client';

import { BrandLogo } from "@/components/brand-logo";
import { Bell } from "lucide-react"; // Or 'Trophy' if you prefer
import { useUser } from "@/firebase"; // ✅ Import your auth hook
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

export function MobileHeader() {
  // Get the current logged-in user
  const { user } = useUser();

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

        {/* Profile Picture Link */}
        <Link href="/profile">
            <Avatar className="h-8 w-8 border-2 border-white/20 shadow-sm">
              {/* ✅ This pulls the real Gmail photo */}
              <AvatarImage 
                src={user?.photoURL || ''} 
                alt={user?.displayName || 'User'} 
                className="object-cover"
              />
              {/* Fallback if no photo (First letter of name) */}
              <AvatarFallback className="bg-indigo-500 text-white text-xs font-bold">
                {user?.displayName?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
        </Link>
      </div>
    </header>
  );
}