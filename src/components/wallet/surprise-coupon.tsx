'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { User, Coupon, Worksheet, WorksheetAttempt } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Gift, Loader2, Lock, CheckCircle2, Ticket, Star, Trophy, Sparkles, Clock, Activity, Wand2, X, Rocket } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, writeBatch, collection, increment, serverTimestamp, query, where, documentId, orderBy, limit, getDocs } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAcademicHealth } from '@/hooks/use-academic-health';

// --- Types ---
interface Transaction {
  id: string;
  userId: string;
  type: 'earned' | 'spent' | 'bought';
  currency: string;
  amount: number;
  createdAt: any;
  description?: string;
}

interface SurpriseCouponProps {
  userProfile: User;
}

// --- Helper: Logic for calculating progress (Shared) ---
const useCouponProgress = (coupon: Coupon, recentAttempts: any[], recentTransactions: any[], academicHealth: number, worksheets: any[]) => {
    return useMemo(() => {
        if (!coupon.conditions?.length) return { conditionsMet: true, taskProgress: [] };

        // Determine Start Time (only count activity AFTER coupon was created)
        const couponStartTime = (coupon as any).createdAt?.toMillis?.() 
            || coupon.availableDate?.toDate().getTime() 
            || 0;

        const validAttempts = (recentAttempts || []).filter(a => {
            const t = a.attemptedAt?.toMillis?.() || 0;
            return t >= couponStartTime;
        });

        const validTransactions = (recentTransactions || []).filter(t => {
            const time = t.createdAt?.toMillis?.() || 0;
            return time >= couponStartTime;
        });

        let allMet = true;
        const progress = coupon.conditions.map((condition: any) => {
            let current = 0; let label = "";
            if (condition.type === 'minPracticeAssignments') { 
                label = "Practice Worksheets"; 
                current = validAttempts.length; 
            } 
            else if (condition.type === 'minClassroomAssignments') { 
                label = "Classroom Assignments"; 
                current = validAttempts.filter((a: any) => { 
                    const w = (worksheets || []).find((sheet: any) => sheet.id === a.worksheetId); 
                    return w?.worksheetType === 'classroom'; 
                }).length; 
            } 
            else if (condition.type === 'minGoldQuestions') { 
                label = "Earn Gold"; 
                current = validTransactions.filter((t: any) => t.currency === 'gold' && t.type === 'earned').length; 
            } 
            else if (condition.type === 'minAcademicHealth') { 
                label = `Academic Health > ${condition.value}%`; 
                current = academicHealth; 
            }

            const isMet = current >= condition.value; 
            if (!isMet) allMet = false;
            
            return { 
                label, 
                current, 
                required: condition.value, 
                isMet, 
                percentage: Math.min(100, (current/condition.value)*100) 
            };
        });

        return { conditionsMet: allMet, taskProgress: progress };
    }, [coupon, recentAttempts, recentTransactions, academicHealth, worksheets]);
};

// --- Helper: Countdown Timer (Restored) ---
function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState<string>("--:--:--");
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;
      if (distance < 0) { setTimeLeft("00:00:00"); return; }
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);
  return <span className="font-mono text-amber-600 dark:text-amber-400 font-bold tracking-widest text-lg">{timeLeft}</span>;
}

