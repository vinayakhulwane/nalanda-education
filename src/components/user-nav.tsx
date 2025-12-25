import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { type User } from "@/types";
import { Coins, Gem, LogOut, Settings, UserCircle, Crown, Sparkles } from "lucide-react";
import Link from "next/link";
import { getAuth, signOut } from "firebase/auth";

export function UserNav({ user }: { user: User }) {
  // FIXED: Added null-checks to prevent the .split(' ') error
  const getInitials = (name: string | undefined | null) => {
    if (!name) return "U"; // Default to 'U' for User if name is missing
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth);
  };

  const isAdmin = user.role === 'admin';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar} alt={`@${user.name}`} />
            {/* Safe initial generation */}
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.name || "Nalanda User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          {/* Admin Specific Profile Links */}
          {isAdmin ? (
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Economy Settings</span>
              </Link>
            </DropdownMenuItem>
          ) : (
            <>
              {/* Student Specific Economy Display */}
              <DropdownMenuItem disabled className="flex justify-between">
                <div className="flex items-center">
                  <Coins className="mr-2 h-4 w-4 text-yellow-500" />
                  <span>Coins</span>
                </div>
                <span>{user.coins || 0}</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="flex justify-between">
                <div className="flex items-center">
                  <Crown className="mr-2 h-4 w-4 text-amber-500" />
                  <span>Gold</span>
                </div>
                <span>{user.gold || 0}</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="flex justify-between">
                <div className="flex items-center">
                  <Gem className="mr-2 h-4 w-4 text-blue-500" />
                  <span>Diamonds</span>
                </div>
                <span>{user.diamonds || 0}</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild onClick={handleSignOut} className="text-red-600 focus:text-red-600">
          <Link href="/">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
