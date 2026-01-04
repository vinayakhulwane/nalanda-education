'use client';

import { Trophy } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { BrandLogo } from "./brand-logo";

export function MobileHeader() {
  return (
    <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between bg-[#1e1b4b] text-white p-4 shadow-md">
      <Link href="/dashboard" className="flex items-center gap-2">
        <BrandLogo variant='white' size={32} />
        <span className="font-bold tracking-tight">Nalanda</span>
      </Link>
      <div className="flex items-center gap-4">
        <Trophy className="h-6 w-6" />
        <Avatar className="h-8 w-8">
            <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
            <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
