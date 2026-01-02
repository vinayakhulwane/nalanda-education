'use client';

import type { User } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, Crown, Gem, BrainCircuit } from 'lucide-react';

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

  const balances = [
    { name: 'Coins', value: userProfile.coins || 0, icon: Coins, color: 'text-yellow-500' },
    { name: 'Gold', value: userProfile.gold || 0, icon: Crown, color: 'text-amber-500' },
    { name: 'Diamonds', value: userProfile.diamonds || 0, icon: Gem, color: 'text-blue-500' },
    { name: 'AI Credits', value: userProfile.aiCredits || 0, icon: BrainCircuit, color: 'text-indigo-500' },
  ];

  return (
    <Card>
        <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {balances.map(({ name, value, icon: Icon, color }) => (
                    <div key={name} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <Icon className={`h-10 w-10 ${color} shrink-0`} />
                        <div>
                            <p className="text-2xl font-bold">{value}</p>
                            <p className="text-sm text-muted-foreground">{name}</p>
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
  );
}
