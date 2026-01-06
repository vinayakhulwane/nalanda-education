'use client';

import { useState, useEffect, useRef } from 'react';
import type { Question, SubQuestion } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Clock, CheckCircle, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  
  // Local state for the CURRENT sub-question being answered
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  
  // We flatten all steps/sub-questions into a linear array for easier navigation
  const subQuestions = question.solutionSteps.flatMap(s => s.subQuestions);
  
  // Track which sub-question we are currently acting on
  const [activeSubIndex, setActiveSubIndex] = useState(0);
  
  // Ref for auto-scrolling to the new step
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reset state when the Main Question changes (e.g. clicking Next Question)
  useEffect(() => {
    setActiveSubIndex(0);
    loadAnswerForIndex(0);
  }, [question.id]);

  // Load answer when active index changes
  useEffect(() => {
    loadAnswerForIndex(activeSubIndex);
    // Auto-scroll to bottom when moving to a new step
    setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [activeSubIndex]);

  const loadAnswerForIndex = (index: number) => {
      const subQ = subQuestions[index];
      if (subQ) {
          const saved = initialAnswers[subQ.id]?.answer;
          setCurrentAnswer(saved !== undefined ? saved : '');
      }
  };

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  // --- HANDLERS ---

  const handleNextStep = () => {
    const activeSubQuestion = subQuestions[activeSubIndex];
    if (!activeSubQuestion) return;

    // 1. Submit current answer
    onAnswerSubmit(activeSubQuestion.id, currentAnswer);
    onResultCalculated(activeSubQuestion.id, true); // Mock validation

    // 2. Determine Next Move
    if (activeSubIndex < subQuestions.length - 1) {
        // Stay on this Main Question, just reveal the next step
        setActiveSubIndex(prev => prev + 1);
    } else {
        // Finished all steps for this question
        if (isLastQuestion) {
            onFinish();
        } else {
            onNext();
        }
    }
  };

  const handleEarlyFinish = () => {
      if (confirm("Are you sure you want to submit the worksheet now?")) {
          onFinish();
      }
  };

  // --- RENDER HELPERS ---

  // Renders a "Locked" previously answered step
  const renderCompletedStep = (subQ: any, index: number) => {
      const answer = initialAnswers[subQ.id]?.answer;
      let displayAnswer = answer;

      // Format MCQ answer for display
      if (subQ.answerType === 'mcq') {
          if (Array.isArray(answer)) {
              displayAnswer = subQ.mcqAnswer.options
                  .filter((o: any) => answer.includes(o.id))
                  .map((o: any) => o.text).join(', ');
          } else {
              const opt = subQ.mcqAnswer.options.find((o: any) => o.id === answer);
              displayAnswer = opt ? opt.text : answer;
          }
      }

      return (
          <div key={subQ.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 opacity-80">
              <div className="flex items-center gap-2 mb-2">
                  <div className="bg-green-100 text-green-700 p-1 rounded-full">
                      <Check className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Step {index + 1} Completed</span>
              </div>
              <div 
                  className="text-sm text-slate-700 mb-2"
                  dangerouslySetInnerHTML={{ __html: processedHtml(subQ.questionText) }} 
              />
              <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium text-slate-900">
                  {displayAnswer || <span className="text-slate-400 italic">No answer provided</span>}
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col h-[100dvh]">
        
        {/* --- 1. TOP BAR --- */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b shadow-sm shrink-0 z-20">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={onPrevious} disabled={currentIndex === 0 && activeSubIndex === 0}>
                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                </Button>
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    Q{currentIndex + 1} <span className="text-slate-300">/</span> {totalQuestions}
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border", timeLeft < 60 ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-100 text-slate-600 border-slate-200")}>
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatTime(timeLeft)}</span>
                </div>
                {/* Submit Button - Now explicitly wired to onFinish */}
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-indigo-600 font-bold hover:bg-indigo-50"
                    onClick={() => onFinish()}
                >
                    Submit
                </Button>
            </div>
        </div>

        {/* --- 2. PROGRESS BAR --- */}
        <div className="h-1 bg-slate-100 w-full shrink-0 relative z-10">
            <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* --- 3. SCROLLABLE CONTENT AREA --- */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40 overscroll-contain scroll-smooth" ref={scrollContainerRef}>
            
            {/* Main Question Text (Always Visible at Top) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Main Problem</div>
                <div 
                    className="prose prose-slate prose-sm max-w-none text-slate-800 break-words whitespace-normal leading-relaxed select-text"
                    dangerouslySetInnerHTML={{ __html: processedHtml(question.mainQuestionText) }} 
                />
            </div>

            {/* History of Completed Steps */}
            <div className="space-y-4">
                {subQuestions.slice(0, activeSubIndex).map((subQ, idx) => renderCompletedStep(subQ, idx))}
            </div>

            {/* Active Step Input Area */}
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                        Current Step {activeSubIndex + 1}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                        {subQuestions[activeSubIndex]?.marks || 1} Mark
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-md border border-indigo-100 ring-4 ring-indigo-50/50">
                    <div 
                        className="prose prose-slate prose-sm max-w-none text-slate-800 mb-6"
                        dangerouslySetInnerHTML={{ __html: processedHtml(subQuestions[activeSubIndex]?.questionText || '') }} 
                    />

                    {/* Input Controls */}
                    {subQuestions[activeSubIndex]?.answerType === 'mcq' ? (
                        <div className="space-y-3">
                            {subQuestions[activeSubIndex].mcqAnswer?.options.map((opt: any) => {
                                const isMulti = subQuestions[activeSubIndex].mcqAnswer?.isMultiCorrect;
                                let isSelected = false;
                                if (isMulti) {
                                    isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(opt.id);
                                } else {
                                    isSelected = currentAnswer === opt.id;
                                }

                                return (
                                    <div 
                                        key={opt.id}
                                        onClick={() => {
                                            if (isMulti) {
                                                const curr = Array.isArray(currentAnswer) ? currentAnswer : [];
                                                const newVal = isSelected 
                                                    ? curr.filter((id: string) => id !== opt.id) 
                                                    : [...curr, opt.id];
                                                setCurrentAnswer(newVal);
                                            } else {
                                                setCurrentAnswer(opt.id);
                                            }
                                        }}
                                        className={cn(
                                            "relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all active:scale-[0.98] cursor-pointer touch-manipulation",
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
                                        <span className={cn("text-base font-medium leading-snug w-full select-none", isSelected ? "text-indigo-900" : "text-slate-700")}>
                                            {opt.text}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-2 rounded-xl border border-indigo-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                            <Input 
                                type="text" // Always use text to allow decimals/units unless strictly constrained
                                placeholder="Type your answer..."
                                value={currentAnswer || ''}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                className="border-none shadow-none text-lg h-14 px-3 w-full bg-transparent"
                                autoComplete="off"
                            />
                        </div>
                    )}
                </div>
                {/* Dummy div to scroll into view */}
                <div ref={bottomRef} className="h-4" />
            </div>
        </div>

        {/* --- 4. BOTTOM ACTION BAR --- */}
        <div className="p-4 pb-8 bg-white border-t border-slate-100 shrink-0 z-30 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
            <Button 
                size="lg" 
                className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 active:scale-[0.98] transition-transform rounded-xl"
                onClick={handleNextStep}
            >
                {activeSubIndex < subQuestions.length - 1 ? (
                    <>Next Step <ArrowRight className="ml-2 h-5 w-5" /></>
                ) : isLastQuestion ? (
                    <>Finish Workbook <CheckCircle className="ml-2 h-5 w-5" /></>
                ) : (
                    <>Next Question <ArrowRight className="ml-2 h-5 w-5" /></>
                )}
            </Button>
        </div>
    </div>
  );
}