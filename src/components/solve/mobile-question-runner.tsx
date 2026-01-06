'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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

type SubQuestionWithStepInfo = SubQuestion & {
    stepTitle: string;
    stepId: string;
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
  
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  const [activeSubIndex, setActiveSubIndex] = useState(0);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Flatten subquestions with step info
  const subQuestions: SubQuestionWithStepInfo[] = useMemo(() => {
      return question.solutionSteps.flatMap(step => 
          step.subQuestions.map(subQ => ({
              ...subQ,
              stepId: step.id,
              stepTitle: step.title,
          }))
      );
  }, [question.solutionSteps]);

  // Group completed subquestions by step
  const completedSteps = useMemo(() => {
      const completed = subQuestions.slice(0, activeSubIndex);
      const groups: { [stepId: string]: { title: string, subQs: SubQuestionWithStepInfo[] } } = {};
      
      completed.forEach(subQ => {
          if (!groups[subQ.stepId]) {
              groups[subQ.stepId] = { title: subQ.stepTitle, subQs: [] };
          }
          groups[subQ.stepId].subQs.push(subQ);
      });
      
      return Object.values(groups);
  }, [subQuestions, activeSubIndex]);

  useEffect(() => {
    setActiveSubIndex(0);
    loadAnswerForIndex(0);
  }, [question.id]);

  useEffect(() => {
    loadAnswerForIndex(activeSubIndex);
    setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [activeSubIndex]);

  const loadAnswerForIndex = (index: number) => {
      const subQ = subQuestions[index];
      if (subQ) {
          const saved = initialAnswers[subQ.id]?.answer;
          setCurrentAnswer(saved !== undefined ? saved : null);
      }
  };

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const handleNextStep = () => {
    const activeSubQuestion = subQuestions[activeSubIndex];
    if (!activeSubQuestion) return;

    onAnswerSubmit(activeSubQuestion.id, currentAnswer);
    onResultCalculated(activeSubQuestion.id, true);

    if (activeSubIndex < subQuestions.length - 1) {
        setActiveSubIndex(prev => prev + 1);
    } else {
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

  const renderCompletedSubQuestion = (subQ: SubQuestionWithStepInfo, index: number) => {
      const answer = initialAnswers[subQ.id]?.answer;
      let displayAnswer = answer;

      if (subQ.answerType === 'mcq') {
          // ✅ FIX: Safely access options with fallback
          const options = subQ.mcqAnswer?.options || [];
          
          if (Array.isArray(answer)) {
              displayAnswer = options
                  .filter((o: any) => answer.includes(o.id))
                  .map((o: any) => o.text).join(', ');
          } else {
              const opt = options.find((o: any) => o.id === answer);
              displayAnswer = opt ? opt.text : answer;
          }
      }

      return (
          <div key={subQ.id} className="bg-white border border-slate-100 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                 <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                 </span>
                 <div 
                     className="text-sm text-slate-700"
                     dangerouslySetInnerHTML={{ __html: processedHtml(subQ.questionText) }} 
                 />
              </div>
              <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-md text-sm font-medium text-slate-900 ml-7">
                  {displayAnswer || <span className="text-slate-400 italic">No answer provided</span>}
              </div>
          </div>
      );
  };

  const activeSubQuestion = subQuestions[activeSubIndex];
  // Calculate the index within the current step
  const currentStepStartIndex = subQuestions.findIndex(sq => sq.stepId === activeSubQuestion?.stepId);
  const indexInStep = activeSubIndex - currentStepStartIndex;

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
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-red-600 font-bold hover:bg-red-50"
                    onClick={handleEarlyFinish}
                >
                    Finish
                </Button>
            </div>
        </div>

        {/* --- 2. PROGRESS BAR --- */}
        <div className="h-1 bg-slate-100 w-full shrink-0 relative z-10">
            <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* --- 3. SCROLLABLE CONTENT AREA --- */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-8 overscroll-contain scroll-smooth" ref={scrollContainerRef}>
            
            {/* Main Question Text */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Main Problem</div>
                <div 
                    className="prose prose-slate prose-sm max-w-none text-slate-800 break-words whitespace-normal leading-relaxed select-text"
                    dangerouslySetInnerHTML={{ __html: processedHtml(question.mainQuestionText) }} 
                />
            </div>

            {/* History of Completed Steps */}
            <div className="space-y-4">
                {completedSteps.map((step, stepIdx) => (
                    <div key={stepIdx} className="bg-white border border-indigo-50 rounded-xl p-4 shadow-sm">
                        <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {step.title}
                        </h3>
                        <div className="space-y-3 pl-2 border-l-2 border-indigo-100 ml-2">
                            {step.subQs.map((subQ, subIdx) => renderCompletedSubQuestion(subQ, subIdx))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Active Step Input Area */}
            {activeSubQuestion && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-5 rounded-2xl shadow-md border border-indigo-100 ring-4 ring-indigo-50/50">
                        
                        <h3 className="text-base font-bold text-indigo-900 mb-4 flex items-center gap-2">
                           <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                             {indexInStep + 1}
                           </span>
                           {activeSubQuestion.stepTitle}
                        </h3>
                        
                        <div 
                            className="prose prose-slate prose-sm max-w-none text-slate-800 mb-6 ml-8"
                            dangerouslySetInnerHTML={{ __html: processedHtml(activeSubQuestion.questionText) }} 
                        />

                        {/* Input Controls */}
                        <div className="ml-8">
                            {activeSubQuestion.answerType === 'mcq' ? (
                                <div className="space-y-3">
                                    {activeSubQuestion.mcqAnswer?.options.map((opt: any) => {
                                        const isMulti = activeSubQuestion.mcqAnswer?.isMultiCorrect;
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
                                        type="text"
                                        placeholder="Type your answer..."
                                        value={currentAnswer || ''}
                                        onChange={(e) => setCurrentAnswer(e.target.value)}
                                        className="border-none shadow-none text-lg h-14 px-3 w-full bg-transparent"
                                        autoComplete="off"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <Button 
                        size="lg" 
                        className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 active:scale-[0.98] transition-transform rounded-xl"
                        onClick={handleNextStep}
                        disabled={currentAnswer === null || currentAnswer === '' || (Array.isArray(currentAnswer) && currentAnswer.length === 0)}
                    >
                        {activeSubIndex < subQuestions.length - 1 ? (
                            <>Next Step <ArrowRight className="ml-2 h-5 w-5" /></>
                        ) : isLastQuestion ? (
                            <>Finish Workbook <CheckCircle className="ml-2 h-5 w-5" /></>
                        ) : (
                            <>Next Question <ArrowRight className="ml-2 h-5 w-5" /></>
                        )}
                    </Button>

                    <div ref={bottomRef} className="h-4" />
                </div>
            )}
        </div>
    </div>
  );
}