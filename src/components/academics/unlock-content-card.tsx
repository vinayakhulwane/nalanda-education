'use client';

import type { CustomTab } from "@/types";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { KeyRound, Coins, Crown, Gem } from "lucide-react";
import { useState } from "react";

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
            // Error toast is handled in the parent component
            console.error("Unlock failed", error);
        } finally {
            // The parent will re-render, so we don't strictly need to set loading to false,
            // but it's good practice in case the unlock fails without a re-render.
            setIsLoading(false);
        }
    };

    return (
        <Card className="mt-6 bg-gradient-to-br from-muted/30 to-muted/50">
            <CardContent className="flex flex-col items-center justify-center text-center p-8 md:p-16">
                <div className="mb-6 p-5 bg-primary/10 rounded-full text-primary">
                    <KeyRound className="h-12 w-12" />
                </div>
                <h2 className="text-2xl font-bold font-headline mb-2">Unlock Exclusive Content</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                    This section, <span className="font-semibold text-foreground">"{label}"</span>, contains premium materials. Pay the one-time fee to gain permanent access.
                </p>

                <Button 
                    size="lg" 
                    className="h-14 text-lg shadow-lg"
                    onClick={handleUnlockClick}
                    disabled={isLoading}
                >
                    <div className="flex items-center gap-4">
                        <span>Unlock for</span>
                        <div className="flex items-center gap-2 font-bold bg-background/20 px-4 py-1.5 rounded-full">
                           <CurrencyIcon className="h-5 w-5"/>
                           {cost}
                        </div>
                    </div>
                </Button>
            </CardContent>
        </Card>
    )
}
