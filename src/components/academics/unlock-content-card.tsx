
'use client';

import type { CustomTab } from "@/types";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { KeyRound, Coins, Crown, Gem, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface UnlockContentCardProps {
    tab: CustomTab;
    onUnlock: () => void;
}

const currencyIcons = {
    coin: Coins,
    gold: Crown,
    diamond: Gem,
};

export function UnlockContentCard({ tab, onUnlock }: UnlockContentCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    const { cost = 0, currency = 'coin', label } = tab;
    const CurrencyIcon = currencyIcons[currency] || Coins;

    const handleUnlockClick = async () => {
        setIsLoading(true);
        try {
            await onUnlock();
        } catch (error) {
            console.error("Unlock failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="mt-6 bg-gradient-to-br from-amber-200 via-amber-100 to-amber-200 dark:from-amber-900/50 dark:via-amber-800/20 dark:to-amber-900/50 border-amber-300 dark:border-amber-700/50 overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-5 dark:opacity-10"></div>
            <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-amber-300/50 dark:bg-amber-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-amber-300/50 dark:bg-amber-500/10 rounded-full blur-3xl"></div>
            
            <CardContent className="relative flex flex-col items-center justify-center text-center p-8 md:p-16 z-10">
                <div className="mb-6 p-5 bg-amber-500/20 rounded-full text-amber-700 dark:text-amber-300 border-2 border-amber-500/30">
                    <Sparkles className="h-12 w-12" />
                </div>
                <h2 className="text-2xl font-bold font-headline mb-2 text-amber-900 dark:text-amber-100">Unlock Exclusive Content</h2>
                <p className="text-amber-800/80 dark:text-amber-200/80 max-w-md mb-6">
                    This section, <span className="font-semibold text-amber-900 dark:text-amber-100">"{label}"</span>, contains premium materials. Pay the one-time fee to gain permanent access.
                </p>

                <Button 
                    size="lg" 
                    className={cn(
                        "h-14 text-lg shadow-lg text-amber-950 bg-amber-400 hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-amber-950",
                        "transition-transform duration-200 hover:scale-105"
                    )}
                    onClick={handleUnlockClick}
                    disabled={isLoading}
                >
                    <div className="flex items-center gap-4">
                        <span>Unlock for</span>
                        <div className="flex items-center gap-2 font-bold bg-white/30 dark:bg-black/20 px-4 py-1.5 rounded-full">
                           <CurrencyIcon className="h-5 w-5"/>
                           {cost}
                        </div>
                    </div>
                </Button>
            </CardContent>
        </Card>
    )
}
