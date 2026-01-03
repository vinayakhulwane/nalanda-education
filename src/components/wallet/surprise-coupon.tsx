'use client';

import { useState, useEffect, useMemo } from 'react';
import type { User, EconomySettings, CurrencyType, Worksheet, WorksheetAttempt } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Gift, Loader2, Lock, Clock, CheckCircle2, Rocket, Ticket, Star, Trophy, Sparkles, PartyPopper } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { doc, writeBatch, collection, increment, serverTimestamp, query, where, documentId } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SurpriseCouponProps {
  userProfile: User;
}

// --- MODERN COUNTDOWN TIMER ---
function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const calculateTimeLeft = () => {
    const difference = +targetDate - +new Date();
    if (difference <= 0) return null;
    return {
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return <span className="text-emerald-600 font-bold flex items-center gap-1 text-sm"><CheckCircle2 className="h-4 w-4"/> Ready Now</span>;

  return (
    <div className="flex gap-2 justify-center items-center py-2">
        {['hours', 'minutes', 'seconds'].map((unit) => (
            <div key={unit} className="flex flex-col items-center">
                <div className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg px-3 py-2 min-w-[3.5rem] shadow-inner font-mono text-xl font-bold">
                    {/* @ts-ignore */}
                    {timeLeft[unit].toString().padStart(2, '0')}
                </div>
                <span className="text-[10px] uppercase text-slate-500 mt-1 font-bold tracking-wider">{unit.charAt(0)}</span>
            </div>
        ))}
    </div>
  );
}

export function SurpriseCoupon({ userProfile }: SurpriseCouponProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  // UI States
  const [isClaiming, setIsClaiming] = useState(false);
  const [isScratched, setIsScratched] = useState(false);
  
  // Success Data States (Snapshots to hold data after claim resets DB queries)
  const [claimedReward, setClaimedReward] = useState<{ amount: number, currency: string } | null>(null);
  const [completedTasksSnapshot, setCompletedTasksSnapshot] = useState<any[]>([]);

  // 1. Fetch Settings
  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
  const { data: settings } = useDoc<EconomySettings>(settingsDocRef);

  // 2. Dates
  const lastClaimedMillis = userProfile.lastCouponClaimedAt?.toMillis() || 0;
  const nextAvailableMillis = settings?.nextCouponAvailableDate?.toMillis() || Date.now();
  
  const isTimeReady = Date.now() >= nextAvailableMillis;
  const hasNotClaimedThisCycle = lastClaimedMillis < nextAvailableMillis;

  // 3. Data Fetching
  const recentAttemptsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile.id || !lastClaimedMillis) return null;
    const dateObj = new Date(lastClaimedMillis);
    return query(
      collection(firestore, 'worksheet_attempts'),
      where('userId', '==', userProfile.id),
      where('attemptedAt', '>', dateObj)
    );
  }, [firestore, userProfile.id, lastClaimedMillis]);

  const { data: recentAttempts } = useCollection<WorksheetAttempt>(recentAttemptsQuery);

  const worksheetIds = useMemo(() => {
    if (!recentAttempts) return [];
    return [...new Set(recentAttempts.map(a => a.worksheetId))].sort();
  }, [recentAttempts]);

  const worksheetIdsKey = worksheetIds.join(','); 

  const worksheetsQuery = useMemoFirebase(() => {
    if (!firestore || worksheetIds.length === 0) return null;
    // ✅ FIX: Use documentId() to query by ID properly
    return query(collection(firestore, 'worksheets'), where(documentId(), 'in', worksheetIds.slice(0, 10)));
  }, [firestore, worksheetIdsKey]);

  const { data: worksheetsRaw } = useCollection<Worksheet>(worksheetsQuery);

  // ✅ FIX: Force empty array if no IDs to prevent loading state
  const worksheets = worksheetIds.length === 0 ? [] : worksheetsRaw;

  // 4. Calculate Task Progress
  const { conditionsMet, taskProgress, hasTasks } = useMemo(() => {
    const defaultConditions = [
        { type: 'minPracticeAssignments', value: 3 },
        { type: 'minClassroomAssignments', value: 1 }
    ];

    const conditionsToUse = (settings?.couponConditions && settings.couponConditions.length > 0) 
        ? settings.couponConditions 
        : defaultConditions;

    // Strict undefined check to handle loading vs empty
    if (!recentAttempts || !worksheets) {
      return { conditionsMet: false, taskProgress: [], hasTasks: true };
    }

    let allMet = true;
    
    const progress = conditionsToUse.map(condition => {
      let current = 0;
      let label = "";

      // ✅ FIX: Case-insensitive check
      const checkType = (w: Worksheet | undefined, targetType: string) => {
          if (!w || !w.worksheetType) return false;
          return w.worksheetType.trim().toLowerCase() === targetType.toLowerCase();
      };
      
      if (condition.type === 'minClassroomAssignments') {
         current = recentAttempts.filter(a => {
             const w = worksheets.find(sheet => sheet.id === a.worksheetId);
             return checkType(w, 'classroom');
         }).length;
         label = "Complete Classroom Assignments";
      } else if (condition.type === 'minPracticeAssignments') {
         current = recentAttempts.filter(a => {
             const w = worksheets.find(sheet => sheet.id === a.worksheetId);
             return checkType(w, 'practice');
         }).length;
         label = "Complete Practice Exercises";
      } else {
         label = "Special Mission";
      }

      const isMet = current >= condition.value;
      if (!isMet) allMet = false;

      return { 
          label, 
          current, 
          required: condition.value, 
          isMet, 
          percentage: Math.min(100, (current / condition.value) * 100) 
      };
    });

    return { conditionsMet: allMet, taskProgress: progress, hasTasks: true };
  }, [settings, recentAttempts, worksheets]);

  // 5. Final Status
  const isWelcomeGift = !userProfile.hasClaimedWelcomeCoupon;
  const canClaim = isWelcomeGift 
    ? true 
    : (isTimeReady && hasNotClaimedThisCycle && conditionsMet);

  const handleClaim = async () => {
    if (!firestore || !userProfile.id || !user) return;
    setIsClaiming(true);

    const safeSettings = settings || {} as Partial<EconomySettings>;
    const rewardAmount = isWelcomeGift ? (safeSettings.welcomeAiCredits ?? 5) : (safeSettings.surpriseRewardAmount ?? 100);
    const rewardCurrency: CurrencyType = isWelcomeGift ? 'aiCredits' : (safeSettings.surpriseRewardCurrency ?? 'coin');

    try {
      // 1. Snapshot the tasks BEFORE they disappear (due to date reset)
      setCompletedTasksSnapshot(taskProgress);
      setClaimedReward({ amount: rewardAmount, currency: rewardCurrency });

      const batch = writeBatch(firestore);
      const userRef = doc(firestore, 'users', userProfile.id);
      const transactionRef = doc(collection(firestore, 'transactions'));
      const fieldMap: Record<string, string> = { coin: 'coins', gold: 'gold', diamond: 'diamonds', aiCredits: 'aiCredits' };
      
      batch.update(userRef, {
        [fieldMap[rewardCurrency]]: increment(rewardAmount),
        lastCouponClaimedAt: serverTimestamp(),
        ...(isWelcomeGift && { hasClaimedWelcomeCoupon: true })
      });

      batch.set(transactionRef, {
        userId: userProfile.id,
        type: 'earned',
        description: isWelcomeGift ? 'Welcome Gift' : 'Daily Surprise Reward',
        amount: rewardAmount,
        currency: rewardCurrency,
        createdAt: serverTimestamp(),
        adminId: 'system',
      });

      await batch.commit();
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
      toast({ title: 'Reward Unlocked!', description: `You received ${rewardAmount} ${rewardCurrency}` });
      
      // Show Success Screen
      setIsScratched(true);

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsClaiming(false);
    }
  };

  // --- RENDER SUCCESS STATE ---
  if (isScratched && claimedReward) {
      return (
        <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 dark:from-yellow-950/30 dark:to-orange-950/30 animate-in fade-in zoom-in duration-500">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-10"></div>
            <div className="absolute top-0 right-0 p-12 opacity-10">
                <Trophy className="w-48 h-48 text-yellow-500" />
            </div>

            <CardContent className="pt-8 pb-8 px-8 text-center relative z-10 space-y-6">
                
                <div className="mx-auto bg-yellow-100 dark:bg-yellow-900/50 p-4 rounded-full w-fit shadow-inner ring-4 ring-yellow-200 dark:ring-yellow-800">
                    <Trophy className="h-10 w-10 text-yellow-600 dark:text-yellow-400 animate-bounce" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400">
                        CONGRATULATIONS!
                    </h2>
                    <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
                        You won a surprise coupon reward!
                    </p>
                </div>

                <div className="py-6 px-4 bg-white/60 dark:bg-black/20 rounded-2xl border border-yellow-200 dark:border-yellow-800/50 backdrop-blur-sm">
                    <span className="text-sm font-bold uppercase tracking-widest text-slate-500">You Received</span>
                    <div className="text-5xl font-black text-yellow-600 dark:text-yellow-400 mt-2 flex items-center justify-center gap-2 filter drop-shadow-sm">
                        {claimedReward.amount} <span className="text-2xl mt-3 capitalize">{claimedReward.currency}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                        <Star className="h-4 w-4 text-orange-500 fill-orange-500" />
                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            Mission Accomplished
                        </h4>
                        <Star className="h-4 w-4 text-orange-500 fill-orange-500" />
                    </div>

                    <div className="grid gap-2 text-left bg-white/40 dark:bg-black/20 p-4 rounded-xl">
                        {completedTasksSnapshot.length > 0 ? completedTasksSnapshot.map((task, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm">
                                <div className="bg-green-100 dark:bg-green-900/50 p-1 rounded-full">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <span className="font-semibold text-slate-700 dark:text-slate-300 line-through decoration-green-500/50">
                                    {task.label}
                                </span>
                            </div>
                        )) : (
                            <div className="flex items-center gap-3 text-sm justify-center">
                                <span className="font-medium text-slate-600">Welcome Bonus Claimed!</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="justify-center pb-8 pt-0">
                <Button variant="outline" className="border-yellow-300 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800" onClick={() => window.location.reload()}>
                    <Sparkles className="mr-2 h-4 w-4" /> Awesome!
                </Button>
            </CardFooter>
        </Card>
      );
  }

  // --- RENDER STANDARD STATE ---
  const nextAvailableDate = new Date(nextAvailableMillis);

  return (
    <Card className="relative overflow-hidden border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-900 dark:to-slate-950 shadow-lg group hover:shadow-xl transition-all duration-300">
      
      {/* Decorative "Ticket" Circles (Cutouts) */}
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-black rounded-full border-r-2 border-indigo-200 dark:border-indigo-800" />
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-black rounded-full border-l-2 border-indigo-200 dark:border-indigo-800" />

      {/* Header */}
      <CardHeader className="pb-2 text-center relative z-10">
        <div className="mx-auto bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-full w-fit mb-2">
            <Ticket className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <CardTitle className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            {isWelcomeGift ? "Welcome Bonus" : "Mystery Coupon"}
        </CardTitle>
        <CardDescription className="text-base font-medium">
            {canClaim 
                ? "Your reward is unlocked and ready!" 
                : "Complete tasks & wait for the timer to unlock."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 relative z-10 px-8">
        
        {/* State 1: Welcome Gift */}
        {isWelcomeGift && (
           <div className="text-center py-6">
              <p className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">
                  🎉 Exclusive Starter Pack
              </p>
              <p className="text-sm text-muted-foreground">
                  Tap the button below to claim your free AI Credits!
              </p>
           </div>
        )}

        {/* State 2: Recurring Timer & Tasks */}
        {!isWelcomeGift && (
            <div className="space-y-6">
                
                {/* Timer Section */}
                <div className={cn("rounded-xl border p-4 transition-colors", 
                    !isTimeReady ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900" : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900"
                )}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={cn("text-xs font-bold uppercase tracking-wider", 
                            !isTimeReady ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                        )}>
                            {!isTimeReady ? "Locked by Time" : "Time Requirement"}
                        </span>
                        {!isTimeReady ? <Lock className="h-3 w-3 text-amber-500"/> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </div>
                    
                    {isTimeReady ? (
                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                            Timer Complete! You are eligible for this cycle.
                        </p>
                    ) : (
                        <CountdownTimer targetDate={nextAvailableDate} />
                    )}
                </div>

                {/* Tasks Section */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Star className="h-4 w-4 text-indigo-500 fill-indigo-500" />
                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                            Mission Requirements
                        </h4>
                    </div>

                    {!hasTasks || taskProgress.length === 0 ? (
                         // Fallback Loading Skeleton 
                         <div className="space-y-3">
                            {[1, 2].map((i) => (
                                <div key={i} className="h-16 w-full bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                            ))}
                         </div>
                    ) : (
                        <div className="space-y-3">
                            {taskProgress.map((task, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="space-y-0.5">
                                            <span className={cn("text-sm font-bold block", task.isMet ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200")}>
                                                {task.label}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                Required: {task.required} | Completed: {task.current}
                                            </span>
                                        </div>
                                        
                                        {task.isMet ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Done</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">Pending</Badge>
                                        )}
                                    </div>
                                    
                                    <Progress value={task.percentage} className={cn("h-2 bg-slate-100 dark:bg-slate-800", task.isMet ? "bg-emerald-100" : "")} />
                                    
                                    {/* MOTIVATIONAL MESSAGE */}
                                    <div className="mt-2 text-xs flex justify-end">
                                        {task.isMet ? (
                                            <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                                                <Trophy className="h-3.5 w-3.5" /> 
                                                Yes! You did it! Eligible.
                                            </span>
                                        ) : (
                                            <span className="text-indigo-600 font-bold flex items-center gap-1.5 animate-pulse">
                                                <Rocket className="h-3.5 w-3.5" /> 
                                                Let's do it! Why are you waiting?
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

      </CardContent>

      <Separator className="bg-indigo-100 dark:bg-indigo-900" />

      <CardFooter className="pt-6 pb-6 bg-indigo-50/50 dark:bg-indigo-950/30 flex justify-center">
        <Button 
            size="lg" 
            onClick={handleClaim} 
            disabled={!canClaim || isClaiming}
            className={cn(
                "w-full font-bold text-lg h-14 shadow-xl transition-all duration-300 transform hover:-translate-y-1 active:scale-95",
                canClaim 
                    ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-gradient text-white border-none" 
                    : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed hover:none"
            )}
        >
            {isClaiming ? (
                <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Unwrapping...
                </div>
            ) : canClaim ? (
                <div className="flex items-center gap-2">
                    <Gift className="h-6 w-6 animate-bounce" /> REVEAL COUPON
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5" /> LOCKED
                </div>
            )}
        </Button>
      </CardFooter>
      
      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </Card>
  );
}