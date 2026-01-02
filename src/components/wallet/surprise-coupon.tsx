'use client';

import { useState, useEffect, useMemo } from 'react';
import type { User, EconomySettings, CurrencyType, Worksheet, WorksheetAttempt } from '@/types';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Gift, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { doc, updateDoc, writeBatch, collection, increment, serverTimestamp, query, where } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';

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
  const { user } = useUser();
  const { toast } = useToast();
  const [isClaiming, setIsClaiming] = useState(false);
  const [isReadyToClaim, setIsReadyToClaim] = useState(false);
  const [isScratched, setIsScratched] = useState(false);
  
  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
  const { data: settings } = useDoc<EconomySettings>(settingsDocRef);
  
  const lastClaimedDate = userProfile.lastCouponClaimedAt?.toDate();
  const nextAvailableDate = settings?.nextCouponAvailableDate?.toDate() ?? new Date();

  // --- DATA FETCHING FOR CONDITIONS ---
    const recentAttemptsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile.id || !lastClaimedDate) return null;
        return query(
            collection(firestore, 'worksheet_attempts'),
            where('userId', '==', userProfile.id),
            where('attemptedAt', '>', lastClaimedDate)
        );
    }, [firestore, userProfile.id, lastClaimedDate]);

    const { data: recentAttempts } = useCollection<WorksheetAttempt>(recentAttemptsQuery);

    const worksheetIds = useMemo(() => {
        if (!recentAttempts) return [];
        return [...new Set(recentAttempts.map(a => a.worksheetId))];
    }, [recentAttempts]);

    const worksheetsQuery = useMemoFirebase(() => {
        if (!firestore || worksheetIds.length === 0) return null;
        return query(collection(firestore, 'worksheets'), where('id', 'in', worksheetIds.slice(0, 10)));
    }, [firestore, worksheetIds]);
    const { data: worksheets } = useCollection<Worksheet>(worksheetsQuery);
    
    // --- ELIGIBILITY LOGIC ---
    const { conditionsMet, progress } = useMemo(() => {
        if (!settings?.couponConditions || settings.couponConditions.length === 0) {
            return { conditionsMet: true, progress: [] };
        }
        if (!recentAttempts || !worksheets) {
            return { conditionsMet: false, progress: [] };
        }

        let allConditionsMet = true;
        const progressData = settings.couponConditions.map(condition => {
            let currentCount = 0;
            switch (condition.type) {
                case 'minClassroomAssignments':
                    currentCount = recentAttempts.filter(a => worksheets.find(w => w.id === a.worksheetId)?.worksheetType === 'classroom').length;
                    break;
                case 'minPracticeAssignments':
                    currentCount = recentAttempts.filter(a => worksheets.find(w => w.id === a.worksheetId)?.worksheetType === 'practice').length;
                    break;
                // Add logic for other conditions here...
            }
            const isMet = currentCount >= condition.value;
            if (!isMet) allConditionsMet = false;
            
            return {
                description: `Complete ${condition.value} ${condition.type === 'minClassroomAssignments' ? 'Classroom' : 'Practice'} Assignments`,
                current: currentCount,
                required: condition.value,
                isMet
            };
        });
        
        return { conditionsMet: allConditionsMet, progress: progressData };

    }, [settings, recentAttempts, worksheets]);

  useEffect(() => {
    // If it's the first welcome gift, it's always ready.
    if (!userProfile.hasClaimedWelcomeCoupon) {
      setIsReadyToClaim(true);
      return;
    }
    
    // For subsequent rewards, check date AND conditions
    if (settings) {
        const dateIsReady = new Date() >= nextAvailableDate;
        const lastClaimWasBeforeCycle = !lastClaimedDate || lastClaimedDate < nextAvailableDate;
        setIsReadyToClaim(dateIsReady && lastClaimWasBeforeCycle && conditionsMet);
    }

  }, [userProfile, lastClaimedDate, nextAvailableDate, conditionsMet, settings]);

  const handleClaim = async () => {
    if (!firestore || !userProfile.id || !settings || !user) return;
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
            adminId: user.uid,
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

  const isWithinClaimWindow = new Date() >= nextAvailableDate;

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
        ) : !isWithinClaimWindow ? (
          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/70 text-muted-foreground">
             <span className="text-xs font-semibold mb-1">Next reward in</span>
             <CountdownTimer targetDate={nextAvailableDate} />
          </div>
        ) : (
             <div className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-12 text-base font-semibold" disabled>
                    <Lock className="mr-2 h-5 w-5" />
                    Complete Tasks to Unlock
                </Button>
                <div className="mt-2 space-y-2">
                    {progress.map((p, i) => (
                        <div key={i} className="text-xs">
                            <div className="flex justify-between mb-0.5">
                                <span className={cn("font-medium", p.isMet ? "text-green-600" : "text-muted-foreground")}>{p.description}</span>
                                <span className="font-mono font-bold">{p.current}/{p.required}</span>
                            </div>
                            <Progress value={(p.current / p.required) * 100} className="h-1" />
                        </div>
                    ))}
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