// --- Component 1: Desktop Coupon Card (Ticket UI - UNCHANGED) ---
function DesktopCouponCard({ coupon, userProfile, recentAttempts, worksheets, recentTransactions, academicHealth, isClaimed }: any) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [isClaiming, setIsClaiming] = useState(false);
    const [localClaimed, setLocalClaimed] = useState(isClaimed);
  
    const { conditionsMet, taskProgress } = useCouponProgress(coupon, recentAttempts, recentTransactions, academicHealth, worksheets);
    const isTimeReady = !coupon.availableDate || Date.now() >= coupon.availableDate.toDate().getTime();
    const canClaim = isTimeReady && !localClaimed && conditionsMet;
  
    const handleClaim = async () => {
      if (!firestore || !user) return;
      setIsClaiming(true);
      try {
        const batch = writeBatch(firestore);
        const userRef = doc(firestore, 'users', user.uid);
        const transactionRef = doc(collection(firestore, 'transactions'));
        const fieldMap: any = { coin: 'coins', gold: 'gold', diamond: 'diamonds', aiCredits: 'aiCredits' };
        const field = fieldMap[coupon.rewardCurrency] || 'coins';
        
        batch.update(userRef, { [field]: increment(coupon.rewardAmount), lastCouponClaimedAt: serverTimestamp() });
        batch.set(transactionRef, { 
            userId: user.uid, 
            type: 'earned', 
            description: `Coupon: ${coupon.name}`, 
            amount: coupon.rewardAmount, 
            currency: coupon.rewardCurrency, 
            createdAt: serverTimestamp() 
        });
        
        await batch.commit();
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
        toast({ title: 'Reward Claimed!', description: `You received ${coupon.rewardAmount} ${coupon.rewardCurrency}.` });
        setLocalClaimed(true);
      } catch (error: any) { toast({ variant: 'destructive', title: 'Error', description: error.message }); } finally { setIsClaiming(false); }
    };
  
    if (localClaimed) {
      return (
        <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 dark:from-yellow-950/30 dark:to-orange-950/30">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-10"></div>
            <CardContent className="pt-8 pb-8 px-8 text-center relative z-10 space-y-6">
                <div className="mx-auto bg-yellow-100 dark:bg-yellow-900/50 p-4 rounded-full w-fit shadow-inner ring-4 ring-yellow-200 dark:ring-yellow-800">
                    <Trophy className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400">CONGRATULATIONS!</h2>
                    <p className="text-lg font-medium text-slate-700 dark:text-slate-200">You earned <span className="font-bold text-yellow-600">{coupon.rewardAmount} {coupon.rewardCurrency}</span></p>
                </div>
                {taskProgress.length > 0 && (<div className="grid gap-2 text-left bg-white/40 dark:bg-black/20 p-4 rounded-xl"><span className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 block">Completed Missions</span>{taskProgress.map((task: any, idx: number) => (<div key={idx} className="flex items-center gap-3 text-sm"><div className="bg-green-100 dark:bg-green-900/50 p-1 rounded-full"><CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" /></div><span className="font-semibold text-slate-700 dark:text-slate-300 line-through decoration-green-500/50">{task.label}</span></div>))}</div>)}
            </CardContent>
            <CardFooter className="justify-center pb-8 pt-0">
               <Badge variant="outline" className="border-yellow-600 text-yellow-700 bg-yellow-50 px-4 py-1">Reward Collected</Badge>
            </CardFooter>
        </Card>
      );
    }
  
    return (
      <Card className="relative overflow-hidden border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-900 dark:to-slate-950 shadow-lg group hover:shadow-xl transition-all duration-300">
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-black rounded-full border-r-2 border-indigo-200 dark:border-indigo-800" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-black rounded-full border-l-2 border-indigo-200 dark:border-indigo-800" />
        <CardHeader className="pb-2 text-center relative z-10"><div className="mx-auto bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-full w-fit mb-2"><Ticket className="h-6 w-6 text-indigo-600 dark:text-indigo-400" /></div><CardTitle className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{coupon.name}</CardTitle><CardDescription className="text-base font-medium">{conditionsMet ? "Ready to Claim" : "Complete tasks to unlock"}</CardDescription></CardHeader>
        <CardContent className="space-y-6 relative z-10 px-8">
          {coupon.availableDate && (<div className={cn("rounded-xl border p-4 transition-colors", !isTimeReady ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900" : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900")}><div className={cn("text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2", !isTimeReady ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400")}>{!isTimeReady ? <><Clock className="h-3 w-3" /> Coming Soon</> : "Time Requirement"}</div><div className="text-center mt-1">{!isTimeReady ? <CountdownTimer targetDate={coupon.availableDate.toDate()} /> : <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Available Now!</p>}</div></div>)}
          {taskProgress.length > 0 && (<div><div className="flex items-center gap-2 mb-3"><Star className="h-4 w-4 text-indigo-500" /><h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">Mission Requirements</h4></div><div className="space-y-3">{taskProgress.map((task: any, idx: number) => (<div key={idx} className="bg-white dark:bg-slate-900/50 p-3 rounded-lg border shadow-sm"><div className="flex justify-between items-start mb-2"><span className={cn("text-sm font-bold block", task.isMet ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200")}>{task.label}</span>{task.isMet ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Done</Badge> : <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">Pending</Badge>}</div><Progress value={task.percentage} className={cn("h-2", task.isMet ? "bg-emerald-100" : "")} /><div className="mt-2 text-xs flex justify-end">{task.isMet ? <span className="text-emerald-600 font-bold flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" /> Eligible</span> : <span className="text-indigo-600 font-bold flex items-center gap-1.5 animate-pulse">{task.suffix ? <><Activity className="h-3.5 w-3.5" /> Current: {task.current}{task.suffix}</> : <><Rocket className="h-3.5 w-3.5" /> {task.required - task.current} to go!</>}</span>}</div></div>))}</div></div>)}
        </CardContent>
        <Separator className="bg-indigo-100 dark:bg-indigo-900" />
        <CardFooter className="pt-6 pb-6 bg-indigo-50/50 dark:bg-indigo-950/30 flex justify-center"><Button size="lg" onClick={handleClaim} disabled={!canClaim || isClaiming} className={cn("w-full font-bold text-lg h-14 shadow-xl transition-all", canClaim ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-gradient text-white" : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed")}>{isClaiming ? <Loader2 className="h-5 w-5 animate-spin" /> : canClaim ? <><Gift className="h-6 w-6 mr-2 animate-bounce" /> Claim Reward</> : <><Lock className="h-5 w-5 mr-2" /> Complete Missions</>}</Button></CardFooter>
      </Card>
    );
}

// --- 3. MOBILE: CREAM SUCCESS CARD (Direct Grid View) ---
function MobileSuccessCard({ coupon, taskProgress }: { coupon: Coupon, taskProgress: any[] }) {
    return (
        <div className="flex flex-col h-full bg-[#FEFCE8] dark:bg-yellow-950/20 text-center relative overflow-hidden rounded-2xl shadow-sm border border-[#FEF3C7] p-3">
             <div className="flex flex-col h-full items-center justify-between">
                <div className="flex flex-col items-center gap-1">
                    <div className="bg-[#FEF08A] p-2 rounded-full ring-2 ring-yellow-50/50 shadow-sm border border-[#FDE68A] mb-1">
                        <Trophy className="h-5 w-5 text-[#A16207]" />
                    </div>
                    <h2 className="text-sm font-black text-[#A16207] uppercase tracking-wide leading-none">CONGRATULATIONS!</h2>
                    <p className="text-[10px] font-medium text-slate-600 leading-tight">
                        You earned <span className="font-bold text-[#B45309]">{coupon.rewardAmount} {coupon.rewardCurrency}</span>
                    </p>
                </div>
                <div className="w-full bg-[#FAFAF9] dark:bg-black/10 rounded-lg p-2 border border-slate-100 dark:border-transparent text-left my-2 flex-1 overflow-hidden flex flex-col justify-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-center">COMPLETED</p>
                    <div className="space-y-1">
                        {taskProgress.slice(0, 2).map((task: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-1.5">
                                <div className="bg-green-100 rounded-full p-[1px] shrink-0"><CheckCircle2 className="h-2.5 w-2.5 text-green-600" /></div>
                                <span className="text-[9px] font-semibold text-slate-600 line-through decoration-slate-300 truncate">{task.label}</span>
                            </div>
                        ))}
                        {taskProgress.length > 2 && (
                            <p className="text-[8px] text-center text-slate-400 font-medium italic">+{taskProgress.length - 2} more</p>
                        )}
                    </div>
                </div>
                <div className="w-full">
                    <div className="text-[9px] font-bold text-[#A16207] border border-[#D4A373] py-1 rounded-full bg-[#FEF3C7] w-full text-center">Reward Collected</div>
                </div>
             </div>
        </div>
    );
}

// --- 4. MOBILE: SCRATCH CANVAS ---
function ScratchCard({ children, isRevealed, onReveal }: { children: React.ReactNode, isRevealed: boolean, onReveal: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScratching, setIsScratching] = useState(false);

  useEffect(() => {
    if (isRevealed || !canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#94a3b8'); gradient.addColorStop(0.5, '#cbd5e1'); gradient.addColorStop(1, '#94a3b8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '20px sans-serif'; ctx.fillStyle = '#64748b'; ctx.globalAlpha = 0.3;
    for(let i=0; i<5; i++) { for(let j=0; j<10; j++) { ctx.fillText('???', 50 + (i*100), 50 + (j*60)); } }
    ctx.globalAlpha = 1.0; ctx.globalCompositeOperation = 'destination-out';

    const scratch = (x: number, y: number) => { ctx.beginPath(); ctx.arc(x, y, 25, 0, 2 * Math.PI); ctx.fill(); };
    const handleStart = () => setIsScratching(true);
    const handleEnd = () => setIsScratching(false);
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isScratching) return;
      const bounds = canvas.getBoundingClientRect();
      let cx, cy;
      if ('touches' in e) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; } else { cx = (e as MouseEvent).clientX; cy = (e as MouseEvent).clientY; }
      scratch(cx - bounds.left, cy - bounds.top);
    };
    canvas.addEventListener('mousedown', handleStart); canvas.addEventListener('touchstart', handleStart);
    window.addEventListener('mouseup', handleEnd); window.addEventListener('touchend', handleEnd);
    canvas.addEventListener('mousemove', handleMove); canvas.addEventListener('touchmove', handleMove);
    return () => { canvas.removeEventListener('mousedown', handleStart); canvas.removeEventListener('touchstart', handleStart); window.removeEventListener('mouseup', handleEnd); window.removeEventListener('touchend', handleEnd); canvas.removeEventListener('mousemove', handleMove); canvas.removeEventListener('touchmove', handleMove); };
  }, [isRevealed, isScratching]);

  const [interactCount, setInteractCount] = useState(0);
  const handleInteract = () => { if(interactCount > 10) onReveal(); else setInteractCount(c => c+1); }

  if (isRevealed) return <div className="animate-in fade-in zoom-in duration-500 w-full h-full">{children}</div>;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden shadow-inner bg-white rounded-2xl">
       <div className="absolute inset-0 pointer-events-none opacity-0">{children}</div>
       <canvas ref={canvasRef} className="absolute inset-0 z-20 touch-none cursor-pointer" onMouseMove={handleInteract} onTouchMove={handleInteract} />
       <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center text-slate-500/50"><Wand2 className="h-12 w-12 mb-2 animate-pulse" /><p className="font-bold text-xl uppercase tracking-widest">Scratch Me</p></div>
    </div>
  );
}

// --- 5. MOBILE MODAL ORCHESTRATOR ---
function MobileCouponModalContent({ coupon, taskProgress, isTimeReady, onClose, onClaimSuccess }: any) {
    const firestore = useFirestore();
    const { user } = useUser();
    const [isClaiming, setIsClaiming] = useState(false);
    const [justClaimed, setJustClaimed] = useState(false);

    // If Just Claimed -> Show Success View inside modal briefly
    if (justClaimed) {
        return (
            <div className="h-full w-full flex flex-col">
                <div className="flex flex-col h-full bg-[#FEFCE8] text-center relative overflow-hidden rounded-2xl p-6">
                     <div className="relative z-10 flex flex-col h-full items-center justify-center gap-6">
                        <div className="bg-[#FEF08A] p-4 rounded-full ring-4 ring-yellow-50/50 shadow-sm border border-[#FDE68A]">
                            <Trophy className="h-12 w-12 text-[#A16207]" />
                        </div>
                        <h2 className="text-2xl font-black text-[#A16207] uppercase tracking-wide">CONGRATULATIONS!</h2>
                        <p className="text-lg font-medium text-slate-600">You earned <span className="font-bold text-[#B45309]">{coupon.rewardAmount} {coupon.rewardCurrency}</span></p>
                        
                        <div className="w-full bg-[#FAFAF9] rounded-xl p-4 border border-[#FDE68A] text-left">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">MISSION COMPLETE</p>
                            <div className="space-y-2">
                                {taskProgress.map((task: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <span className="text-sm text-slate-700 line-through">{task.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button variant="outline" className="border-[#D4A373] text-[#A16207] bg-[#FEF3C7] rounded-full px-8 mt-auto" onClick={onClose}>Collect & Close</Button>
                     </div>
                </div>
                <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={onClose}><X className="h-6 w-6" /></Button>
            </div>
        );
    }

    const allMet = taskProgress.every((t:any) => t.isMet);
    const canUnlock = isTimeReady && allMet;

    const handleRevealAndClaim = async () => {
        if (!firestore || !user || isClaiming) return;
        setIsClaiming(true);
        try {
            const batch = writeBatch(firestore);
            const userRef = doc(firestore, 'users', user.uid);
            const transactionRef = doc(collection(firestore, 'transactions'));
            const fieldMap: any = { coin: 'coins', gold: 'gold', diamond: 'diamonds', aiCredits: 'aiCredits' };
            const field = fieldMap[coupon.rewardCurrency] || 'coins';
            
            batch.update(userRef, { [field]: increment(coupon.rewardAmount), lastCouponClaimedAt: serverTimestamp() });
            batch.set(transactionRef, { 
                userId: user.uid, 
                type: 'earned', 
                description: `Coupon: ${coupon.name}`, 
                amount: coupon.rewardAmount, 
                currency: coupon.rewardCurrency, 
                createdAt: serverTimestamp() 
            });
            await batch.commit();
            confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, zIndex: 9999 });
            setJustClaimed(true);
            onClaimSuccess(); 
        } catch (e) { console.error(e); } finally { setIsClaiming(false); }
    };

    // --- LOCKED STATE (Conditions Not Met) ---
    if (!canUnlock) {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-slate-950 p-6 text-center rounded-2xl relative">
                 <div className="bg-slate-100 p-4 rounded-full w-fit mx-auto mb-4"><Lock className="h-8 w-8 text-slate-400" /></div>
                 <h2 className="text-xl font-bold mb-2">Mission Locked</h2>
                 <div className="space-y-4 text-left flex-1 overflow-y-auto mt-4">
                     {taskProgress.map((task: any, idx: number) => (
                         <div key={idx} className="bg-slate-50 border rounded-lg p-3">
                             <div className="flex justify-between items-center mb-2">
                                 <span className="text-xs font-bold uppercase text-slate-500">{task.label}</span>
                                 {task.isMet ? <CheckCircle2 className="h-4 w-4 text-green-500"/> : <span className="text-xs text-indigo-500 font-bold">{task.current}/{task.required}</span>}
                             </div>
                             <Progress value={task.percentage} className={cn("h-2", task.isMet ? "bg-green-100" : "")} />
                         </div>
                     ))}
                 </div>
                 
                 <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
                     <p className="text-sm font-bold text-indigo-700 flex items-center justify-center gap-2"><Rocket className="h-4 w-4"/> What are you waiting for?</p>
                     <p className="text-xs text-indigo-600">Complete tasks to verify eligibility!</p>
                 </div>

                 <Button onClick={onClose} variant="ghost" className="mt-4 absolute top-0 right-0"><X className="h-5 w-5"/></Button>
            </div>
        );
    }

    // --- UNLOCKED STATE (Scratch Card) ---
    return (
        <div className="h-full w-full rounded-2xl overflow-hidden relative">
            <ScratchCard isRevealed={justClaimed} onReveal={handleRevealAndClaim}>
                <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>
            </ScratchCard>
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-white z-50" onClick={onClose}><X className="h-6 w-6" /></Button>
        </div>
    );
}

// --- 6. MAIN EXPORT ---
export function SurpriseCoupon({ userProfile }: SurpriseCouponProps) {
  const firestore = useFirestore();
  const academicHealth = useAcademicHealth(userProfile);
  
  // Queries
  const couponsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'coupons'), orderBy('availableDate', 'asc')) : null, [firestore]);
  const { data: coupons, isLoading } = useCollection<Coupon>(couponsQuery);
  const recentAttemptsQuery = useMemoFirebase(() => { if (!firestore || !userProfile.id) return null; const d = new Date(); d.setMonth(d.getMonth()-1); return query(collection(firestore, 'worksheet_attempts'), where('userId', '==', userProfile.id), where('attemptedAt', '>', d), orderBy('attemptedAt', 'desc'), limit(100)); }, [firestore, userProfile.id]);
  const { data: recentAttempts } = useCollection<WorksheetAttempt>(recentAttemptsQuery);
  const transactionsQuery = useMemoFirebase(() => { if(!firestore || !userProfile.id) return null; const d = new Date(); d.setMonth(d.getMonth()-1); return query(collection(firestore, 'transactions'), where('userId', '==', userProfile.id), where('createdAt', '>', d), orderBy('createdAt', 'desc'), limit(50)); }, [firestore, userProfile.id]);
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);
  
  const [worksheets, setWorksheets] = useState<any[]>([]);
  useEffect(() => {
     const fetchWs = async () => {
         if(!firestore || !recentAttempts?.length) return;
         const ids = [...new Set(recentAttempts.map(a => a.worksheetId))].slice(0, 20);
         if(ids.length === 0) return;
         const q = query(collection(firestore, 'worksheets'), where(documentId(), 'in', ids));
         const s = await getDocs(q);
         setWorksheets(s.docs.map(d => ({id: d.id, ...d.data()})));
     };
     fetchWs();
  }, [recentAttempts]);

  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  if (isLoading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      {/* --- DESKTOP VIEW --- */}
      <div className="hidden md:grid gap-6 md:grid-cols-2">
         {coupons?.map(coupon => {
             const isClaimed = transactions?.some(t => t.description === `Coupon: ${coupon.name}`);
             return (
                 <DesktopCouponCard 
                    key={coupon.id} 
                    coupon={coupon} 
                    userProfile={userProfile} 
                    recentAttempts={recentAttempts} 
                    worksheets={worksheets} 
                    recentTransactions={transactions} 
                    academicHealth={academicHealth}
                    isClaimed={isClaimed}
                 />
             );
         })}
      </div>

      {/* --- MOBILE VIEW --- */}
      <div className="grid grid-cols-2 gap-4 md:hidden">
         {coupons?.map((coupon, idx) => {
             const isClaimed = transactions?.some(t => t.description === `Coupon: ${coupon.name}`);
             
             if (isClaimed) {
                 return <MobileDirectSuccessCard key={coupon.id} coupon={coupon} userProfile={userProfile} recentAttempts={recentAttempts} worksheets={worksheets} recentTransactions={transactions} academicHealth={academicHealth} />;
             }

             const colors = ["bg-gradient-to-br from-pink-500 to-rose-500", "bg-gradient-to-br from-indigo-500 to-blue-500", "bg-gradient-to-br from-amber-500 to-orange-500", "bg-gradient-to-br from-emerald-500 to-teal-500"];
             const bgClass = colors[idx % colors.length];

             return (
                 <div key={coupon.id} onClick={() => setSelectedCoupon(coupon)} className={cn("aspect-[3/4] rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer shadow-lg relative overflow-hidden active:scale-95 transition-transform", bgClass)}>
                     <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
                     <div className="relative z-10 flex flex-col items-center gap-3">
                         <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm border border-white/30">
                             <Gift className="h-8 w-8 text-white animate-pulse" />
                         </div>
                         <div>
                             <h3 className="font-black text-lg leading-tight uppercase text-white">Surprise</h3>
                             <p className="text-white/80 text-xs font-medium mt-1">Tap to Reveal</p>
                         </div>
                     </div>
                     <div className="absolute -right-8 top-4 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-8 py-1 rotate-45 shadow-sm">LUCKY</div>
                 </div>
             )
         })}
      </div>

      <Dialog open={!!selectedCoupon} onOpenChange={(open) => !open && setSelectedCoupon(null)}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-sm w-full mx-auto outline-none h-[60vh]">
            <DialogTitle className="sr-only">Surprise</DialogTitle>
            <DialogDescription className="sr-only">Reveal</DialogDescription>
            {selectedCoupon && (
                <MobileModalWrapper 
                    coupon={selectedCoupon}
                    userProfile={userProfile}
                    recentAttempts={recentAttempts}
                    recentTransactions={transactions}
                    worksheets={worksheets}
                    academicHealth={academicHealth}
                    onClose={() => setSelectedCoupon(null)}
                />
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function MobileDirectSuccessCard({ coupon, userProfile, recentAttempts, worksheets, recentTransactions, academicHealth }: any) {
    const { taskProgress } = useCouponProgress(coupon, recentAttempts, recentTransactions, academicHealth, worksheets);
    return <MobileSuccessCard coupon={coupon} taskProgress={taskProgress} />;
}

function MobileModalWrapper({ coupon, userProfile, recentAttempts, recentTransactions, worksheets, academicHealth, onClose }: any) {
    const { conditionsMet, taskProgress } = useCouponProgress(coupon, recentAttempts, recentTransactions, academicHealth, worksheets);
    const refTime = coupon.availableDate ? coupon.availableDate.toDate().getTime() : 0;
    const isTimeReady = !coupon.availableDate || Date.now() >= refTime;

    return (
        <MobileCouponModalContent 
            coupon={coupon} 
            taskProgress={taskProgress} 
            isTimeReady={isTimeReady}
            onClose={onClose} 
            onClaimSuccess={() => { onClose(); }}
        />
    );
}