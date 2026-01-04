'use client';

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileQuestion, Trophy, Clock, ArrowRight, CheckCircle2, PlayCircle, Sparkles, CalendarDays, BookOpen, Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Worksheet, WorksheetAttempt } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface WorksheetDisplayCardProps {
    worksheet: Worksheet;
    isPractice?: boolean;
    // This will now be an array of all attempts for this specific worksheet
    attempts?: WorksheetAttempt[];
    view?: 'card' | 'list';
    from?: string;
    studentId?: string;
}

export function WorksheetDisplayCard({
    worksheet,
    isPractice = false,
    attempts = [],
    view = 'card',
    from,
    studentId,
}: WorksheetDisplayCardProps) {
    const router = useRouter();

    const latestAttempt = attempts.length > 0 ? attempts[0] : undefined;
    const isCompletedOrAttempted = attempts.length > 0;
    const questionCount = worksheet.questions?.length || 0;

    const totalMarks = questionCount * 10;
    const estimatedTime = Math.ceil(totalMarks * 0.5);

    const handleStart = () => {
        router.push(`/solve/${worksheet.id}`);
    };

    const handleReview = () => {
        if (!latestAttempt) return; // Should not happen if button is shown
        const reviewUrl = `/worksheets/review/${latestAttempt.id}`;
        const queryParams = new URLSearchParams();
        if (from) queryParams.set('from', from);
        if (studentId) queryParams.set('studentId', studentId);

        const finalUrl = `${reviewUrl}?${queryParams.toString()}`;
        router.push(finalUrl);
    };

    // --- MOBILE / LIST VIEW ---
    if (view === 'list') {
        const actionHandler = isCompletedOrAttempted ? handleReview : handleStart;
        const rewardXP = questionCount * 5;

        return (
            <div 
                className={cn(
                    "group flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border transition-all shadow-sm active:scale-[0.98]",
                    isPractice ? "border-pink-100 dark:border-pink-900/20" : "border-slate-200 dark:border-slate-800"
                )} 
                onClick={actionHandler}
            >
                {/* Header Section */}
                <div className="flex items-start gap-4">
                    <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                        isPractice 
                            ? "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" 
                            : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                    )}>
                        <BookOpen className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                        <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate leading-tight">
                            {worksheet.title}
                        </h4>
                        <p className="text-xs text-muted-foreground capitalize mt-1">
                            {isPractice ? 'Practice Test' : 'Classroom Assignment'}
                        </p>
                    </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* Stats Row */}
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                        <FileQuestion className="h-3.5 w-3.5" />
                        <span>{questionCount} Qs</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                        <Clock className="h-3.5 w-3.5" />
                        <span>~{estimatedTime} min</span>
                    </div>
                </div>

                {/* Footer Action Row */}
                <div className="flex items-center justify-between pt-1">
                    {/* Left Side: Reward or Attempt Status */}
                    <div className="flex items-center">
                        {isCompletedOrAttempted ? (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                                <Repeat className="h-3.5 w-3.5" />
                                <span>Tried {attempts.length}x</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-500 animate-pulse">
                                <Sparkles className="h-3.5 w-3.5 fill-amber-600 dark:fill-amber-500" />
                                <span>Win {rewardXP} XP</span>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Action Button */}
                    <Button 
                        size="sm" 
                        className={cn(
                            "h-9 px-4 rounded-full font-bold text-xs shadow-sm transition-all",
                            isPractice 
                                ? "bg-pink-600 hover:bg-pink-700 text-white" 
                                : "bg-primary hover:bg-primary/90 text-primary-foreground"
                        )}
                        onClick={(e) => { e.stopPropagation(); actionHandler(); }}
                    >
                        {isCompletedOrAttempted ? 'Review' : 'Start Solving'}
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        );
    }

    // --- CARD VIEW (Standard for Desktop - UNCHANGED) ---
    return (
        <Card className="group relative overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-slate-900 flex flex-col h-full">
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
                    {isCompletedOrAttempted && (
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
                
                {!isCompletedOrAttempted && (
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
                        isCompletedOrAttempted 
                            ? "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-white" 
                            : isPractice 
                                ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-purple-500/20" 
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20"
                    )}
                    onClick={isCompletedOrAttempted ? handleReview : handleStart}
                >
                    {isCompletedOrAttempted ? 'Review Results' : 'Start Assignment'}
                    {!isCompletedOrAttempted && <PlayCircle className="ml-2 h-4 w-4 group-hover/btn:scale-110 transition-transform" />}
                </Button>
            </CardFooter>
        </Card>
    );
}
