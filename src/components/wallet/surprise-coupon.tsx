'use client';

import { useState, useMemo, useEffect } from 'react';
import type { User, Coupon, Worksheet, WorksheetAttempt } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Gift, Loader2, Lock, CheckCircle2, Rocket, Ticket, Star, Trophy, Sparkles, Clock } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, writeBatch, collection, increment, serverTimestamp, query, where, documentId, orderBy, limit } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SurpriseCouponProps {
  userProfile: User;
}

interface CouponCardProps {
  coupon: Coupon;
  userProfile: User;
  recentAttempts?: WorksheetAttempt[];
  worksheets?: Worksheet[];
}

// --- HELPER: HH:MM:SS TIMER ---
function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState<string>("--:--:--");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        setTimeLeft("00:00:00");
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return <span className="font-mono text-amber-600 dark:text-amber-400 font-bold tracking-widest text-lg">{timeLeft}</span>;
}

// --- SUB-COMPONENT: COUPON CARD ---
function CouponCard({ coupon, userProfile, recentAttempts = [], worksheets = [] }: CouponCardProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isClaiming, setIsClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);

  const lastClaimedMillis = (userProfile.lastCouponClaimedAt as any)?.toMillis?.() || 0;
  
  const referenceTimeMillis = coupon.availableDate 
      ? coupon.availableDate.toDate().getTime() 
      : ((coupon as any).createdAt ? (coupon as any).createdAt.toMillis() : 0);

  const isTimeReady = !coupon.availableDate || Date.now() >= referenceTimeMillis;
  const isAlreadyClaimed = lastClaimedMillis >= referenceTimeMillis;
  const hasNotClaimedThisCycle = !isAlreadyClaimed;

  // --- DEBUGGING ENABLED: TASK PROGRESS LOGIC ---
  const { conditionsMet, taskProgress } = useMemo(() => {
    if (!coupon.conditions || coupon.conditions.length === 0) {
      return { conditionsMet: true, taskProgress: [] };
    }

    console.groupCollapsed(`[DEBUG] Checking Coupon: ${coupon.name}`);
    const validAttempts = recentAttempts; 
    console.log(`Checking ${validAttempts.length} attempts...`);

    let allMet = true;
    
    const progress = coupon.conditions.map(condition => {
      let current = 0;
      let label = "";

      if (condition.type === 'minPracticeAssignments') {
         label = "Complete Practice Exercises";
         current = validAttempts.filter(a => {
             const w = worksheets.find(sheet => sheet.id === a.worksheetId);
             
             // Check if Practice (Explicit type OR Self-Created)
             const isTypePractice = w?.worksheetType?.toLowerCase() === 'practice' 
                                 || (a as any).worksheetType?.toLowerCase() === 'practice';
             const isSelfCreated = w?.authorId === userProfile.id;

             const match = isTypePractice || isSelfCreated;
             if (match) console.log(`  -> Found Practice Attempt: ${a.id}`);
             return match;
         }).length;

      } else if (condition.type === 'minClassroomAssignments') {
         label = "Complete Classroom Assignments";
         current = validAttempts.filter(a => {
             const w = worksheets.find(sheet => sheet.id === a.worksheetId);
             
             const isTypeClassroom = w?.worksheetType?.toLowerCase() === 'classroom'
                                  || (a as any).worksheetType?.toLowerCase() === 'classroom';
             const isNotSelfCreated = w?.authorId !== userProfile.id;

             return isTypeClassroom && isNotSelfCreated;
         }).length;

      } else if (condition.type === 'minGoldQuestions') {
         label = "Solve Gold Questions";
         console.log("  --- Checking Gold ---");
         
         current = validAttempts.filter(a => {
             const w = worksheets.find(sheet => sheet.id === a.worksheetId);
             
             // Cast to 'any' to avoid TS error
             // We check BOTH the worksheet config AND the earned currency on the attempt
             const wsCurrency = (w as any)?.rewardCurrency || (w as any)?.currency;
             const attCurrency = (a as any)?.earnedCurrency || (a as any)?.rewardCurrency;

             const givesGold = wsCurrency === 'gold';
             const earnedGold = attCurrency === 'gold';
             const isMatch = givesGold || earnedGold;

             if (isMatch) {
                 console.log(`  ✅ MATCH! Attempt ${a.id} | WS Currency: ${wsCurrency} | Earned: ${attCurrency}`);
             } else {
                 // Log failures so you can see what they ARE (e.g. 'coin')
                 // console.log(`  ❌ Fail. Attempt ${a.id} | WS Currency: ${wsCurrency} | Earned: ${attCurrency}`);
             }

             return isMatch;
         }).length;
         
         console.log(`  >>> Total Gold Found: ${current}`);
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
    
    console.groupEnd();
    return { conditionsMet: allMet, taskProgress: progress };
  }, [coupon.conditions, recentAttempts, worksheets, userProfile.id]);

  const canClaim = isTimeReady && hasNotClaimedThisCycle && conditionsMet && !justClaimed;

  let statusMessage = "Complete tasks to unlock.";
  if (canClaim) statusMessage = "Your reward is unlocked!";
  else if (!isTimeReady) statusMessage = "Coming soon! Opens in...";
  else if (isAlreadyClaimed) statusMessage = "You have collected this reward.";
  else if (!conditionsMet) statusMessage = "Complete missions to unlock.";

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
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
      toast({ title: 'Reward Claimed!', description: `You received ${coupon.rewardAmount} ${coupon.rewardCurrency}.` });
      setJustClaimed(true); 
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsClaiming(false);
    }
  };

  if (justClaimed || isAlreadyClaimed) {
    return (
      <Card className={cn(
        "relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 dark:from-yellow-950/30 dark:to-orange-950/30",
        justClaimed ? "animate-in fade-in zoom-in duration-500" : "opacity-80 grayscale-[0.3]"
      )}>
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-10"></div>
          <CardContent className="pt-8 pb-8 px-8 text-center relative z-10 space-y-6">
              <div className="mx-auto bg-yellow-100 dark:bg-yellow-900/50 p-4 rounded-full w-fit shadow-inner ring-4 ring-yellow-200 dark:ring-yellow-800">
                  <Trophy className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="space-y-2">
                  <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400">
                      CONGRATULATIONS!
                  </h2>
                  <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
                      You earned <span className="font-bold text-yellow-600">{coupon.rewardAmount} {coupon.rewardCurrency}</span> from this coupon.
                  </p>
              </div>
              {taskProgress.length > 0 && (
                <div className="grid gap-2 text-left bg-white/40 dark:bg-black/20 p-4 rounded-xl">
                   <span className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 block">Completed Missions</span>
                    {taskProgress.map((task, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm">
                            <div className="bg-green-100 dark:bg-green-900/50 p-1 rounded-full">
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 line-through decoration-green-500/50">
                                {task.label}
                            </span>
                        </div>
                    ))}
                </div>
              )}
          </CardContent>
          <CardFooter className="justify-center pb-8 pt-0">
             {justClaimed ? (
                <Button variant="outline" className="border-yellow-300 bg-yellow-50 hover:bg-yellow-100 text-yellow-800" onClick={() => window.location.reload()}>
                  <Sparkles className="mr-2 h-4 w-4" /> Awesome!
                </Button>
             ) : (
                <Badge variant="outline" className="border-yellow-600 text-yellow-700 bg-yellow-50 px-4 py-1">
                    Reward Collected
                </Badge>
             )}
          </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-900 dark:to-slate-950 shadow-lg group hover:shadow-xl transition-all duration-300">
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-black rounded-full border-r-2 border-indigo-200 dark:border-indigo-800" />
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-black rounded-full border-l-2 border-indigo-200 dark:border-indigo-800" />
      
      <CardHeader className="pb-2 text-center relative z-10">
        <div className="mx-auto bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-full w-fit mb-2">
            <Ticket className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <CardTitle className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            {coupon.name}
        </CardTitle>
        <CardDescription className="text-base font-medium">
            {statusMessage}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 relative z-10 px-8">
        
        {/* TIME REQUIREMENT SECTION */}
        {coupon.availableDate && (
           <div className={cn("rounded-xl border p-4 transition-colors", !isTimeReady ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900" : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900")}>
             <div className={cn("text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2", !isTimeReady ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400")}>
               {!isTimeReady ? <><Clock className="h-3 w-3" /> Coming Soon</> : "Time Requirement"}
             </div>
             <div className="text-center mt-1">
               {!isTimeReady ? <CountdownTimer targetDate={coupon.availableDate.toDate()} /> : <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Available Now!</p>}
             </div>
           </div>
        )}

        {/* TASKS SECTION */}
        {taskProgress.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-indigo-500" />
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">Mission Requirements</h4>
            </div>
            <div className="space-y-3">
              {taskProgress.map((task, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900/50 p-3 rounded-lg border shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn("text-sm font-bold block", task.isMet ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200")}>{task.label}</span>
                    {task.isMet ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Done</Badge> : <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">Pending</Badge>}
                  </div>
                  <Progress value={task.percentage} className={cn("h-2", task.isMet ? "bg-emerald-100" : "")} />
                  <div className="mt-2 text-xs flex justify-end">
                    {task.isMet ? 
                        <span className="text-emerald-600 font-bold flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" /> Eligible</span> 
                        : 
                        <span className="text-indigo-600 font-bold flex items-center gap-1.5 animate-pulse"><Rocket className="h-3.5 w-3.5" /> {task.required - task.current} to go!</span>
                    }
                  </div>
                </div>
              ))}
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
            className={cn("w-full font-bold text-lg h-14 shadow-xl transition-all", canClaim ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-gradient text-white" : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed")}
        >
          {isClaiming ? <Loader2 className="h-5 w-5 animate-spin" /> : canClaim ? <><Gift className="h-6 w-6 mr-2 animate-bounce" /> Claim Reward</> : <><Lock className="h-5 w-5 mr-2" /> Coming Soon</>}
        </Button>
      </CardFooter>
    </Card>
  )
}

// --- MAIN COMPONENT: DATA LOADER ---
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
      where('attemptedAt', '>', oneMonthAgo),
      orderBy('attemptedAt', 'desc'), 
      limit(50) 
    );
  }, [firestore, userProfile.id]);
  const { data: recentAttempts, isLoading: attemptsLoading } = useCollection<WorksheetAttempt>(recentAttemptsQuery);

  const worksheetIds = useMemo(() => recentAttempts ? [...new Set(recentAttempts.map(a => a.worksheetId))] : [], [recentAttempts]);
  
  const worksheetsQuery = useMemoFirebase(() => {
    if (!firestore || worksheetIds.length === 0) return null;
    return query(collection(firestore, 'worksheets'), where(documentId(), 'in', worksheetIds.slice(0, 30)));
  }, [firestore, worksheetIds.join(',')]);
  
  const { data: worksheets, isLoading: worksheetsLoading } = useCollection<Worksheet>(worksheetsQuery);

  // --- SORTING LOGIC ---
  const sortedCoupons = useMemo(() => {
    if (!coupons) return [];

    const getRank = (c: Coupon) => {
        const lastClaimed = (userProfile.lastCouponClaimedAt as any)?.toMillis?.() || 0;
        const refTime = c.availableDate ? c.availableDate.toDate().getTime() : ((c as any).createdAt?.toMillis?.() || 0);
        
        if (lastClaimed >= refTime) return 3;

        const isTimeReady = !c.availableDate || Date.now() >= refTime;
        
        let tasksDone = true;
        if (c.conditions && c.conditions.length > 0) {
           const validAttempts = recentAttempts || [];
           for (const cond of c.conditions) {
              const check = (w: Worksheet | undefined, a: WorksheetAttempt, t: string) => {
                  const typeMatch = w?.worksheetType?.toLowerCase() === t.toLowerCase() || (a as any).worksheetType?.toLowerCase() === t.toLowerCase();
                  if (t === 'practice') return typeMatch || w?.authorId === userProfile.id;
                  if (t === 'classroom') return typeMatch && w?.authorId !== userProfile.id;
                  return false;
              };

              let count = 0;
              if (cond.type === 'minClassroomAssignments') {
                 count = validAttempts.filter(a => check((worksheets || []).find(w => w.id === a.worksheetId), a, 'classroom')).length;
              } else if (cond.type === 'minPracticeAssignments') {
                 count = validAttempts.filter(a => check((worksheets || []).find(w => w.id === a.worksheetId), a, 'practice')).length;
              
              // ✅ Added Gold Logic to Sorter
              } else if (cond.type === 'minGoldQuestions') {
                 count = validAttempts.filter(a => {
                     const w = (worksheets || []).find(sheet => sheet.id === a.worksheetId);
                     const givesGold = (w as any)?.rewardCurrency === 'gold' || (w as any)?.currency === 'gold';
                     const earnedGold = (a as any)?.earnedCurrency === 'gold' || (a as any)?.rewardCurrency === 'gold';
                     return givesGold || earnedGold;
                 }).length;
              }
              if (count < cond.value) { tasksDone = false; break; }
           }
        }

        if (isTimeReady && tasksDone) return 1;
        return 2;
    };

    return [...coupons].sort((a, b) => getRank(a) - getRank(b));
  }, [coupons, userProfile, recentAttempts, worksheets]);

  const isLoading = couponsLoading || attemptsLoading || worksheetsLoading;

  if(isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if(!sortedCoupons || sortedCoupons.length === 0) {
    return (
      <Card className="text-center p-8 border-dashed">
        <CardHeader><CardTitle>No Coupons Available</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Check back later for new rewards and promotions!</p></CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {sortedCoupons.map(coupon => (
        <CouponCard 
            key={coupon.id} 
            coupon={coupon} 
            userProfile={userProfile} 
            recentAttempts={recentAttempts ?? []} 
            worksheets={worksheets ?? []} 
        />
      ))}
    </div>
  )
}