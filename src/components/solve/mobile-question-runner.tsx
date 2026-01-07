'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Question, SubQuestion, ResultState } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Clock, CheckCircle2, ArrowRight, PlayCircle, SkipForward, Check, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIAnswerUploader } from './ai-answer-uploader';
import ReactMarkdown from 'react-markdown';

// --- Types ---
type AnswerState = {
  [subQuestionId: string]: {
    answer: any;
  };
};

type SubQuestionWithStepInfo = SubQuestion & {
  stepTitle: string;
  stepId: string;
  stepObjective: string;
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
  
  // AI Props
  aiImage: File | null;
  onAiImageSelect: (file: File | null) => void;
  onAiGrade: () => void;
  isAiGrading: boolean;
  results: ResultState;
}

// --- HELPER: Format Time ---
function formatTime(seconds: number) {
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// --- HELPER: Process HTML ---
const processedHtml = (html: string) => html ? html.replace(/&nbsp;/g, ' ') : '';

// --- HELPER: UNIT CONVERSION LOGIC ---
const unitPrefixes: Record<string, number> = {
  'g': 1e9, 'm': 1e6, 'k': 1e3,
  'd': 1e-1, 'c': 1e-2, 'µ': 1e-6, 'u': 1e-6, 'n': 1e-9,
};

function parseUnitAndValue(input: string): { value: number, unit: string } | null {
  if (!input || typeof input !== 'string') return null;
  const trimmedInput = input.trim();
  const match = trimmedInput.match(/^(-?[\d.eE+-]+)\s*(.*)$/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2]?.trim() || '';
  if(isNaN(value)) return null;
  return { value, unit };
}

function convertToBase(value: number, unit: string, baseUnit: string): number {
  let nUnit = unit.toLowerCase().trim();
  let nBase = baseUnit.toLowerCase().trim();
  if (nUnit === '%') nUnit = 'percent';
  if (nBase === '%') nBase = 'percent';
  if (nUnit === '' && (nBase === '' || nBase === 'unitless' || nBase === 'percent')) return value;
  if (nUnit === nBase) return value;
  if (nBase !== '' && nBase !== 'percent' && nUnit.endsWith(nBase)) {
    const prefix = nUnit.replace(nBase, '');
    if (prefix && unitPrefixes[prefix]) return value * unitPrefixes[prefix];
  }
  if (nUnit !== '' && nBase.endsWith(nUnit)) {
    const prefix = nBase.replace(nUnit, '');
    if (prefix && unitPrefixes[prefix]) return value / unitPrefixes[prefix];
  }
  return NaN;
}

// --- HELPER: Validate Answer Correctness ---
const checkIsCorrect = (subQ: SubQuestionWithStepInfo, answer: any): boolean => {
  if (answer === null || answer === undefined || answer === '') return false;
  if (Array.isArray(answer) && answer.length === 0) return false;

  let isCorrect = false;

  switch (subQ.answerType) {
    case 'numerical':
      const parsed = parseUnitAndValue(String(answer)); 
      const { baseUnit, correctValue, toleranceValue } = subQ.numericalAnswer || {};
      
      if (parsed && correctValue !== undefined) {
        const tolerance = (toleranceValue ?? 0) / 100 * correctValue;
        const studentValueInBase = convertToBase(parsed.value, parsed.unit, baseUnit || 'unitless');
        
        if (!isNaN(studentValueInBase)) {
          if (Math.abs(studentValueInBase - correctValue) <= tolerance) {
             return true;
          }
        }
        if (Math.abs(parsed.value - correctValue) <= tolerance) return true;
      }
      break;

    case 'mcq':
      const correctIds = subQ.mcqAnswer?.correctOptions || [];
      
      // FIX: Handle legacy single correctOption safely using 'as any'
      if (correctIds.length === 0) {
         if ((subQ as any).correctAnswer) correctIds.push((subQ as any).correctAnswer);
      }

      if (subQ.mcqAnswer?.isMultiCorrect) {
        if (!Array.isArray(answer)) return false;
        if (answer.length !== correctIds.length) return false;
        isCorrect = answer.every((ansId: any) => correctIds.some(cId => String(cId) === String(ansId)));
      } else {
        isCorrect = correctIds.some(cId => String(cId) === String(answer));
      }
      break;

    case 'text':
      const keywords = subQ.textAnswerKeywords || [];
      if (keywords.length === 0) return true; 
      const studentText = String(answer).toLowerCase();
      isCorrect = keywords.some(k => studentText.includes(k.toLowerCase()));
      break;
  }

  return isCorrect;
};

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
  initialAnswers,
  // AI Props
  aiImage,
  onAiImageSelect,
  onAiGrade,
  isAiGrading,
  results
}: MobileQuestionRunnerProps) {

  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  const [activeSubIndex, setActiveSubIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const subQuestions: SubQuestionWithStepInfo[] = useMemo(() => {
    return question.solutionSteps.flatMap(step =>
      step.subQuestions.map(subQ => ({
        ...subQ,
        stepId: step.id,
        stepTitle: step.title,
        stepObjective: step.stepQuestion,
      }))
    );
  }, [question.solutionSteps]);

  const completedSteps = useMemo(() => {
    const completed = subQuestions.slice(0, activeSubIndex);
    const groups: { [stepId: string]: { title: string, subQs: SubQuestionWithStepInfo[] } } = {};
    completed.forEach(subQ => {
      if (!groups[subQ.stepId]) groups[subQ.stepId] = { title: subQ.stepTitle, subQs: [] };
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
    setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 150);
  }, [activeSubIndex]);

  const loadAnswerForIndex = (index: number) => {
    const subQ = subQuestions[index];
    if (subQ) {
      const saved = initialAnswers[subQ.id]?.answer;
      setCurrentAnswer(saved !== undefined ? saved : null);
    }
  };

  const progressValue = ((currentIndex + 1) / totalQuestions) * 100;

  // --- AI HELPERS ---
  const isAiMode = question.gradingMode === 'ai';
  const isAiGraded = isAiMode && subQuestions.length > 0 && !!results[subQuestions[0].id];
  const aiFeedback = isAiGraded ? results[subQuestions[0].id]?.feedback : null;

  const handleNextStep = () => {
    if (isAiMode) {
        if (!isAiGraded) {
            onAiGrade(); 
        } else {
            if (isLastQuestion) onFinish();
            else onNext();
        }
        return;
    }

    const activeSubQuestion = subQuestions[activeSubIndex];
    if (!activeSubQuestion) return;
    const isCorrect = checkIsCorrect(activeSubQuestion, currentAnswer);
    onAnswerSubmit(activeSubQuestion.id, currentAnswer);
    onResultCalculated(activeSubQuestion.id, isCorrect);

    if (activeSubIndex < subQuestions.length - 1) {
      setActiveSubIndex(prev => prev + 1);
    } else {
      isLastQuestion ? onFinish() : onNext();
    }
  };

  const handleEarlyFinish = () => {
    if (confirm("Are you sure you want to submit the worksheet now?")) onFinish();
  };

  const renderCompletedSubQuestion = (subQ: SubQuestionWithStepInfo) => {
    const answer = initialAnswers[subQ.id]?.answer;
    let displayAnswer = answer;
    if (subQ.answerType === 'mcq') {
      const options = subQ.mcqAnswer?.options || [];
      if (Array.isArray(answer)) {
        displayAnswer = options.filter((o: any) => answer.includes(o.id)).map((o: any) => o.text).join(', ');
      } else if (typeof answer === 'string' && answer.includes(',')) {
        const ids = answer.split(',');
        displayAnswer = options.filter((o: any) => ids.includes(o.id)).map((o: any) => o.text).join(', ');
      } else {
        const opt = options.find((o: any) => String(o.id) === String(answer));
        displayAnswer = opt ? opt.text : answer;
      }
    }
    return (
      <div key={subQ.id} className="relative pl-6 pb-2 border-l-2 border-slate-200 last:border-0 last:pb-0 break-words w-full min-w-0">
        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-slate-200 ring-4 ring-white" />
        <div className="text-xs text-slate-500 mb-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: processedHtml(subQ.questionText) }} />
        <div className="text-sm font-medium text-slate-800 bg-slate-100/50 px-2 py-1 rounded inline-block break-all">{displayAnswer || <span className="text-slate-400 italic">Skipped</span>}</div>
      </div>
    );
  };

  const activeSubQuestion = subQuestions[activeSubIndex];
  const currentStepStartIndex = subQuestions.findIndex(sq => sq.stepId === activeSubQuestion?.stepId);
  const indexInStep = activeSubIndex - currentStepStartIndex;
  
  const hasInput = isAiMode 
    ? !!aiImage 
    : (currentAnswer !== null && currentAnswer !== '' && !(Array.isArray(currentAnswer) && currentAnswer.length === 0));

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-50 flex flex-col h-[100dvh]">
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 shadow-sm shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 text-slate-500 hover:bg-slate-50" onClick={onPrevious} disabled={currentIndex === 0 && activeSubIndex === 0}><ChevronLeft className="h-5 w-5" /></Button>
          <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Question</span><span className="text-sm font-bold text-slate-800 leading-none">{currentIndex + 1} <span className="text-slate-300 font-normal">/</span> {totalQuestions}</span></div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tabular-nums transition-colors", timeLeft < 60 ? "bg-red-50 text-red-600 ring-1 ring-red-100" : "bg-slate-100 text-slate-600")}><Clock className="h-3.5 w-3.5" /><span>{formatTime(timeLeft)}</span></div>
          <Button variant="ghost" size="sm" className="h-8 px-3 text-red-600 font-semibold hover:bg-red-50 hover:text-red-700 text-xs uppercase tracking-wide" onClick={handleEarlyFinish}>Finish</Button>
        </div>
      </header>
      <div className="w-full bg-slate-100 h-1 shrink-0"><div className="h-full bg-indigo-600 transition-all duration-500 ease-out rounded-r-full" style={{ width: `${progressValue}%` }} /></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20 overscroll-contain scroll-smooth" ref={scrollContainerRef}>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 break-words w-full min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">Main Problem</Badge>
            {isAiMode && <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200 gap-1"><Sparkles className="h-3 w-3" /> AI Graded</Badge>}
          </div>
          <div className="prose prose-slate prose-sm max-w-none text-slate-800 leading-relaxed font-medium break-words" dangerouslySetInnerHTML={{ __html: processedHtml(question.mainQuestionText) }} />
        </div>
        
        {!isAiMode && completedSteps.length > 0 && (
          <div className="space-y-4 opacity-70 hover:opacity-100 transition-opacity">
            {completedSteps.map((step, stepIdx) => (
              <div key={stepIdx} className="bg-white/50 border border-slate-100 rounded-xl p-4 w-full min-w-0">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />{step.title}</h3>
                <div className="ml-1">{step.subQs.map((subQ) => renderCompletedSubQuestion(subQ))}</div>
              </div>
            ))}
          </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">
            <div className="bg-white p-1 rounded-2xl shadow-md border border-indigo-100 ring-1 ring-indigo-50 w-full min-w-0">
              
              {isAiMode ? (
                  <div className="p-5">
                      <div className="mb-4 text-center">
                          <h3 className="text-lg font-bold text-slate-900">Upload Your Solution</h3>
                          <p className="text-sm text-slate-500">Take a clear photo of your work for AI analysis.</p>
                      </div>
                      
                      <AIAnswerUploader 
                        questionId={question.id} 
                        isGrading={isAiGrading} 
                        savedImage={aiImage} 
                        onImageSelected={onAiImageSelect} 
                        disabled={isAiGraded} 
                      />

                      {isAiGraded && aiFeedback && (
                          <div className="mt-6 bg-indigo-50/50 rounded-xl border border-indigo-100 p-4">
                              <div className="flex items-center gap-2 mb-3 text-indigo-700 font-bold text-sm uppercase tracking-wide">
                                  <Sparkles className="h-4 w-4" /> Feedback
                              </div>
                              <div className="prose prose-sm max-w-none text-slate-700">
                                  <ReactMarkdown>{aiFeedback}</ReactMarkdown>
                              </div>
                          </div>
                      )}
                  </div>
              ) : (
              <>
                {activeSubQuestion && (
                    <>
                        <div className="bg-indigo-50/50 p-4 rounded-t-xl border-b border-indigo-50 flex items-center justify-between">
                            <div className="flex items-center gap-2.5"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold shadow-sm shadow-indigo-200">{indexInStep + 1}</span><h3 className="text-sm font-bold text-indigo-950">{activeSubQuestion.stepTitle}</h3></div>
                            <span className="text-[10px] font-bold bg-white text-slate-400 px-2 py-1 rounded border border-slate-100">{activeSubQuestion.marks} Mark{activeSubQuestion.marks > 1 ? 's' : ''}</span>
                        </div>
                        <div className="p-5">
                            <div className="prose prose-slate prose-sm max-w-none text-slate-700 mb-6 break-words" dangerouslySetInnerHTML={{ __html: processedHtml(activeSubQuestion.questionText) }} />
                            <div>
                            {activeSubQuestion.answerType === 'mcq' ? (
                                <div className="space-y-3">
                                {activeSubQuestion.mcqAnswer?.options.map((opt: any) => {
                                    const isMulti = activeSubQuestion.mcqAnswer?.isMultiCorrect;
                                    let isSelected = false;
                                    if (isMulti) isSelected = Array.isArray(currentAnswer) && currentAnswer.some((val: any) => String(val) === String(opt.id));
                                    else isSelected = String(currentAnswer) === String(opt.id);
                                    return (
                                    <div key={opt.id} onClick={() => { if (isMulti) { const curr = Array.isArray(currentAnswer) ? currentAnswer : []; setCurrentAnswer(isSelected ? curr.filter((id: string) => String(id) !== String(opt.id)) : [...curr, opt.id]); } else { setCurrentAnswer(isSelected ? null : opt.id); } }} className={cn("relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all active:scale-[0.98] cursor-pointer touch-manipulation w-full", isSelected ? "border-indigo-600 bg-indigo-50/50 shadow-sm z-10" : "border-slate-100 bg-white hover:border-slate-200")}>
                                        <div className={cn("mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors", isSelected ? "border-indigo-600 bg-indigo-600" : "border-slate-300")}>{isSelected && <Check className="h-3 w-3 text-white stroke-[3px]" />}</div>
                                        <span className={cn("text-base font-medium leading-snug w-full select-none break-words", isSelected ? "text-indigo-900" : "text-slate-600")}>{opt.text}</span>
                                    </div>
                                    )
                                })}
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                <Input type="text" placeholder="Type your answer here..." value={currentAnswer || ''} onChange={(e) => setCurrentAnswer(e.target.value)} className="border-none shadow-none text-lg h-12 px-3 w-full bg-transparent placeholder:text-slate-400 font-medium text-slate-800" autoComplete="off" />
                                </div>
                            )}
                            </div>
                        </div>
                    </>
                )}
              </>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button size="lg" className={cn("w-full h-14 text-lg font-bold shadow-xl transition-all duration-300 rounded-xl flex items-center justify-between px-6", hasInput ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200" : "bg-slate-200 hover:bg-slate-300 text-slate-500 shadow-none")} onClick={handleNextStep} disabled={isAiGrading}>
                
                <span>
                  {isAiMode ? (
                      isAiGrading ? "Analyzing..." : isAiGraded ? (isLastQuestion ? "Finish Workbook" : "Next Question") : "Grade My Answer"
                  ) : (
                      !hasInput ? (activeSubIndex < subQuestions.length - 1 ? "Skip Step" : "Skip Question") : (activeSubIndex < subQuestions.length - 1 ? "Next Step" : isLastQuestion ? "Finish Workbook" : "Next Question")
                  )}
                </span>

                {isAiMode ? (
                    isAiGrading ? <Loader2 className="ml-2 h-6 w-6 animate-spin" /> : isAiGraded ? <ArrowRight className="ml-2 h-6 w-6" /> : <Sparkles className="ml-2 h-6 w-6" />
                ) : (
                    activeSubIndex < subQuestions.length - 1 ? (hasInput ? <ArrowRight className="ml-2 h-6 w-6 opacity-80" /> : <SkipForward className="ml-2 h-6 w-6 opacity-80" />) : isLastQuestion ? <CheckCircle2 className="ml-2 h-6 w-6 opacity-80" /> : <PlayCircle className="ml-2 h-6 w-6 opacity-80 fill-current" />
                )}
              </Button>
            </div>
            <div ref={bottomRef} className="h-6" />
          </div>
      </div>
    </div>
  );
}