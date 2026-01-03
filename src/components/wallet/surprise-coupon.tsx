

'use client';

import { useState, useMemo, useEffect } from 'react';
import type { User, Coupon, Worksheet, WorksheetAttempt } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Gift, Loader2, Lock, CheckCircle2, Rocket, Ticket, Star, Trophy } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, writeBatch, collection, increment, serverTimestamp, query, where, documentId, orderBy } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';

interface CouponCardProps {
  coupon: Coupon;
  userProfile: User;
  recentAttempts?: WorksheetAttempt[];
  worksheets?: Worksheet[];
}

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState(formatDistanceToNowStrict(targetDate, { addSuffix: true }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(formatDistanceToNowStrict(targetDate, { addSuffix: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return <span className="text-amber-600 dark:text-amber-400 font-bold">{timeLeft}</span>;
}

function CouponCard({ coupon, userProfile, recentAttempts = [], worksheets = [] }: CouponCardProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isClaiming, setIsClaiming] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  
  const lastClaimedMillis = (userProfile.lastCouponClaimedAt as any)?.toMillis?.() || 0;
  
  // If availableDate is null, coupon is available from the dawn of time.
  const nextAvailableMillis = coupon.availableDate ? coupon.availableDate.toDate().getTime() : 0;
  
  const isTimeReady = Date.now() >= nextAvailableMillis;
  const hasNotClaimedThisCycle = lastClaimedMillis < nextAvailableMillis;
  
  const { conditionsMet, taskProgress } = useMemo(() => {
    if (!coupon.conditions || coupon.conditions.length === 0) {
      return { conditionsMet: true, taskProgress: [] };
    }

    let allMet = true;
    const progress = coupon.conditions.map(condition => {
      let current = 0;
      let label = "";

      const checkType = (w: Worksheet | undefined, targetType: string) => w?.worksheetType?.trim().toLowerCase() === targetType.toLowerCase();

      if (condition.type === 'minClassroomAssignments') {
         current = recentAttempts.filter(a => checkType(worksheets.find(w => w.id === a.worksheetId), 'classroom')).length;
         label = "Complete Classroom Assignments";
      } else if (condition.type === 'minPracticeAssignments') {
         current = recentAttempts.filter(a => checkType(worksheets.find(w => w.id === a.worksheetId), 'practice')).length;
         label = "Complete Practice Exercises";
      } else {
         label = "Special Mission";
      }

      const isMet = current >= condition.value;
      if (!isMet) allMet = false;

      return { label, current, required: condition.value, isMet, percentage: Math.min(100, (current / condition.value) * 100) };
    });

    return { conditionsMet: allMet, taskProgress: progress };
  }, [coupon.conditions, recentAttempts, worksheets]);

  const canClaim = isTimeReady && hasNotClaimedThisCycle && conditionsMet && !isClaimed;

  const handleClaim = async () => {
    if (!firestore || !user) return;
    setIsClaiming(true);
    
    try {
      const batch = writeBatch(firestore);
      const userRef = doc(firestore, 'users', user.uid);
      const transactionRef = doc(collection(firestore, 'transactions'));
      
      const fieldMap: Record<string, string> = { coin: 'coins', gold: 'gold', diamond: 'diamonds', aiCredits: 'aiCredits' };
      const field = fieldMap[coupon.rewardCurrency];
      
      if(field) {
        batch.update(userRef, {
          [field]: increment(coupon.rewardAmount),
          lastCouponClaimedAt: serverTimestamp(),
        });
      }

      batch.set(transactionRef, {
        userId: user.uid, type: 'earned', description: `Coupon: ${coupon.name}`,
        amount: coupon.rewardAmount, currency: coupon.rewardCurrency,
        createdAt: serverTimestamp(), adminId: 'system',
      });
      
      await batch.commit();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      toast({ title: 'Reward Claimed!', description: `You received ${coupon.rewardAmount} ${coupon.rewardCurrency}.` });
      setIsClaimed(true);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-900 dark:to-slate-950 shadow-lg group hover:shadow-xl transition-all duration-300">
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-black rounded-full border-r-2 border-indigo-200 dark:border-indigo-800" />
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-black rounded-full border-l-2 border-indigo-200 dark:border-indigo-800" />
      <CardHeader className="pb-2 text-center relative z-10">
        <div className="mx-auto bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-full w-fit mb-2"><Ticket className="h-6 w-6 text-indigo-600 dark:text-indigo-400" /></div>
        <CardTitle className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{coupon.name}</CardTitle>
        <CardDescription className="text-base font-medium">{canClaim ? "Your reward is unlocked!" : "Complete tasks to unlock."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10 px-8">
        <div className={cn("rounded-xl border p-4 transition-colors", !isTimeReady ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200")}>
          <div className={cn("text-xs font-bold uppercase tracking-wider", !isTimeReady ? "text-amber-700" : "text-emerald-700")}>
            {!isTimeReady ? "Unlocks In" : "Time Requirement"}
          </div>
          <div className="text-center mt-1">
            {!isTimeReady && coupon.availableDate ? <CountdownTimer targetDate={coupon.availableDate.toDate()} /> : <p className="text-sm font-semibold text-emerald-800">Available Now!</p>}
          </div>
        </div>
        {taskProgress.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3"><Star className="h-4 w-4 text-indigo-500" /><h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">Mission Requirements</h4></div>
            <div className="space-y-3">
              {taskProgress.map((task, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn("text-sm font-bold block", task.isMet ? "text-emerald-700" : "text-slate-700")}>{task.label}</span>
                    {task.isMet ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Done</Badge> : <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">Pending</Badge>}
                  </div>
                  <Progress value={task.percentage} className={cn("h-2", task.isMet ? "bg-emerald-100" : "")} />
                  <div className="mt-2 text-xs flex justify-end">
                    {task.isMet ? <span className="text-emerald-600 font-bold flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" /> Eligible</span> : <span className="text-indigo-600 font-bold flex items-center gap-1.5 animate-pulse"><Rocket className="h-3.5 w-3.5" /> {task.required - task.current} to go!</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <Separator className="bg-indigo-100" />
      <CardFooter className="pt-6 pb-6 bg-indigo-50/50 flex justify-center">
        <Button size="lg" onClick={handleClaim} disabled={!canClaim || isClaiming} className={cn("w-full font-bold text-lg h-14 shadow-xl transition-all", canClaim ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-gradient text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed")}>
          {isClaiming ? <Loader2 className="h-5 w-5 animate-spin" /> : canClaim ? <><Gift className="h-6 w-6 mr-2 animate-bounce" /> Claim Reward</> : <><Lock className="h-5 w-5 mr-2" /> LOCKED</>}
        </Button>
      </CardFooter>
      <style jsx>{` @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } } .animate-gradient { animation: gradient 3s ease infinite; } `}</style>
    </Card>
  )
}

export function SurpriseCoupon({ userProfile }: SurpriseCouponProps) {
    const firestore = useFirestore();

    const couponsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'coupons'), orderBy('availableDate', 'asc'));
    }, [firestore]);
    const { data: coupons, isLoading: couponsLoading } = useCollection<Coupon>(couponsQuery);
    
    const recentAttemptsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile.id) return null;
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return query(
          collection(firestore, 'worksheet_attempts'),
          where('userId', '==', userProfile.id),
          where('attemptedAt', '>', oneMonthAgo)
        );
    }, [firestore, userProfile.id]);
    const { data: recentAttempts, isLoading: attemptsLoading } = useCollection<WorksheetAttempt>(recentAttemptsQuery);

    const worksheetIds = useMemo(() => recentAttempts ? [...new Set(recentAttempts.map(a => a.worksheetId))] : [], [recentAttempts]);
    const worksheetsQuery = useMemoFirebase(() => {
        if (!firestore || worksheetIds.length === 0) return null;
        return query(collection(firestore, 'worksheets'), where(documentId(), 'in', worksheetIds.slice(0, 30)));
    }, [firestore, worksheetIds.join(',')]);
    const { data: worksheets, isLoading: worksheetsLoading } = useCollection<Worksheet>(worksheetsQuery);

    const isLoading = couponsLoading || attemptsLoading || worksheetsLoading;

    if(isLoading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if(!coupons || coupons.length === 0) {
        return (
            <Card className="text-center p-8 border-dashed">
                <CardHeader><CardTitle>No Coupons Available</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Check back later for new rewards and promotions!</p></CardContent>
            </Card>
        )
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {coupons.map(coupon => (
                <CouponCard key={coupon.id} coupon={coupon} userProfile={userProfile} recentAttempts={recentAttempts} worksheets={worksheets} />
            ))}
        </div>
    )
}
