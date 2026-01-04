'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { User, Coupon, WorksheetAttempt } from '@/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Gift, Loader2, Lock, CheckCircle2, Star, Wand2, X } from 'lucide-react';
// ✅ FIXED: Added useUser to imports
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, writeBatch, collection, increment, serverTimestamp, query, where, orderBy, limit } from 'firebase/firestore';
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

// --- 1. Scratch Card Component ---
interface ScratchCardProps {
  children: React.ReactNode;
  isRevealed: boolean;
  onReveal: () => void;
}

function ScratchCard({ children, isRevealed, onReveal }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);

  useEffect(() => {
    if (isRevealed || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set size
    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Draw Silver Gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#94a3b8'); 
    gradient.addColorStop(0.5, '#cbd5e1'); 
    gradient.addColorStop(1, '#94a3b8'); 
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Pattern
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.globalAlpha = 0.3;
    for(let i=0; i<5; i++) {
        for(let j=0; j<10; j++) {
            ctx.fillText('???', 50 + (i*100), 50 + (j*60));
        }
    }
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'destination-out';

    const handleStart = () => setIsScratching(true);
    const handleEnd = () => setIsScratching(false);
    
    const scratch = (x: number, y: number) => {
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, 2 * Math.PI);
      ctx.fill();
      setScratchProgress(prev => {
          const next = prev + 1;
          if (next > 40) onReveal(); // Threshold
          return next;
      });
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isScratching) return;
      const bounds = canvas.getBoundingClientRect();
      let clientX, clientY;
      
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      scratch(clientX - bounds.left, clientY - bounds.top);
    };

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('touchstart', handleStart);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove);

    return () => {
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('touchstart', handleStart);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('touchmove', handleMove);
    };
  }, [isRevealed, isScratching, onReveal]);

  if (isRevealed) {
    return <div className="animate-in fade-in zoom-in duration-500 w-full h-full">{children}</div>;
  }

  return (
    <div ref={containerRef} className="relative w-full aspect-[3/4] rounded-xl overflow-hidden shadow-inner bg-white">
       <div className="absolute inset-0 pointer-events-none opacity-0">{children}</div>
       <canvas ref={canvasRef} className="absolute inset-0 z-20 touch-none cursor-pointer" />
       <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center text-slate-500/50">
           <Wand2 className="h-12 w-12 mb-2 animate-pulse" />
           <p className="font-bold text-xl uppercase tracking-widest">Scratch Me</p>
       </div>
    </div>
  );
}

