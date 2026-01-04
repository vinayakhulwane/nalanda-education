'use client';

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, documentId } from "firebase/firestore";
// ✅ FIXED IMPORTS: Using '@/' alias instead of relative paths
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BookOpen, 
  Clock, 
  FileQuestion, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Worksheet, Question } from "@/types";

interface WorksheetDisplayCardProps {
  worksheet: Worksheet;
  isPractice?: boolean;
  completedAttempts?: string[];
}

export function WorksheetDisplayCard({ 
  worksheet, 
  isPractice = false, 
  completedAttempts = [] 
}: WorksheetDisplayCardProps) {
  const router = useRouter();
  const firestore = useFirestore();

  // 1. Fetch Questions to calculate stats (Marks, Time)
  const questionsQuery = useMemoFirebase(() => {
    if (!firestore || !worksheet.questions || worksheet.questions.length === 0) return null;
    // Note: Firestore 'in' query is limited to 30 items.
    return query(
      collection(firestore, 'questions'), 
      where(documentId(), 'in', worksheet.questions.slice(0, 30))
    );
  }, [firestore, worksheet.questions]);

  const { data: questions, isLoading } = useCollection<Question>(questionsQuery);

  // 2. Calculate Dynamic Stats
  const { estimatedTime, rewardXP } = useMemo(() => {
    if (!questions) return { estimatedTime: 5, rewardXP: 50 };

    let totalMarks = 0;
    questions.forEach(q => {
      const qMarks = q.solutionSteps?.reduce((stepSum, step) => 
        stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
      totalMarks += qMarks;
    });

    // Estimate: 0.5 mins per mark
    const time = Math.ceil(totalMarks * 0.5) || 5; 
    
    // Reward: 10 XP per question (Customizable logic)
    const xp = questions.length * 10;

    return { estimatedTime: time, rewardXP: xp };
  }, [questions]);

  const isCompleted = isPractice ? completedAttempts.includes(worksheet.id) : false;
  const questionCount = worksheet.questions?.length || 0;

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/solve/${worksheet.id}`);
  };

  if (isLoading) {
    return <Skeleton className="h-[180px] w-full rounded-3xl" />;
  }

  return (
    <Card 
      onClick={handleStart}
      className={cn(
        "group relative overflow-hidden border-none shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer",
        "bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl"
      )}
    >
      <div className="p-5 flex flex-col gap-5">
        
        {/* --- TOP SECTION: Icon + Title --- */}
        <div className="flex items-start gap-4">
          {/* Pink Icon Box */}
          <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
            "bg-pink-50 text-pink-500 dark:bg-pink-900/20 dark:text-pink-400"
          )}>
            <BookOpen className="h-7 w-7 stroke-[2.5]" />
          </div>

          {/* Title Text */}
          <div className="flex-1 min-w-0 py-0.5">
            <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 leading-tight mb-1 truncate">
              {worksheet.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {isPractice ? "Practice Worksheet" : "Classroom Assignment"}
            </p>
          </div>
        </div>

        {/* --- DIVIDER --- */}
        <div className="h-px w-full bg-slate-100 dark:bg-slate-800" />

        {/* --- STATS ROW --- */}
        <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <FileQuestion className="h-4 w-4 text-pink-500" />
            <span className="font-bold">{questionCount} Qs</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-pink-500" />
            <span className="font-bold">~{estimatedTime} min</span>
          </div>
        </div>

        {/* --- BOTTOM SECTION: Reward + Action --- */}
        <div className="flex items-center justify-between pt-1">
          
          {/* Left: Reward or Status */}
          <div className="flex items-center">
            {isCompleted ? (
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-full dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Done</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-pink-600 font-bold text-sm animate-pulse">
                {/* Use 'fill-pink-600' to make the sparkles solid pink */}
                <Sparkles className="h-4 w-4 fill-pink-600" />
                <span>Win {rewardXP} XP</span>
              </div>
            )}
          </div>

          {/* Right: Pink Gradient Button */}
          <Button 
            onClick={handleStart}
            size="sm"
            className={cn(
              "rounded-full pl-5 pr-4 font-bold shadow-md transition-all active:scale-95 h-10",
              isCompleted 
                ? "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                : "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-pink-500/25 border-0"
            )}
          >
            {isCompleted ? "Review" : "Start Solving"}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>

      </div>
    </Card>
  );
}