'use client';

import { useState, useEffect } from 'react';
import type { Question, SubQuestion } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Clock, CheckCircle, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

// --- Types ---
type AnswerState = {
  [subQuestionId: string]: {
    answer: any;
  };
};

interface MobileQuestionRunnerProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  timeLeft: number;
  onAnswerSubmit: (subQuestionId: string, answer: any) => void;
  onResultCalculated: (subQuestionId: string, isCorrect: boolean) => void;
  onNext: () => void;
  onPrevious: () => void;
  onFinish: () => void;
  isLastQuestion: boolean;
  initialAnswers: AnswerState;
}

// --- HELPER: Format Time ---
function formatTime(seconds: number) {
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// --- HELPER: Process HTML ---
const processedHtml = (html: string) => html ? html.replace(/&nbsp;/g, ' ') : '';

export function MobileQuestionRunner({
  question,
  currentIndex,
  totalQuestions,
  timeLeft,
  onAnswerSubmit,
  onResultCalculated,
  onNext,
  onPrevious,
  onFinish,
  isLastQuestion,
  initialAnswers
}: MobileQuestionRunnerProps) {
  
  // Local state for the CURRENT question being answered
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  
  // Flatten subquestions to handle them one by one or all together
  // For simplicity in this mobile view, we assume the user answers the visible subquestion
  // NOTE: This logic mimics the main runner but simplified for mobile touch
  const subQuestions = question.solutionSteps.flatMap(s => s.subQuestions);
  
  // We track which sub-question within the main question we are on (if multiple)
  const [activeSubIndex, setActiveSubIndex] = useState(0);
  const activeSubQuestion = subQuestions[activeSubIndex];

  // Reset when question changes
  useEffect(() => {
    setActiveSubIndex(0);
    setCurrentAnswer(initialAnswers[subQuestions[0]?.id]?.answer || null);
  }, [question.id, initialAnswers, subQuestions]);

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  // --- SUBMIT HANDLER ---
  const handleSubmitStep = () => {
    if (!activeSubQuestion) return;

    // 1. Submit Answer
    onAnswerSubmit(activeSubQuestion.id, currentAnswer);
    
    // 2. Mock Result Calculation (You should import your actual util here if needed)
    // For now passing true to allow flow, actual validation happens in parent context usually
    onResultCalculated(activeSubQuestion.id, true);

    // 3. Move to next sub-question OR next main question
    if (activeSubIndex < subQuestions.length - 1) {
        const nextIndex = activeSubIndex + 1;
        setActiveSubIndex(nextIndex);
        setCurrentAnswer(initialAnswers[subQuestions[nextIndex]?.id]?.answer || null);
    } else {
        if (isLastQuestion) {
            onFinish();
        } else {
            onNext();
        }
    }
  };

  if (!activeSubQuestion) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-[100dvh] overflow-hidden">
        
        {/* --- 1. TOP BAR (Fixed) --- */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b shadow-sm shrink-0">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={onPrevious} disabled={currentIndex === 0 && activeSubIndex === 0}>
                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                </Button>
                <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        Question {currentIndex + 1} <span className="text-slate-300">/</span> {totalQuestions}
                    </p>
                </div>
            </div>
            <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border", timeLeft < 60 ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-100 text-slate-600 border-slate-200")}>
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTime(timeLeft)}</span>
            </div>
        </div>

        {/* --- 2. PROGRESS BAR --- */}
        <div className="h-1 bg-slate-100 w-full shrink-0">
            <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* --- 3. SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Question Text */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div 
                    className="prose prose-slate prose-sm max-w-none text-slate-800 break-words whitespace-normal leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: processedHtml(activeSubQuestion.questionText) }} 
                />
            </div>

            {/* Answer Input Area */}
            <div className="space-y-4 pb-20">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-1">Your Answer</h3>
                
                {/* DYNAMIC INPUTS BASED ON TYPE */}
                {activeSubQuestion.answerType === 'mcq' && (
                    <div className="space-y-3">
                        {activeSubQuestion.mcqAnswer?.options.map((opt) => {
                            const isSelected = activeSubQuestion.mcqAnswer?.isMultiCorrect 
                                ? (currentAnswer as string[] || []).includes(opt.id)
                                : currentAnswer === opt.id;

                            return (
                                <div 
                                    key={opt.id}
                                    onClick={() => {
                                        if (activeSubQuestion.mcqAnswer?.isMultiCorrect) {
                                            const curr = (currentAnswer as string[] || []);
                                            const newVal = isSelected ? curr.filter(id => id !== opt.id) : [...curr, opt.id];
                                            setCurrentAnswer(newVal);
                                        } else {
                                            setCurrentAnswer(opt.id);
                                        }
                                    }}
                                    className={cn(
                                        "relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all active:scale-[0.98]",
                                        isSelected 
                                            ? "border-indigo-600 bg-indigo-50/50 shadow-sm z-10" 
                                            : "border-slate-200 bg-white hover:border-slate-300"
                                    )}
                                >
                                    <div className={cn(
                                        "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                        isSelected ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                                    )}>
                                        {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                                    </div>
                                    <span className={cn("text-base font-medium leading-snug break-words w-full", isSelected ? "text-indigo-900" : "text-slate-700")}>
                                        {opt.text}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                )}

                {(activeSubQuestion.answerType === 'numerical' || activeSubQuestion.answerType === 'text') && (
                    <div className="bg-white p-2 rounded-xl border border-indigo-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                        <Input 
                            type={activeSubQuestion.answerType === 'numerical' ? 'number' : 'text'}
                            inputMode={activeSubQuestion.answerType === 'numerical' ? 'decimal' : 'text'}
                            placeholder="Type your answer..."
                            value={currentAnswer ?? ''}
                            onChange={(e) => setCurrentAnswer(e.target.value)}
                            className="border-none shadow-none text-lg h-12 px-3"
                        />
                    </div>
                )}
            </div>
        </div>

        {/* --- 4. BOTTOM ACTION BAR (Sticky) --- */}
        <div className="p-4 bg-white border-t shrink-0 safe-area-pb">
            <Button 
                size="lg" 
                className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 active:scale-[0.98] transition-transform rounded-xl"
                onClick={handleSubmitStep}
            >
                {activeSubIndex < subQuestions.length - 1 ? (
                    <>Next Step <ArrowRight className="ml-2 h-5 w-5" /></>
                ) : isLastQuestion ? (
                    <>Finish Quiz <CheckCircle className="ml-2 h-5 w-5" /></>
                ) : (
                    <>Next Question <ArrowRight className="ml-2 h-5 w-5" /></>
                )}
            </Button>
        </div>
    </div>
  );
}
