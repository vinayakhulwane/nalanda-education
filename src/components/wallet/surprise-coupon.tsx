'use client';

import { useState, useEffect } from 'react';
import type { User, EconomySettings, CurrencyType } from '@/types';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Gift, Loader2 } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, writeBatch, collection, increment, serverTimestamp } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SurpriseCouponProps {
  userProfile: User;
}

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const calculateTimeLeft = () => {
    const difference = +targetDate - +new Date();
    let timeLeft = { hours: 0, minutes: 0, seconds: 0 };
    if (difference > 0) {
      timeLeft = {
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearTimeout(timer);
  });

  const timerComponents = Object.entries(timeLeft).map(([interval, value]) => (
    <span key={interval} className="font-mono text-lg font-bold">
      {value.toString().padStart(2, '0')}{interval.charAt(0)}
    </span>
  ));

  return timerComponents.length ? <div className="flex gap-1.5">{timerComponents}</div> : <span>Ready!</span>;
}


export function SurpriseCoupon({ userProfile }: SurpriseCouponProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isClaiming, setIsClaiming] = useState(false);
  const [isReadyToClaim, setIsReadyToClaim] = useState(false);
  const [isScratched, setIsScratched] = useState(false);

  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
  const { data: settings } = useDoc<EconomySettings>(settingsDocRef);
  
  const lastClaimedDate = userProfile.lastCouponClaimedAt?.toDate();
  const cooldownHours = settings?.surpriseRewardCooldownHours ?? 24;
  const nextAvailableDate = lastClaimedDate ? new Date(lastClaimedDate.getTime() + cooldownHours * 60 * 60 * 1000) : new Date();

  useEffect(() => {
    if (userProfile.hasClaimedWelcomeCoupon) {
      setIsReadyToClaim(new Date() >= nextAvailableDate);
    } else {
      setIsReadyToClaim(true); // Always ready for the first claim
    }
  }, [userProfile, nextAvailableDate]);

  const handleClaim = async () => {
    if (!firestore || !userProfile.id || !settings) return;
    setIsClaiming(true);

    const isWelcomeGift = !userProfile.hasClaimedWelcomeCoupon;
    const rewardAmount = isWelcomeGift ? (settings.welcomeAiCredits ?? 5) : (settings.surpriseRewardAmount ?? 100);
    const rewardCurrency: CurrencyType = isWelcomeGift ? 'aiCredits' : (settings.surpriseRewardCurrency ?? 'coin');
    
    try {
        const batch = writeBatch(firestore);
        const userRef = doc(firestore, 'users', userProfile.id);
        const transactionRef = doc(collection(firestore, 'transactions'));
        
        const fieldMap: Record<string, string> = { coin: 'coins', gold: 'gold', diamond: 'diamonds', aiCredits: 'aiCredits' };
        const dbField = fieldMap[rewardCurrency];

        batch.update(userRef, {
            [dbField]: increment(rewardAmount),
            lastCouponClaimedAt: serverTimestamp(),
            ...(isWelcomeGift && { hasClaimedWelcomeCoupon: true })
        });

        batch.set(transactionRef, {
            userId: userProfile.id,
            type: 'earned',
            description: isWelcomeGift ? 'Welcome Gift Coupon' : 'Surprise Coupon Reward',
            amount: rewardAmount,
            currency: rewardCurrency,
            createdAt: serverTimestamp(),
        });
        
        await batch.commit();

        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        toast({ title: 'Reward Claimed!', description: `You received ${rewardAmount} ${rewardCurrency}!` });
        setIsScratched(true);

    } catch (error: any) {
        console.error("Failed to claim reward:", error);
        toast({ variant: 'destructive', title: 'Claim Failed', description: error.message });
    } finally {
        setIsClaiming(false);
    }
  };

  return (
    <Card className={cn("relative overflow-hidden transition-all duration-500", isScratched ? 'h-0 opacity-0 p-0 border-none' : 'h-auto')}>
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-[0.03] dark:opacity-[0.02]"></div>
      <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-full border border-primary/20">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Surprise Coupon</h3>
            <p className="text-sm text-muted-foreground">A special reward is waiting for you!</p>
          </div>
        </div>
        
        {isReadyToClaim ? (
          <Button 
            size="lg" 
            className="h-12 text-base font-semibold w-full sm:w-auto shadow-lg shadow-primary/20 hover:shadow-primary/30"
            onClick={handleClaim}
            disabled={isClaiming}
          >
            {isClaiming ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {isClaiming ? 'Claiming...' : 'Scratch & Win!'}
          </Button>
        ) : (
          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/70 text-muted-foreground">
             <span className="text-xs font-semibold mb-1">Next reward in</span>
             <CountdownTimer targetDate={nextAvailableDate} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