// --- 2. Detail Content (Inside Modal) ---
function CouponDetailContent({ coupon, userProfile, recentAttempts, recentTransactions, academicHealth, onClose }: any) {
  const firestore = useFirestore();
  const { user } = useUser(); // ✅ Now this works
  const { toast } = useToast();
  const [isClaiming, setIsClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);

  const lastClaimedMillis = (userProfile.lastCouponClaimedAt as any)?.toMillis?.() || 0;
  const referenceTimeMillis = coupon.availableDate ? coupon.availableDate.toDate().getTime() : 0;
  const isTimeReady = !coupon.availableDate || Date.now() >= referenceTimeMillis;
  const isAlreadyClaimed = lastClaimedMillis >= referenceTimeMillis;

  const { conditionsMet, taskProgress } = useMemo(() => {
    if (!coupon.conditions?.length) return { conditionsMet: true, taskProgress: [] };
    
    const validAttempts = recentAttempts || [];
    const validTransactions = recentTransactions || [];
    let allMet = true;
    
    const progress = coupon.conditions.map((condition: any) => {
        let current = 0;
        let label = "Mission";
        
        if (condition.type === 'minPracticeAssignments') {
            label = "Complete Practice Worksheets";
            current = validAttempts.length; 
        } else if (condition.type === 'minGoldQuestions') {
            label = "Earn Gold";
            current = validTransactions.filter((t: any) => t.currency === 'gold' && t.type === 'earned').length;
        } else if (condition.type === 'minAcademicHealth') {
            label = `Academic Health > ${condition.value}%`;
            current = academicHealth;
        }
        
        const isMet = current >= condition.value;
        if (!isMet) allMet = false;
        
        return { label, current, required: condition.value, isMet, percentage: Math.min(100, (current/condition.value)*100) };
    });
    
    return { conditionsMet: allMet, taskProgress: progress };
  }, [coupon, recentAttempts, recentTransactions, academicHealth]);

  const canClaim = isTimeReady && !isAlreadyClaimed && conditionsMet && !justClaimed;

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
        userId: user.uid, type: 'earned', description: `Coupon: ${coupon.name}`,
        amount: coupon.rewardAmount, currency: coupon.rewardCurrency,
        createdAt: serverTimestamp()
      });

      await batch.commit();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.7 } });
      setJustClaimed(true);
      toast({ title: "Reward Claimed!", description: `+${coupon.rewardAmount} ${coupon.rewardCurrency}` });
    } catch (error) {
      console.error(error);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-xl overflow-hidden relative">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-center text-white relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
            <div className="relative z-10">
                <Gift className="h-10 w-10 mx-auto mb-2 animate-bounce" />
                <h2 className="text-2xl font-black uppercase tracking-tight">{coupon.name}</h2>
                <p className="text-indigo-100 font-medium text-sm mt-1">{justClaimed ? "Reward Collected!" : "Surprise Unlocked"}</p>
            </div>
        </div>

        <div className="p-6 text-center space-y-2 shrink-0">
             <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Reward Value</p>
             <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-600">
                 {coupon.rewardAmount} <span className="text-2xl text-slate-700 dark:text-slate-300 capitalize">{coupon.rewardCurrency}</span>
             </div>
        </div>

        {taskProgress.length > 0 && (
            <div className="px-6 pb-4 space-y-3 overflow-y-auto flex-1">
                <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-bold uppercase text-slate-500">Requirements</span>
                </div>
                {taskProgress.map((task: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold">{task.label}</span>
                            {task.isMet ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Lock className="h-3 w-3 text-slate-400" />}
                        </div>
                        <Progress value={task.percentage} className={cn("h-1.5", task.isMet ? "bg-green-100" : "")} />
                    </div>
                ))}
            </div>
        )}

        <div className="mt-auto p-6 bg-slate-50 dark:bg-slate-900 border-t shrink-0">
            {justClaimed || isAlreadyClaimed ? (
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold" onClick={onClose}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Done
                </Button>
            ) : (
                <Button 
                    className={cn("w-full h-12 text-lg font-bold shadow-lg", canClaim ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white" : "bg-slate-200 text-slate-400")}
                    disabled={!canClaim || isClaiming}
                    onClick={handleClaim}
                >
                    {isClaiming ? <Loader2 className="animate-spin" /> : canClaim ? "Claim Now" : "Locked"}
                </Button>
            )}
        </div>
    </div>
  );
}

// --- 3. Main List Component ---
export function SurpriseCoupon({ userProfile }: SurpriseCouponProps) {
  const firestore = useFirestore();
  const academicHealth = useAcademicHealth(userProfile);
  
  const couponsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'coupons'), orderBy('availableDate', 'asc')) : null, [firestore]);
  const { data: coupons, isLoading } = useCollection<Coupon>(couponsQuery);
  
  const recentAttemptsQuery = useMemoFirebase(() => {
     if (!firestore || !userProfile.id) return null;
     const d = new Date(); d.setMonth(d.getMonth()-1);
     return query(collection(firestore, 'worksheet_attempts'), where('userId', '==', userProfile.id), where('attemptedAt', '>', d), orderBy('attemptedAt', 'desc'), limit(50));
  }, [firestore, userProfile.id]);
  const { data: recentAttempts } = useCollection<WorksheetAttempt>(recentAttemptsQuery);

  const transactionsQuery = useMemoFirebase(() => {
     if(!firestore || !userProfile.id) return null;
     const d = new Date(); d.setMonth(d.getMonth()-1);
     return query(collection(firestore, 'transactions'), where('userId', '==', userProfile.id), where('createdAt', '>', d), orderBy('createdAt', 'desc'), limit(50));
  }, [firestore, userProfile.id]);
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [isRevealedMap, setIsRevealedMap] = useState<Record<string, boolean>>({});

  const handleOpen = (c: Coupon) => setSelectedCoupon(c);
  const handleReveal = (id: string) => {
      setIsRevealedMap(prev => ({ ...prev, [id]: true }));
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 } });
  };
  const handleClose = () => setSelectedCoupon(null);

  if (isLoading) return <div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {coupons?.map((coupon, idx) => {
           const lastClaimed = (userProfile.lastCouponClaimedAt as any)?.toMillis?.() || 0;
           const refTime = coupon.availableDate?.toDate().getTime() || 0;
           const isClaimed = lastClaimed >= refTime;
           
           const colors = [
               "bg-gradient-to-br from-pink-500 to-rose-500",
               "bg-gradient-to-br from-indigo-500 to-blue-500",
               "bg-gradient-to-br from-amber-500 to-orange-500",
               "bg-gradient-to-br from-emerald-500 to-teal-500"
           ];
           const bgClass = isClaimed ? "bg-slate-100 dark:bg-slate-900 border-slate-200 grayscale opacity-70" : colors[idx % colors.length];

           return (
             <div 
               key={coupon.id}
               onClick={() => handleOpen(coupon)}
               className={cn(
                   "aspect-[3/4] rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer shadow-lg relative overflow-hidden group active:scale-95 transition-transform",
                   bgClass
               )}
             >
                {!isClaimed && <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />}
                <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm border border-white/30">
                        {isClaimed ? <CheckCircle2 className="h-8 w-8 text-slate-400" /> : <Gift className="h-8 w-8 text-white animate-pulse" />}
                    </div>
                    <div>
                        <h3 className={cn("font-black text-lg leading-tight uppercase", isClaimed ? "text-slate-500" : "text-white")}>
                            {isClaimed ? "Collected" : "Surprise"}
                        </h3>
                        {!isClaimed && <p className="text-white/80 text-xs font-medium mt-1">Tap to Reveal</p>}
                    </div>
                </div>
                {!isClaimed && (
                    <div className="absolute -right-8 top-4 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-8 py-1 rotate-45 shadow-sm">
                        LUCKY
                    </div>
                )}
             </div>
           );
        })}
      </div>

      <Dialog open={!!selectedCoupon} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-sm w-full mx-auto outline-none">
             <DialogTitle className="sr-only">Surprise Coupon</DialogTitle>
             <DialogDescription className="sr-only">A surprise coupon with conditions to claim a reward.</DialogDescription>
             {selectedCoupon && (
                 <div className="relative w-full aspect-[3/4] mx-auto filter drop-shadow-2xl">
                     {((userProfile.lastCouponClaimedAt as any)?.toMillis?.() || 0) >= (selectedCoupon.availableDate?.toDate().getTime() || 0) || isRevealedMap[selectedCoupon.id] ? (
                         <div className="animate-in fade-in zoom-in duration-300 h-full w-full">
                            <CouponDetailContent 
                                coupon={selectedCoupon} 
                                userProfile={userProfile}
                                recentAttempts={recentAttempts}
                                recentTransactions={transactions}
                                academicHealth={academicHealth}
                                onClose={handleClose}
                            />
                         </div>
                     ) : (
                         <ScratchCard 
                            isRevealed={isRevealedMap[selectedCoupon.id] || false} 
                            onReveal={() => handleReveal(selectedCoupon.id)}
                         >
                             <CouponDetailContent 
                                coupon={selectedCoupon} 
                                userProfile={userProfile}
                                recentAttempts={recentAttempts}
                                recentTransactions={transactions}
                                academicHealth={academicHealth}
                                onClose={handleClose}
                            />
                         </ScratchCard>
                     )}
                     <Button variant="ghost" size="icon" className="absolute -top-12 right-0 text-white hover:bg-white/20 rounded-full" onClick={handleClose}>
                         <X className="h-6 w-6" />
                     </Button>
                 </div>
             )}
        </DialogContent>
      </Dialog>
    </>
  );
}
