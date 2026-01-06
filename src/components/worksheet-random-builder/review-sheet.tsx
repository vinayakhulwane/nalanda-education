'use client';

import { useState, useMemo } from 'react';
import type { Question, CurrencyType, Unit, Category, EconomySettings } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { calculateWorksheetCost } from '@/lib/wallet';
import { ShoppingCart, ArrowRight, X, Trash2, Filter, Search, Plus, Coins, Crown, Gem, BrainCircuit, Sparkles } from 'lucide-react';

type QuestionWithSource = Question & { source?: 'manual' | 'random' };

const currencyIcons: Record<CurrencyType, React.ElementType> = {
    spark: Sparkles,
    coin: Coins,
    gold: Crown,
    diamond: Gem,
    aiCredits: BrainCircuit,
};

type ReviewSheetProps = {
    selectedQuestions: QuestionWithSource[];
    removeQuestion: (questionId: string) => void;
    onCreateWorksheet: (worksheetType: 'classroom' | 'sample' | 'practice') => void;
    animateCart: boolean;
    unitMap: Map<string, string>;
    categoryMap: Map<string, string>;
};

export function WorksheetReviewSheet({
    selectedQuestions,
    removeQuestion,
    onCreateWorksheet,
    animateCart,
    unitMap,
    categoryMap
}: ReviewSheetProps) {
    const [worksheetType, setWorksheetType] = useState<'classroom' | 'sample'>('classroom');
    const { userProfile } = useUser();
    const firestore = useFirestore();
    const userIsEditor = userProfile?.role === 'admin' || userProfile?.role === 'teacher';

    const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
    const { data: settings } = useDoc<EconomySettings>(settingsRef);
    
    const { totalMarks, estimatedTime, breakdownByUnit, creationCost } = useMemo(() => {
        let totalMarks = 0;
        const breakdownByUnit: Record<string, { count: number; marks: number }> = {};
        selectedQuestions.forEach(q => {
            const marks = q.solutionSteps?.reduce((stepSum, step) => stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
            totalMarks += marks;
            const unitName = unitMap.get(q.unitId) || 'Uncategorized';
            if (!breakdownByUnit[unitName]) breakdownByUnit[unitName] = { count: 0, marks: 0 };
            breakdownByUnit[unitName].count++;
            breakdownByUnit[unitName].marks += marks;
        });
        const creationCost = calculateWorksheetCost(selectedQuestions, settings ?? undefined);
        return { totalMarks, estimatedTime: Math.ceil((totalMarks * 20) / 60), breakdownByUnit, creationCost };
    }, [selectedQuestions, unitMap, settings]);

    const handleCreateClick = () => {
        onCreateWorksheet(userIsEditor ? worksheetType : 'practice');
    }

    const canAfford = useMemo(() => {
        if (userIsEditor) return true;
        if (!userProfile) return false;
        return (userProfile.coins >= creationCost.coins) && (userProfile.gold >= creationCost.gold) &&
            (userProfile.diamonds >= creationCost.diamonds) && ((userProfile.aiCredits || 0) >= (creationCost.aiCredits || 0));
    }, [userProfile, creationCost, userIsEditor]);

    return (
        <div className="lg:hidden fixed bottom-24 right-6 z-40">
            <Sheet>
                <SheetTrigger asChild>
                    <Button size="lg" className={cn("rounded-full h-14 w-14 shadow-2xl bg-gradient-to-r from-primary to-indigo-600 hover:scale-105 transition-transform border-4 border-white dark:border-slate-950", animateCart && "animate-pulse ring-4 ring-primary/30")} disabled={selectedQuestions.length === 0}>
                        <ShoppingCart className="h-6 w-6 text-white" />
                        {selectedQuestions.length > 0 && (<span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-md border-2 border-white dark:border-slate-950 animate-in zoom-in">{selectedQuestions.length}</span>)}
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-full flex flex-col p-0 h-[100dvh] rounded-none border-l-0">
                    <SheetHeader className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-b sticky top-0 z-10">
                        <div className="flex items-center justify-between">
                            <SheetTitle className="text-xl">Review Worksheet</SheetTitle>
                            <SheetClose asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><X className="h-4 w-4" /></Button></SheetClose>
                        </div>
                    </SheetHeader>
                    <div className="flex-grow flex flex-col h-full overflow-hidden">
                        <Tabs defaultValue="blueprint" className="flex-grow flex flex-col">
                            <div className="px-6 pt-4">
                                <TabsList className="w-full grid grid-cols-2">
                                    <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
                                    <TabsTrigger value="review">Questions</TabsTrigger>
                                </TabsList>
                            </div>
                            <div className="flex-grow overflow-y-auto p-6">
                                <TabsContent value="blueprint" className="mt-0 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-primary/5 p-4 rounded-xl text-center border border-primary/10 flex flex-col items-center justify-center">
                                            <p className="text-3xl font-bold text-primary">{selectedQuestions.length}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-1">Questions</p>
                                        </div>
                                        <div className="bg-primary/5 p-4 rounded-xl text-center border border-primary/10 flex flex-col items-center justify-center">
                                            <p className="text-3xl font-bold text-primary">{totalMarks}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-1">Total Marks</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100"><Filter className="h-4 w-4 text-muted-foreground" /> Unit Distribution</h4>
                                        <div className="space-y-3">
                                            {Object.entries(breakdownByUnit).map(([name, data]) => (
                                                <div key={name}>
                                                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                                                        <span>{name}</span>
                                                        <span className="font-mono font-medium">{Math.round((data.count / selectedQuestions.length) * 100)}%</span>
                                                    </div>
                                                    <Progress value={(data.count / selectedQuestions.length) * 100} className="h-2" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>
                                <TabsContent value="review" className="mt-0 space-y-3 pb-20">
                                    {selectedQuestions.map(q => (
                                        <div key={q.id} className="flex items-start gap-3 p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-sm relative group active:scale-[0.99] transition-transform">
                                            <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                                                {currencyIcons[q.currencyType] && (() => { const Icon = currencyIcons[q.currencyType]; return <Icon className="h-4 w-4 text-muted-foreground" />; })()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium line-clamp-2 text-slate-800 dark:text-slate-200 mb-0.5">{q.name || "Untitled Question"}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 -mr-2" onClick={() => removeQuestion(q.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    ))}
                                </TabsContent>
                            </div>
                        </Tabs>
                        <div className="p-4 border-t bg-white dark:bg-slate-950 mt-auto">
                            <div className="space-y-4">
                                <Button className="w-full h-12 text-base font-bold shadow-lg bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 rounded-xl" onClick={handleCreateClick} disabled={!canAfford || selectedQuestions.length === 0}>
                                    {!canAfford ? 'Insufficient Funds' : 'Generate Worksheet'}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
