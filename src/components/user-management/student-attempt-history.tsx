'use client';

import { useMemo, useState } from 'react';
import type { User, Worksheet, WorksheetAttempt } from '@/types';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy, documentId } from 'firebase/firestore';
import { Loader2, ChevronRight, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { WorksheetDisplayCard } from '../academics/worksheet-display-card';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import Link from 'next/link';

interface StudentAttemptHistoryProps {
    student: User;
}

const calculateMetrics = (attempt: any, worksheet?: Worksheet) => {
    let score = attempt.score;
    let total = attempt.totalMarks;

    if ((score === undefined || total === undefined || total === 0) && attempt.results) {
        score = 0;
        total = 0;
        Object.values(attempt.results).forEach((res: any) => {
             const maxForQuestion = 1; 
             total += maxForQuestion;
             if (typeof res.score === 'number') {
                 score += res.score;
             } else if (res.isCorrect) {
                 score += maxForQuestion;
             }
        });
    }

    if (!total || total <= 0) {
        if (attempt.results) total = Object.keys(attempt.results).length || 1;
        else total = 1; 
    }

    if (score > total) {
        const assumedPercentage = score; 
        score = (assumedPercentage / 100) * total;
    }

    const percentage = Math.round((score / total) * 100);
    const isPassed = percentage >= 35; 

    return { percentage, score, total, isPassed };
};

export function StudentAttemptHistory({ student }: StudentAttemptHistoryProps) {
    const firestore = useFirestore();
    const { userProfile } = useUser();
    const userIsAdminOrTeacher = userProfile?.role === 'admin' || userProfile?.role === 'teacher';

    const attemptsQuery = useMemoFirebase(() => {
        if (!firestore || !student.id || (!userIsAdminOrTeacher && student.id !== userProfile?.id)) {
            return null;
        }
        return query(
            collection(firestore, 'worksheet_attempts'),
            where('userId', '==', student.id),
            orderBy('attemptedAt', 'desc') 
        );
    }, [firestore, student.id, userIsAdminOrTeacher, userProfile?.id]);

    const { data: attempts, isLoading: areAttemptsLoading } = useCollection<WorksheetAttempt>(attemptsQuery);

    const worksheetIds = useMemo(() => {
        if (!attempts) return [];
        return [...new Set(attempts.map(a => a.worksheetId))];
    }, [attempts]);

    const worksheetsQuery = useMemoFirebase(() => {
        if (!firestore || worksheetIds.length === 0) return null;
        return query(collection(firestore, 'worksheets'), where(documentId(), 'in', worksheetIds.slice(0, 30)));
    }, [firestore, worksheetIds]);

    const { data: worksheets, isLoading: areWorksheetsLoading } = useCollection<Worksheet>(worksheetsQuery);

    const { attemptsByWorksheet, orderedWorksheets } = useMemo(() => {
        if (!attempts || !worksheets) return { attemptsByWorksheet: new Map(), orderedWorksheets: [] };

        const wsMap = new Map(worksheets.map(ws => [ws.id, ws]));
        const attemptsMap = new Map<string, WorksheetAttempt[]>();

        attempts.forEach(attempt => {
            const existing = attemptsMap.get(attempt.worksheetId) || [];
            attemptsMap.set(attempt.worksheetId, [...existing, attempt]);
        });

        const sortedWs = [...worksheets].sort((a, b) => {
            const lastAttemptA = attemptsMap.get(a.id)?.[0]?.attemptedAt?.toMillis() || 0;
            const lastAttemptB = attemptsMap.get(b.id)?.[0]?.attemptedAt?.toMillis() || 0;
            return lastAttemptB - lastAttemptA;
        });

        return { attemptsByWorksheet: attemptsMap, orderedWorksheets: sortedWs };
    }, [attempts, worksheets]);

    const isLoading = areAttemptsLoading || areWorksheetsLoading;

    if (!userIsAdminOrTeacher && student.id !== userProfile?.id) return null;

    if (isLoading) {
        return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }

    if (orderedWorksheets.length === 0) {
        return <div className="text-center text-muted-foreground py-10 text-sm">No worksheets attempted yet.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="hidden md:block">
                <h3 className="text-lg font-medium">Attempt History</h3>
                <p className="text-sm text-muted-foreground">Recent activity log.</p>
            </div>

            {/* --- MOBILE LIST VIEW --- */}
            <div className="block md:hidden border-t border-b divide-y border-slate-100 dark:border-slate-800 -mx-6 bg-white dark:bg-slate-950">
                {orderedWorksheets.map(ws => {
                    const latestAttempt = attemptsByWorksheet.get(ws.id)?.[0];
                    if (!latestAttempt) return null;

                    const metrics = calculateMetrics(latestAttempt, ws);

                    return (
                        <MobileHistoryItem 
                            key={ws.id} 
                            worksheet={ws} 
                            attempt={latestAttempt} 
                            metrics={metrics}
                        />
                    );
                })}
            </div>

            {/* --- DESKTOP CARD VIEW --- */}
            <div className="hidden md:grid gap-4">
                {orderedWorksheets.map(ws => {
                    const latestAttempt = attemptsByWorksheet.get(ws.id)?.[0];
                    return (
                        <WorksheetDisplayCard
                            key={ws.id}
                            worksheet={ws}
                            view="list"
                            attempt={latestAttempt}
                            from="progress"
                            studentId={student.id}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function MobileHistoryItem({ 
    worksheet, 
    attempt, 
    metrics 
}: { 
    worksheet: Worksheet, 
    attempt: WorksheetAttempt, 
    metrics: { percentage: number, score: number, total: number, isPassed: boolean }
}) {
    const [isOpen, setIsOpen] = useState(false);
    const { percentage, isPassed, score, total } = metrics;
    const bgClass = isPassed ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    
    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <div className="flex items-center gap-4 p-4 active:bg-slate-50 dark:active:bg-slate-900 transition-colors cursor-pointer w-full">
                    <div className={cn("flex flex-col items-center justify-center h-12 w-12 rounded-xl shrink-0 font-bold text-sm", bgClass)}>
                        <span>{percentage}%</span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <h4 className="font-semibold text-sm truncate pr-2 text-slate-900 dark:text-slate-100">
                            {worksheet.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {attempt.attemptedAt ? formatDistanceToNow(attempt.attemptedAt.toDate(), { addSuffix: true }) : 'Unknown date'}
                            <span>•</span>
                            <span className={isPassed ? "text-green-600" : "text-red-500"}>
                                {isPassed ? "Passed" : "Needs Review"}
                            </span>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 shrink-0" />
                </div>
            </SheetTrigger>

            <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-10">
                <SheetHeader className="text-left mb-6">
                    <SheetTitle className="text-xl">{worksheet.title}</SheetTitle>
                    <SheetDescription>
                        Completed on {attempt.attemptedAt?.toDate().toLocaleDateString()} at {attempt.attemptedAt?.toDate().toLocaleTimeString()}
                    </SheetDescription>
                </SheetHeader>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-1">Score</div>
                        <div className={cn("text-2xl font-black", isPassed ? "text-green-600" : "text-red-500")}>
                            {percentage}% <span className="text-sm font-medium text-muted-foreground ml-1">({Math.round(score)}/{total})</span>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-1">Status</div>
                        <div className="flex items-center gap-2 font-medium">
                            {isPassed ? <CheckCircle2 className="h-5 w-5 text-green-500"/> : <AlertCircle className="h-5 w-5 text-red-500"/>}
                            {isPassed ? "Passed" : "Review Needed"}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {/* ✅ FIX: Simplified button structure to match desktop functionality exactly */}
                    <Button asChild className="w-full h-12 text-base rounded-xl font-semibold shadow-lg shadow-blue-500/20" size="lg">
                        <Link href={`/analytics/worksheet/${attempt.id}`}>
                            <FileText className="mr-2 h-5 w-5" /> View Detailed Report
                        </Link>
                    </Button>
                </div>
                {/* Close and Retake buttons removed as requested */}
            </SheetContent>
        </Sheet>
    );
}