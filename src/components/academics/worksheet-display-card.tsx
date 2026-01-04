'use client';

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileQuestion, Trophy, Clock, ArrowRight, CheckCircle2, PlayCircle, Sparkles, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Worksheet, WorksheetAttempt } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface WorksheetDisplayCardProps {
    worksheet: Worksheet;
    isPractice?: boolean;
    completedAttempts?: string[];
    attempt?: WorksheetAttempt; // For history view
    view?: 'card' | 'list';
    from?: string;
    studentId?: string;
}

export function WorksheetDisplayCard({ 
    worksheet, 
    isPractice = false, 
    completedAttempts = [], 
    attempt,
    view = 'card',
    from,
    studentId,
}: WorksheetDisplayCardProps) {
    const router = useRouter();
    const isCompleted = completedAttempts.includes(worksheet.id) || !!attempt;
    const questionCount = worksheet.questions?.length || 0;
    
    // Placeholder for total marks logic
    const totalMarks = questionCount * 10; 

    const handleStart = () => {
        router.push(`/solve/${worksheet.id}`); 
    };

    const handleReview = () => {
        const reviewUrl = `/worksheets/review/${attempt?.id}`;
        const queryParams = new URLSearchParams();
        if (from) queryParams.set('from', from);
        if (studentId) queryParams.set('studentId', studentId);

        const finalUrl = `${reviewUrl}?${queryParams.toString()}`;
        router.push(finalUrl);
    };

    // --- LIST VIEW (For History) ---
    if (view === 'list') {
        return (
            <div className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center",
                        isCompleted ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                    )}>
                        {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <FileQuestion className="h-6 w-6" />}
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">{worksheet.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><FileQuestion className="h-3 w-3" /> {questionCount} Qs</span>
                            
                            {/* Score display removed to fix TS Error. 
                                To re-enable, we need to fetch Questions to calculate score 
                                or add a 'score' field to the WorksheetAttempt type. 
                            */}
                            
                            <span className="flex items-center gap-1 text-xs opacity-70">
                                <CalendarDays className="h-3 w-3" />
                                {attempt?.attemptedAt ? format(attempt.attemptedAt.toDate(), 'PP p') : 'Unknown Date'}
                            </span>
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleReview} className="h-10 w-10 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-full">
                    <PlayCircle className="h-6 w-6" />
                </Button>
            </div>
        );
    }

    // --- CARD VIEW (Standard) ---
    return (
        <Card className="group relative overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-slate-900 flex flex-col h-full">
            {/* Type Badge & Header Color */}
            <div className={cn(
                "absolute top-0 inset-x-0 h-1.5",
                isPractice ? "bg-gradient-to-r from-purple-400 to-pink-500" : "bg-gradient-to-r from-blue-400 to-indigo-500"
            )} />

            <CardHeader className="pt-6 pb-2">
                <div className="flex justify-between items-start mb-3">
                    <Badge variant="outline" className={cn(
                        "font-medium border-0 px-2 py-0.5",
                        isPractice 
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 ring-1 ring-purple-200 dark:ring-purple-800"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800"
                    )}>
                        {isPractice ? 'Practice Zone' : 'Classroom'}
                    </Badge>
                    {isCompleted && (
                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-full">
                            <CheckCircle2 className="h-3 w-3" /> Done
                        </div>
                    )}
                </div>
                <h3 className="font-bold text-lg leading-tight line-clamp-2 min-h-[3rem]">
                    {worksheet.title}
                </h3>
            </CardHeader>

            <CardContent className="flex-1">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <FileQuestion className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold">{questionCount}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">Questions</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold">{totalMarks}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">Total Marks</span>
                        </div>
                    </div>
                </div>
                
                {/* Reward hint */}
                {!isCompleted && (
                    <div className="flex items-center gap-1.5 mt-4 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Earn {questionCount * 5} XP</span>
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-2 pb-6">
                <Button 
                    className={cn(
                        "w-full font-semibold shadow-lg transition-all group/btn",
                        isCompleted 
                            ? "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-white" 
                            : isPractice 
                                ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-purple-500/20"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20"
                    )}
                    onClick={isCompleted ? handleReview : handleStart}
                >
                    {isCompleted ? 'Review Results' : 'Start Assignment'}
                    {!isCompleted && <PlayCircle className="ml-2 h-4 w-4 group-hover/btn:scale-110 transition-transform" />}
                </Button>
            </CardFooter>
        </Card>
    );
}
