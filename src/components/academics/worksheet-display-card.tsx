'use client';

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileQuestion, Trophy, Clock, ArrowRight, CheckCircle2, PlayCircle, Sparkles, CalendarDays, BookOpen } from "lucide-react";
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
    
    // Total marks logic - use 10 marks per question as an estimate for time
    const totalMarks = questionCount * 10; 
    const estimatedTime = Math.ceil(totalMarks * 0.5); // Estimate 30 seconds per mark

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

    // --- LIST VIEW (For Mobile & History) ---
    if (view === 'list') {
        const actionHandler = isCompleted ? handleReview : handleStart;
        
        return (
             <div className="group flex flex-col gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border hover:border-primary/20 transition-all shadow-sm hover:shadow-md cursor-pointer" onClick={actionHandler}>
                {/* Top Section: Icon & Title */}
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">{worksheet.title}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{worksheet.worksheetType} Assignment</p>
                    </div>
                </div>

                {/* Divider */}
                <hr className="border-slate-100 dark:border-slate-800" />

                {/* Middle Section: Stats */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <FileQuestion className="h-4 w-4" />
                        <span className="font-medium">{questionCount} Qs</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">~{estimatedTime} min</span>
                    </div>
                </div>

                {/* Bottom Section: Status & Button */}
                <div className="flex items-center justify-between">
                    {isCompleted ? (
                        <div className="flex items-center gap-2 font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                             <CheckCircle2 className="h-4 w-4" />
                             Completed
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 font-semibold text-sm text-slate-500">
                            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                            Not Started
                        </div>
                    )}
                    
                    <Button
                        size="sm"
                        className="font-semibold"
                        onClick={(e) => { e.stopPropagation(); actionHandler(); }}
                    >
                        {isCompleted ? 'View Results' : 'Start Solving'}
                        <ArrowRight className="ml-1.5 h-4 w-4"/>
                    </Button>
                </div>
            </div>
        );
    }

    // --- CARD VIEW (Standard for Desktop) ---
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
