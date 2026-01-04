'use client';

import type { User } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, Crown, Gem, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WalletBalancesProps {
  userProfile: User | null;
}

export function WalletBalances({ userProfile }: WalletBalancesProps) {
  if (!userProfile) return null;

  const balances = [
    { 
      name: 'Coins', 
      value: userProfile.coins || 0, 
      icon: Coins, 
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
    },
    { 
      name: 'Gold', 
      value: userProfile.gold || 0, 
      icon: Crown, 
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30'
    },
    { 
      name: 'Diamonds', 
      value: userProfile.diamonds || 0, 
      icon: Gem, 
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    { 
      name: 'Credits', 
      value: userProfile.aiCredits || 0, 
      icon: BrainCircuit, 
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30'
    },
  ];

  return (
    <Card className="w-full shadow-sm border-slate-200 dark:border-slate-800">
      <CardContent className="p-0">
        {/* Mobile First: Flex Row with dividers for a clean 'Stat Bar' look */}
        <div className="flex items-center justify-between divide-x divide-slate-100 dark:divide-slate-800">
          {balances.map(({ name, value, icon: Icon, color, bgColor }) => (
            <div 
              key={name} 
              className="flex-1 flex flex-col items-center justify-center py-4 px-1 gap-1.5 active:bg-slate-50 dark:active:bg-slate-900 transition-colors"
            >
              <div className={cn("p-2 rounded-full", bgColor)}>
                <Icon className={cn("h-4 w-4 md:h-5 md:w-5", color)} />
              </div>
              <div className="text-center">
                <p className="text-lg md:text-xl font-black leading-none mb-0.5">
                  {/* Compact number formatting for mobile (e.g., 1.2k) */}
                  {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                </p>
                <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}