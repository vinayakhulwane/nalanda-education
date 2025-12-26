'use client';

import type { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, Crown, Gem } from 'lucide-react';

interface WalletBalancesProps {
  userProfile: User | null;
}

export function WalletBalances({ userProfile }: WalletBalancesProps) {
  if (!userProfile) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Could not load user balance information.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="flex flex-col items-center justify-center p-6 text-center">
        <Coins className="h-12 w-12 text-yellow-500 mb-4" />
        <p className="text-4xl font-bold">{userProfile.coins}</p>
        <p className="text-muted-foreground mt-1">Coins</p>
      </Card>
      <Card className="flex flex-col items-center justify-center p-6 text-center">
        <Crown className="h-12 w-12 text-amber-500 mb-4" />
        <p className="text-4xl font-bold">{userProfile.gold}</p>
        <p className="text-muted-foreground mt-1">Gold</p>
      </Card>
      <Card className="flex flex-col items-center justify-center p-6 text-center">
        <Gem className="h-12 w-12 text-blue-500 mb-4" />
        <p className="text-4xl font-bold">{userProfile.diamonds}</p>
        <p className="text-muted-foreground mt-1">Diamonds</p>
      </Card>
    </div>
  );
}
