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
import { Coins, Diamond, Gem, LogOut } from "lucide-react";
import Link from "next/link";
import { getAuth, signOut } from "firebase/auth";

export function UserNav({ user }: { user: User }) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  }

  const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar} alt={`@${user.name}`} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled className="flex justify-between">
            <div className="flex items-center">
              <Coins className="mr-2 text-yellow-500" />
              <span>Coins</span>
            </div>
            <span>{user.coins}</span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="flex justify-between">
             <div className="flex items-center">
              <Gem className="mr-2 text-red-500" />
              <span>Gold</span>
            </div>
            <span>{user.gold}</span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="flex justify-between">
            <div className="flex items-center">
              <Diamond className="mr-2 text-blue-500" />
              <span>Diamonds</span>
            </div>
            <span>{user.diamonds}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild onClick={handleSignOut}>
          <Link href="/">
            <LogOut className="mr-2" />
            <span>Sign out</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
