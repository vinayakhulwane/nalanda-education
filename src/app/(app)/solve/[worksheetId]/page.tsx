'use client';

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query, where, documentId, updateDoc, arrayUnion, addDoc, serverTimestamp, getDocs, limit, orderBy, increment } from 'firebase/firestore';
import type { Worksheet, Question, WorksheetAttempt, ResultState, EconomySettings, CurrencyType, Class, Subject } from '@/types';
import {
  Loader2, ArrowLeft, ArrowRight, CheckCircle, Timer, X, Sparkles, Award, Clock,
  AlertCircle, RotateCcw, LayoutDashboard, Trophy, Coins, ChevronDown, ChevronUp, Crown, Gem, BrainCircuit, Printer, Unlock, Home, GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionRunner } from '@/components/question-runner';
import { MobileQuestionRunner } from '@/components/solve/mobile-question-runner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { WorksheetResults, type AnswerState } from '@/components/worksheet-results';
import { AIAnswerUploader } from '@/components/solve/ai-answer-uploader';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { calculateAttemptRewards } from "@/lib/wallet";
import { BrandLogo } from '@/components/brand-logo';
import confetti from "canvas-confetti";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from "date-fns";
import { generateSolutionAction } from '@/app/actions/ai-solution';

// --- CONSTANTS ---
const currencyIcons: Record<string, React.ElementType> = { coin: Coins, gold: Crown, diamond: Gem, spark: Sparkles, aiCredits: BrainCircuit };
const currencyColors: Record<string, string> = { spark: 'text-slate-500', coin: 'text-yellow-600 dark:text-yellow-400', gold: 'text-amber-600 dark:text-amber-400', diamond: 'text-blue-600 dark:text-blue-400', aiCredits: 'text-indigo-600 dark:text-indigo-400' };
const currencyBg: Record<string, string> = { coin: 'bg-yellow-100 dark:bg-yellow-900/30', gold: 'bg-amber-100 dark:bg-amber-900/30', diamond: 'bg-blue-100 dark:bg-blue-900/30', spark: 'bg-slate-100 dark:bg-slate-800', aiCredits: 'bg-indigo-100 dark:bg-indigo-900/30' };

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

const processedMainQuestionText = (text: string) => text ? text.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ') : '';
const formatCriterionKey = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();

// --- COMPONENTS ---
const AIRubricBreakdown = ({ rubric, breakdown, maxMarks = 8 }: { rubric: Record<string, any> | null, breakdown: Record<string, number>, maxMarks?: number }) => {
  if (!breakdown || Object.keys(breakdown).length === 0) return null;
  const activeRubric = (rubric && Object.keys(rubric).length > 0) ? rubric : Object.keys(breakdown).reduce((acc, key) => ({ ...acc, [key]: "N/A" }), {} as Record<string, any>);
  return (
    <div className="space-y-4 my-6 animate-in fade-in duration-700 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><Award className="h-4 w-4" /> Skill Assessment</h4>
      <div className="space-y-5">
        {Object.entries(activeRubric).map(([rawKey, rawWeight], index) => {
          const criterion = formatCriterionKey(rawKey);
          const percentageScore = breakdown[rawKey] ?? breakdown[criterion] ?? 0;
          const weightPct = typeof rawWeight === 'string' ? parseFloat(rawWeight) : (rawWeight as number);
          const maxCategoryMarks = (weightPct / 100) * maxMarks;
          const earnedCategoryMarks = (percentageScore / 100) * maxCategoryMarks;
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm items-end">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{criterion}</span>
                  <span className="text-muted-foreground text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">{weightPct}% Weight</span>
                </div>
                <div className="font-mono font-bold text-xs"><span className={percentageScore < 50 ? "text-red-500" : "text-emerald-600"}>{earnedCategoryMarks.toFixed(2)}</span><span className="text-muted-foreground ml-1">/ {maxCategoryMarks.toFixed(2)}</span></div>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className={cn("h-full transition-all duration-1000 ease-out rounded-full", percentageScore < 40 ? "bg-red-500" : percentageScore < 70 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${percentageScore}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getUserAnswerText = (subQ: any, answerVal: any): string => {
  if (answerVal === null || answerVal === undefined || answerVal === '') return 'Not Attempted';
  if (subQ.answerType === 'numerical' || subQ.answerType === 'text') return String(answerVal);
  const options = subQ.mcqAnswer?.options || subQ.options;
  if (subQ.answerType === 'mcq' && Array.isArray(options)) {
    const optionMap = new Map(options.map((o: any) => [String(o.id), o.text ? String(o.text) : String(o.id)]));
    if (Array.isArray(answerVal)) return answerVal.length === 0 ? 'Not Answered' : answerVal.map((id: any) => optionMap.get(String(id)) || String(id)).join(', ');
    if (typeof answerVal === 'string' && answerVal.includes(',')) return answerVal.split(',').map((id) => { const trimmed = id.trim(); return optionMap.get(trimmed) || trimmed; }).join(', ');
    return optionMap.get(String(answerVal)) || String(answerVal);
  }
  return String(answerVal);
};

const getCorrectAnswerText = (subQ: any): string => {
  switch (subQ.answerType) {
    case 'numerical':
      const { correctValue, baseUnit } = subQ.numericalAnswer || {};
      if (!baseUnit || baseUnit.toLowerCase() === 'unitless') return `${correctValue ?? 'N/A'}`;
      return `${correctValue ?? 'N/A'}${baseUnit ? ` ${baseUnit}` : ''}`;
    case 'text': return subQ.textAnswerKeywords?.join(', ') || 'N/A';
    case 'mcq':
      const options = subQ.mcqAnswer?.options || subQ.options || [];
      const correctOptions = subQ.mcqAnswer?.correctOptions || (subQ.correctAnswer ? [subQ.correctAnswer] : []);
      if (Array.isArray(options) && options.length > 0) {
         const texts = options.filter((opt: any) => correctOptions.includes(opt.id) || String(opt.id) === String(subQ.correctAnswer)).map((opt: any) => opt.text ? String(opt.text) : String(opt.id));
         if (texts.length > 0) return texts.join(', ');
      }
      return 'See Solution';
    default: return 'N/A';
  }
};

const MobileResultView = ({ worksheet, results, answers, questions, timeTaken, totalMarks, maxMarks, onClaimReward, calculatedRewards, isClaiming, hasClaimed, userProfile, classData, subjectData, economySettings, onUnlockSolution, unlockedSolutions, loadingSolutions }: any) => {
  const router = useRouter();
  const { toast } = useToast();
  // FIX: Added clamp to ensure percentage never exceeds 100% in display
  const percentage = maxMarks > 0 ? Math.min(100, Math.round((totalMarks / maxMarks) * 100)) : 0;
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const hasRewards = calculatedRewards && Object.keys(calculatedRewards).length > 0 && Object.values(calculatedRewards).some((v: any) => v > 0);
  const formattedDate = format(new Date(), 'PPP p');

  const handleBack = () => {
    if (worksheet.classId && worksheet.subjectId) {
        router.push(`/academics/${worksheet.classId}/${worksheet.subjectId}`);
    } else {
        router.back();
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    const element = document.getElementById('mobile-result-content');
    const pdfHeader = document.getElementById('pdf-header');
    if (!element) return;

    try {
      if (pdfHeader) pdfHeader.classList.remove('hidden');
      const triggers = document.querySelectorAll('[data-state="closed"]');
      triggers.forEach((t: any) => t.click());
      await new Promise(resolve => setTimeout(resolve, 1000));
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, scrollY: -window.scrollY });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = canvas.height * pdfWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      pdf.save(`${worksheet.title}_Report.pdf`);
    } catch (e) { 
        console.error(e); 
        toast({ title: "PDF Failed", description: "Could not generate PDF", variant: "destructive" });
    } finally { 
        setIsDownloading(false);
        if (pdfHeader) pdfHeader.classList.add('hidden');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 overflow-x-hidden" id="mobile-result-content">
      
      {/* PDF Header */}
      <div id="pdf-header" className="hidden bg-white p-8 border-b-2 border-slate-100 mb-6">
         <div className="flex justify-between items-start mb-6">
             <div className="flex items-center gap-4">
                 <BrandLogo size={60} />
                 <div>
                     <h1 className="text-2xl font-black text-slate-900 leading-none">Nalanda</h1>
                     <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mt-1">Education</p>
                 </div>
             </div>
             <div className="text-right">
                 <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Report Generated</p>
                 <p className="text-sm font-medium text-slate-900">{formattedDate}</p>
             </div>
         </div>
         <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
                <div><p className="text-xs text-slate-400 uppercase font-bold mb-0.5">Student Name</p><p className="font-semibold text-slate-900">{userProfile?.name || 'N/A'}</p></div>
                <div><p className="text-xs text-slate-400 uppercase font-bold mb-0.5">Class</p><p className="font-semibold text-slate-900">{classData?.name || 'N/A'}</p></div>
                <div><p className="text-xs text-slate-400 uppercase font-bold mb-0.5">Subject</p><p className="font-semibold text-slate-900">{subjectData?.name || 'N/A'}</p></div>
                <div><p className="text-xs text-slate-400 uppercase font-bold mb-0.5">Worksheet</p><p className="font-semibold text-slate-900">{worksheet.title}</p></div>
             </div>
         </div>
      </div>

      {/* RESULT HEADER */}
      <div className="bg-white dark:bg-slate-900 pt-4 pb-10 px-4 rounded-b-[2.5rem] shadow-sm border-b border-slate-100 dark:border-slate-800 relative">
        <div className="absolute top-4 left-4">
            <Button variant="ghost" size="icon" onClick={handleBack} className="text-slate-400 hover:text-slate-700">
                <ArrowLeft className="h-6 w-6" />
            </Button>
        </div>
        <div className="text-center space-y-1 mb-6 mt-4">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white px-4 leading-tight">{worksheet.title}</h1>
          <p className="text-xs text-slate-500 font-medium">{formattedDate}</p>
        </div>
        
        {/* SCORE CIRCLE */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative h-44 w-44 flex items-center justify-center mb-6">
            <div className={cn("h-full w-full rounded-full border-[14px] flex items-center justify-center shadow-lg transform transition-all", percentage >= 70 ? "border-emerald-500 bg-emerald-50/30" : percentage >= 40 ? "border-amber-500 bg-amber-50/30" : "border-red-500 bg-red-50/30")}>
              <div className="text-center">
                <span className="text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">{percentage}%</span>
                <p className="text-xs font-semibold text-slate-400 mt-1">ACCURACY</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-center border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Score</p>
              <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">{totalMarks.toFixed(1)}<span className="text-xs text-slate-400 font-normal">/{maxMarks}</span></p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-center border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Time</p>
              <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">{formatTime(timeTaken)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* REWARD CARD */}
        <div className="animate-in slide-in-from-bottom-4 duration-700 delay-150 space-y-4">
          <Card className="border-none shadow-md bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 overflow-hidden relative">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none"><Trophy className="h-32 w-32 -mr-8 -mt-8 rotate-12" /></div>
            <CardContent className="p-5 flex flex-col gap-4 relative z-10">
              <div>
                <p className="text-amber-800 dark:text-amber-200 font-bold text-sm uppercase tracking-wide mb-2">Rewards Earned</p>
                <div className="flex flex-wrap gap-2">
                  {hasRewards ? Object.entries(calculatedRewards).map(([currency, amount]) => {
                    if (!amount || amount === 0) return null;
                    const Icon = currencyIcons[currency] || Coins;
                    return (
                      <div key={currency} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200/50 shadow-sm bg-white/50")}>
                        <Icon className={cn("h-5 w-5 text-slate-600")} /><span className={cn("font-black text-xl text-slate-600")}>{amount as number}</span>
                      </div>
                    );
                  }) : <div className="text-amber-900/50 font-medium text-sm italic">No rewards this time.</div>}
                </div>
              </div>
              <Button onClick={onClaimReward} disabled={isClaiming || hasClaimed || !hasRewards} className={cn("w-full rounded-full font-bold shadow-sm transition-all h-12 text-base", hasClaimed ? "bg-amber-200 text-amber-800 hover:bg-amber-200 cursor-default opacity-80" : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-500/30 shadow-lg")}>
                {isClaiming ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Claiming...</> : hasClaimed ? <><CheckCircle className="mr-2 h-5 w-5" /> Claimed</> : "Claim Rewards"}
              </Button>
            </CardContent>
          </Card>

          {/* ACTION ROW: EXPORT PDF */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDownload} disabled={isDownloading} className="flex-1 h-12 border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />} Export Report
            </Button>
          </div>
        </div>

        {/* DETAILED ANALYSIS */}
        <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-700 delay-300">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider pl-1">Detailed Analysis</h3>
          {questions.map((q: Question, qIdx: number) => {
            const allSubQuestions = q.solutionSteps.flatMap(s => s.subQuestions);
            const isCorrect = allSubQuestions.every(sq => results[sq.id]?.isCorrect === true);
            const unlockedSolution = unlockedSolutions?.[q.id];
            
            // AI Data Retrieval
            const isAiGraded = q.gradingMode === 'ai';
            const firstSubId = q.solutionSteps[0]?.subQuestions[0]?.id;
            const aiResult = isAiGraded ? results[firstSubId] : null;
            // @ts-ignore
            const aiBreakdown = aiResult?.aiBreakdown || {};
            const qMaxMarks = q.solutionSteps.reduce((acc, s) => acc + s.subQuestions.reduce((ss, sq) => ss + sq.marks, 0), 0);

            return (
              <Collapsible key={q.id} open={openQuestionId === q.id} onOpenChange={(open) => setOpenQuestionId(open ? q.id : null)} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <CollapsibleTrigger className="w-full flex items-center justify-between p-4 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 border", isCorrect ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "bg-red-100 border-red-200 text-red-600")}>
                      {isCorrect ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    {/* Flex layout for text wrapping */}
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-semibold">Question {qIdx + 1}</p>
                      <div className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap break-words">
                          <span dangerouslySetInnerHTML={{ __html: processedMainQuestionText(q.mainQuestionText) }} />
                      </div>
                    </div>
                  </div>
                  {openQuestionId === q.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="bg-slate-50/50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800 w-full overflow-hidden">
                  <div className="p-4 space-y-6">
                    
                    {/* 1. Show AI Rubric Breakdown if AI Graded */}
                    {isAiGraded && (
                        <AIRubricBreakdown 
                            rubric={q.aiRubric || {}} 
                            breakdown={aiBreakdown} 
                            maxMarks={qMaxMarks} 
                        />
                    )}

                    {/* 2. Show Sub-questions ONLY if NOT AI Graded */}
                    {!isAiGraded && q.solutionSteps.map((step, sIdx) => (
                      <div key={sIdx} className="space-y-3">
                        {(step as any).instructionText && <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-white">Step {sIdx + 1}</Badge><span className="text-xs font-medium text-slate-600 dark:text-slate-400" dangerouslySetInnerHTML={{ __html: (step as any).instructionText }} /></div>}
                        <div className="space-y-3 pl-2 border-l-2 border-slate-200 dark:border-slate-800 ml-2">
                          {step.subQuestions.map((subQ) => {
                            const result = results[subQ.id];
                            const rawUserAnswer = answers[subQ.id]?.answer;
                            const userReadableAnswer = getUserAnswerText(subQ, rawUserAnswer);
                            const correctReadableAnswer = getCorrectAnswerText(subQ);
                            const isSubCorrect = result?.isCorrect === true;
                            return (
                              <div key={subQ.id} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-sm">
                                <div className="mb-2 text-slate-800 dark:text-slate-200 font-medium text-xs leading-relaxed break-words w-full"><span dangerouslySetInnerHTML={{ __html: subQ.questionText || "Solve:" }} /></div>
                                <div className="grid grid-cols-1 gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">
                                  {/* Answer Wrapper with strict wrapping */}
                                  <div className="mt-1 min-w-0">
                                    <span className="text-[10px] uppercase text-slate-400 font-bold block mb-0.5">Your Answer</span>
                                    <div className={cn("text-xs whitespace-pre-wrap break-words break-all w-full font-medium", isSubCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{userReadableAnswer}</div>
                                  </div>
                                  {!isSubCorrect && (
                                    <div className="mt-1 pt-1 min-w-0">
                                        <span className="text-[10px] uppercase text-emerald-600/70 font-bold block mb-0.5">Correct Answer</span>
                                        <div className="text-xs text-emerald-700 dark:text-emerald-400 whitespace-pre-wrap break-words break-all w-full font-medium">{correctReadableAnswer}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* 3. AI Feedback Text */}
                    {isAiGraded && aiResult?.feedback && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm overflow-hidden">
                            <div className="bg-indigo-50/50 dark:bg-indigo-950/30 px-4 py-3 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-indigo-600" />
                                <h4 className="font-semibold text-sm text-indigo-900 dark:text-indigo-200">AI Feedback</h4>
                            </div>
                            <div className="p-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                <ReactMarkdown components={{ strong: ({ node, ...props }) => <span className="font-bold text-indigo-700 dark:text-indigo-400" {...props} />, ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />, li: ({ node, ...props }) => <li className="pl-1" {...props} />, p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} /> }}>
                                    {aiResult.feedback}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* 4. AI SOLUTION BUTTON (Visible for ALL types) */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        {unlockedSolution ? (
                            <div className="bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-lg border border-indigo-100">
                                <h4 className="text-xs font-bold text-indigo-800 flex items-center gap-1 mb-2"><Unlock className="h-3 w-3" /> AI Solution</h4>
                                <div className="prose prose-xs dark:prose-invert"><ReactMarkdown rehypePlugins={[rehypeRaw]}>{unlockedSolution}</ReactMarkdown></div>
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" onClick={() => onUnlockSolution(q)} disabled={loadingSolutions[q.id]} className="w-full text-xs h-8 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100">
                                {loadingSolutions[q.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <BrainCircuit className="h-3 w-3 mr-2" />}
                                Unlock AI Solution ({economySettings?.solutionCost || 5} {economySettings?.solutionCurrency || 'coins'})
                            </Button>
                        )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>

      {/* BOTTOM BACK BUTTON */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t flex justify-center z-40">
        <div className="w-full max-w-md mx-auto flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleBack}>
                <Home className="mr-2 h-4 w-4" /> Back to Subject
            </Button>
            <Button className="flex-1" onClick={() => window.location.reload()}>
                <RotateCcw className="mr-2 h-4 w-4" /> Retry
            </Button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function SolveWorksheetPage() {
  const router = useRouter();
  const params = useParams();
  const worksheetId = params.worksheetId as string;
  const firestore = useFirestore();
  const { user, userProfile } = useUser();
  const { toast } = useToast();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [results, setResults] = useState<ResultState>({});
  const [timeTaken, setTimeTaken] = useState(0);
  const [attempt, setAttempt] = useState<WorksheetAttempt | null>(null);
  const [aiImages, setAiImages] = useState<Record<string, File | null>>({});
  const [isAiGrading, setIsAiGrading] = useState(false);
  
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [localUnlocked, setLocalUnlocked] = useState<Record<string, string>>({});
  const [loadingSolutions, setLoadingSolutions] = useState<Record<string, boolean>>({});

  const worksheetRef = useMemoFirebase(() => (firestore && worksheetId ? doc(firestore, 'worksheets', worksheetId) : null), [firestore, worksheetId]);
  const { data: worksheet, isLoading: isWorksheetLoading } = useDoc<Worksheet>(worksheetRef);
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
  const { data: settings } = useDoc<EconomySettings>(settingsRef);
  const classRef = useMemoFirebase(() => (firestore && worksheet ? doc(firestore, 'classes', worksheet.classId) : null), [firestore, worksheet]);
  const { data: classData } = useDoc<Class>(classRef);
  const subjectRef = useMemoFirebase(() => (firestore && worksheet ? doc(firestore, 'subjects', worksheet.subjectId) : null), [firestore, worksheet]);
  const { data: subjectData } = useDoc<Subject>(subjectRef);

  const questionsQuery = useMemoFirebase(() => {
    if (!firestore || !worksheet?.questions || worksheet.questions.length === 0) return null;
    return query(collection(firestore, 'questions'), where(documentId(), 'in', worksheet.questions.slice(0, 30)));
  }, [firestore, worksheet?.questions]);
  const { data: questions, isLoading: areQuestionsLoading } = useCollection<Question>(questionsQuery);

  useEffect(() => {
    const checkExistingAttempt = async () => {
      if (user && firestore && userProfile?.completedWorksheets?.includes(worksheetId)) {
        const attemptsQuery = query(collection(firestore, 'worksheet_attempts'), where('userId', '==', user.uid), where('worksheetId', '==', worksheetId), orderBy('attemptedAt', 'desc'), limit(1));
        try {
          const querySnapshot = await getDocs(attemptsQuery);
          if (!querySnapshot.empty) {
            const lastAttempt = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as WorksheetAttempt;
            setAnswers(lastAttempt.answers);
            setResults(lastAttempt.results);
            setTimeTaken(lastAttempt.timeTaken);
            setAttempt(lastAttempt);
            setHasClaimed(lastAttempt.rewardsClaimed || false);
            setLocalUnlocked(lastAttempt.unlockedSolutions || {});
            setIsFinished(true);
          }
        } catch (error) { console.error("Error fetching past attempt:", error); }
      }
    };
    checkExistingAttempt();
  }, [user, firestore, worksheetId, userProfile?.completedWorksheets]);

  const orderedQuestions = useMemo(() => {
    if (!worksheet?.questions || !questions) return [];
    const questionsMap = new Map(questions.map(q => [q.id, q]));
    return worksheet.questions.map(id => questionsMap.get(id)).filter(Boolean) as Question[];
  }, [worksheet?.questions, questions]);

  const { totalMarks, totalDuration } = useMemo(() => {
    if (!orderedQuestions) return { totalMarks: 0, totalDuration: 0 };
    let marks = 0; let duration = 0;
    orderedQuestions.forEach((question) => {
      const qMarks = question.solutionSteps?.reduce((stepSum, step) => stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
      marks += qMarks;
      let qTime = qMarks > 0 ? qMarks * 20 : 60;
      if (question.gradingMode === 'ai') qTime += 40;
      duration += qTime;
    });
    return { totalMarks: marks, totalDuration: duration };
  }, [orderedQuestions]);

  const calculatedRewards = useMemo(() => {
    if (!worksheet || !questions || !results || !user?.uid) return {};
    return calculateAttemptRewards(worksheet, questions, results, user.uid, settings ?? undefined);
  }, [worksheet, questions, results, user?.uid, settings]);

  const [timeLeft, setTimeLeft] = useState(totalDuration);
  const [startTime, setStartTime] = useState<Date | null>(null);

  useEffect(() => { if (totalDuration > 0 && !startTime) setTimeLeft(totalDuration); }, [totalDuration, startTime]);
  useEffect(() => { if (startTime && !isFinished) { if (timeLeft <= 0) { handleFinish(); return; } const timerId = setInterval(() => { setTimeLeft(prev => Math.max(0, prev - 1)); }, 1000); return () => clearInterval(timerId); } }, [timeLeft, startTime, isFinished]);

  const isLoading = isWorksheetLoading || areQuestionsLoading;
  const handleStart = () => setStartTime(new Date());
  const handleNext = () => (currentQuestionIndex < orderedQuestions.length - 1) ? setCurrentQuestionIndex(currentQuestionIndex + 1) : handleFinish();
  const handlePrevious = () => (currentQuestionIndex > 0) && setCurrentQuestionIndex(currentQuestionIndex - 1);

  const handleFinish = async () => {
    const finalTimeTaken = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000) : 0;
    setTimeTaken(finalTimeTaken);
    setIsFinished(true);
    if (user && firestore && worksheet) {
      if (worksheet.worksheetType === 'practice' && !userProfile?.completedWorksheets?.includes(worksheetId)) {
        await updateDoc(doc(firestore, 'users', user.uid), { completedWorksheets: arrayUnion(worksheetId) });
      }
      const attemptData = { userId: user.uid, worksheetId: worksheet.id, answers, results, timeTaken: finalTimeTaken, attemptedAt: serverTimestamp(), rewardsClaimed: false };
      const attemptRef = await addDoc(collection(firestore, 'worksheet_attempts'), attemptData);
      setAttempt({ ...attemptData, id: attemptRef.id, attemptedAt: new Date() } as any);
    }
  }

  const handleClaimReward = async () => {
    if (!user || !firestore || hasClaimed || isClaiming || !attempt?.id || !calculatedRewards) return;
    setIsClaiming(true);
    const userRef = doc(firestore, 'users', user.uid);
    const attemptRef = doc(firestore, 'worksheet_attempts', attempt.id);
    const transactionsColRef = collection(firestore, 'transactions');
    const transactionPromises: Promise<any>[] = [];
    try {
      const updatePayload: Record<string, any> = {};
      for (const key in calculatedRewards) {
        const currency = key as CurrencyType;
        const amount = calculatedRewards[key as keyof typeof calculatedRewards];
        if (amount && amount > 0) {
          const fieldMap: Record<string, string> = { coin: 'coins', gold: 'gold', diamond: 'diamonds' };
          if (fieldMap[currency]) updatePayload[fieldMap[currency]] = increment(amount);
          transactionPromises.push(addDoc(transactionsColRef, { userId: user.uid, type: 'earned', description: `Reward from worksheet: ${worksheet?.title}`, amount: amount, currency: currency, createdAt: serverTimestamp() }));
        }
      }
      if (Object.keys(updatePayload).length > 0) await updateDoc(userRef, updatePayload);
      await updateDoc(attemptRef, { rewardsClaimed: true });
      await Promise.all(transactionPromises);
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
      toast({ title: "Rewards Claimed!", description: "Your wallet has been updated." });
      setHasClaimed(true);
    } catch (error) { console.error("Error claiming rewards:", error); toast({ variant: "destructive", title: "Claim Failed", description: "Could not update your wallet." }); } finally { setIsClaiming(false); }
  };

  const handleUnlockSolution = async (question: Question) => {
      if (!user || !userProfile || !attempt?.id) return;
      const cost = settings?.solutionCost ?? 5;
      const currency = settings?.solutionCurrency ?? 'coin';
      // @ts-ignore
      const bal = userProfile[currency === 'coin' ? 'coins' : currency] || 0;
      if (bal < cost) { toast({ variant: 'destructive', title: 'Insufficient Funds' }); return; }
      
      setLoadingSolutions(prev => ({ ...prev, [question.id]: true }));
      try {
          const res = await generateSolutionAction({ questionText: question.mainQuestionText });
          if (!res || !res.success) throw new Error(res?.error || "Failed");
          setLocalUnlocked(prev => ({...prev, [question.id]: res.solution || ""}));
          
          const userRef = doc(firestore, 'users', user.uid);
          const updatePayload: any = {};
          const fieldName = currency === 'coin' ? 'coins' : currency === 'aiCredits' ? 'aiCredits' : currency;
          updatePayload[fieldName] = increment(-cost);
          await updateDoc(userRef, updatePayload);
          
          await updateDoc(doc(firestore, 'worksheet_attempts', attempt.id), { [`unlockedSolutions.${question.id}`]: res.solution });
          toast({ title: "Unlocked!" });
      } catch (e) { toast({ variant: 'destructive', title: "Error" }); } finally { setLoadingSolutions(prev => ({ ...prev, [question.id]: false })); }
  };

  const handleAICheck = async (question: Question) => {
    const imageFile = aiImages[question.id];
    if (!imageFile) { toast({ variant: 'destructive', title: "Solution Required", description: "Please upload a photo first." }); return; }
    setIsAiGrading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('questionText', question.mainQuestionText);
      
      // Calculate total marks for the question
      const allSubQuestions = question.solutionSteps.flatMap(s => s.subQuestions);
      const qMaxMarks = allSubQuestions.reduce((acc, sq) => acc + sq.marks, 0);
      
      formData.append('totalMarks', qMaxMarks.toString());
      const rubricToSend = question.aiRubric || { "General Accuracy": "100%" };
      formData.append('rubric', JSON.stringify(rubricToSend));
      formData.append('feedbackPatterns', JSON.stringify(question.aiFeedbackPatterns || []));
      
      const response = await fetch('/api/grade', { method: 'POST', body: formData });
      if (!response.ok) throw new Error("API call failed");
      
      const aiResult = await response.json();
      
      // Calculate total earned marks based on AI percentage score
      const totalEarnedMarks = (aiResult.totalScore / 100) * qMaxMarks;
      
      const newResults: ResultState = {};
      const newAnswers: AnswerState = {};
      
      // Distribute marks proportionally to sub-questions
      allSubQuestions.forEach(sq => {
          // If total marks is 0, avoid division by zero
          const weight = qMaxMarks > 0 ? (sq.marks / qMaxMarks) : 0;
          const assignedScore = totalEarnedMarks * weight;
          
          newResults[sq.id] = { 
              isCorrect: aiResult.isCorrect, 
              score: assignedScore, // Correctly weighted score per sub-question
              feedback: aiResult.feedback, 
              aiBreakdown: aiResult.breakdown 
          } as any;
          
          newAnswers[sq.id] = { answer: aiResult.driveLink };
      });

      setResults(prev => ({ ...prev, ...newResults }));
      setAnswers(prev => ({ ...prev, ...newAnswers }));
      
      toast({ title: "Grading Complete!", description: `Score: ${totalEarnedMarks.toFixed(2)} / ${qMaxMarks}` });
    } catch (error: any) { 
        console.error("AI Grading Error", error); 
        toast({ variant: 'destructive', title: "Grading Failed", description: error.message }); 
    } finally { 
        setIsAiGrading(false); 
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!worksheet || orderedQuestions.length === 0) return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <p className="text-lg font-medium text-muted-foreground">Worksheet could not be loaded.</p>
      <Button onClick={() => router.back()}>Go Back</Button>
    </div>
  );

  const activeQuestion = orderedQuestions[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex + 1) / orderedQuestions.length) * 100;
  const isLastQuestion = currentQuestionIndex === orderedQuestions.length - 1;
  const qMaxMarks = activeQuestion.solutionSteps.reduce((acc, s) => acc + s.subQuestions.reduce((ss, sq) => ss + sq.marks, 0), 0);

  if (isFinished) {
    const earnedMarks = orderedQuestions.reduce((acc, q) => {
      const qMarks = q.solutionSteps?.reduce((stepAcc, step) => {
        return stepAcc + step.subQuestions.reduce((subAcc, sub) => {
          const res = results[sub.id];
          if (!res) return subAcc;
          if (typeof res.score === 'number') return subAcc + res.score;
          if (res.isCorrect) return subAcc + sub.marks;
          return subAcc;
        }, 0);
      }, 0) || 0;
      return acc + qMarks;
    }, 0);

    return (
      <>
        <div className="block sm:hidden animate-in fade-in duration-500">
          <MobileResultView 
            worksheet={worksheet} 
            results={results} 
            answers={answers} 
            questions={orderedQuestions} 
            timeTaken={timeTaken} 
            totalMarks={earnedMarks} 
            maxMarks={totalMarks} 
            onClaimReward={handleClaimReward} 
            calculatedRewards={calculatedRewards} 
            isClaiming={isClaiming} 
            hasClaimed={hasClaimed} 
            userProfile={userProfile} 
            classData={classData} 
            subjectData={subjectData} 
            economySettings={settings} 
            onUnlockSolution={handleUnlockSolution} 
            unlockedSolutions={localUnlocked} 
            loadingSolutions={loadingSolutions} 
          />
        </div>
        <div className="hidden sm:block">
          <WorksheetResults worksheet={worksheet} questions={orderedQuestions} answers={answers} results={results} timeTaken={timeTaken} attempt={attempt ?? undefined} />
        </div>
      </>
    );
  }

  // --- START SCREEN ---
  if (!startTime) return (
    <div className="flex flex-col h-[100dvh] bg-slate-50/50 dark:bg-slate-950/50 items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-none">
        <div className="h-2 w-full bg-gradient-to-r from-primary to-indigo-500 rounded-t-xl" />
        <CardHeader className="text-center pb-2"><div className="mx-auto bg-primary/10 p-4 rounded-full mb-4 w-fit"><Timer className="h-8 w-8 text-primary" /></div><CardTitle className="text-2xl font-bold">{worksheet.title}</CardTitle><CardDescription className="text-base">You are about to start a timed worksheet.</CardDescription></CardHeader>
        <CardContent className="space-y-4"><div className="grid grid-cols-2 gap-4"><div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-lg text-center"><p className="text-xs text-muted-foreground uppercase font-bold">Duration</p><p className="text-xl font-mono font-semibold">{formatTime(totalDuration)}</p></div><div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-lg text-center"><p className="text-xs text-muted-foreground uppercase font-bold">Questions</p><p className="text-xl font-mono font-semibold">{orderedQuestions.length}</p></div></div></CardContent>
        <CardFooter className="pt-2 pb-8"><Button size="lg" className="w-full text-lg font-semibold shadow-lg shadow-primary/20" onClick={handleStart}>Start Attempt <ArrowRight className="ml-2 h-5 w-5" /></Button></CardFooter>
      </Card>
    </div>
  );

  const isAIGradingMode = activeQuestion.gradingMode === 'ai';
  const isQuestionGraded = activeQuestion.solutionSteps.some(step => step.subQuestions.some(sq => results[sq.id]));
  const currentResult = isQuestionGraded ? results[activeQuestion.solutionSteps[0]?.subQuestions[0]?.id] : null;
  const currentFeedback = currentResult?.feedback;

  return (
    <>
      <div className="block sm:hidden">
        <MobileQuestionRunner 
            question={orderedQuestions[currentQuestionIndex]} 
            currentIndex={currentQuestionIndex} 
            totalQuestions={orderedQuestions.length} 
            timeLeft={timeLeft} 
            initialAnswers={answers} 
            onAnswerSubmit={(subId, ans) => setAnswers(prev => ({ ...prev, [subId]: { answer: ans } }))} 
            onResultCalculated={(subId, correct) => setResults(prev => ({ ...prev, [subId]: { isCorrect: correct } }))} 
            onNext={handleNext} 
            onPrevious={handlePrevious} 
            onFinish={handleFinish} 
            isLastQuestion={isLastQuestion} 
            aiImage={aiImages[activeQuestion.id]}
            onAiImageSelect={(file) => setAiImages(prev => ({ ...prev, [activeQuestion.id]: file }))}
            onAiGrade={() => handleAICheck(activeQuestion)}
            isAiGrading={isAiGrading}
            results={results}
        />
      </div>
      <div className="hidden sm:flex flex-col h-screen bg-slate-50/30 dark:bg-slate-950/30">
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b h-16 flex items-center justify-between px-4 sm:px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-4"><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => router.back()}><X className="h-5 w-5" /></Button><div className="hidden sm:block"><h1 className="text-sm font-semibold truncate max-w-[200px]">{worksheet.title}</h1><div className="flex items-center gap-2 text-xs text-muted-foreground"><span>Question {currentQuestionIndex + 1} of {orderedQuestions.length}</span><span className="h-1 w-1 rounded-full bg-slate-300" /><span>{Math.round(progressPercentage)}% Complete</span></div></div></div>
          <div className="flex items-center gap-3 sm:gap-6"><div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full font-mono font-medium border text-xs sm:text-sm", timeLeft < 60 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700")}><Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>{formatTime(timeLeft)}</span></div><Button onClick={handleFinish} variant="destructive" size="sm" className="hidden sm:flex">Submit Attempt</Button></div>
        </header>
        <main className="flex-grow flex flex-col items-center p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl space-y-6 pb-20">
            <Card className="border-none shadow-md overflow-hidden"><div className="h-1.5 bg-slate-100 dark:bg-slate-800 w-full"><div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} /></div><CardHeader className="pb-4"><div className="flex justify-between items-start gap-4"><div className="space-y-1"><div className="flex items-center gap-2 mb-1"><Badge variant="outline" className="text-xs font-mono text-muted-foreground">Q{currentQuestionIndex + 1}</Badge>{isAIGradingMode && <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 gap-1"><Sparkles className="h-3 w-3" /> AI Graded</Badge>}</div><CardTitle className="text-lg sm:text-xl leading-tight">Question {currentQuestionIndex + 1}</CardTitle></div><div className="text-right shrink-0"><span className="text-sm font-bold text-slate-900 dark:text-slate-100">{qMaxMarks} Marks</span></div></div></CardHeader><CardContent className="p-4 sm:p-6"><div className="w-full overflow-x-auto"><div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed bg-slate-50/50 dark:bg-slate-900/50 p-4 sm:p-6 rounded-xl border border-slate-100 dark:border-slate-800 whitespace-pre-wrap break-words min-w-0"><div dangerouslySetInnerHTML={{ __html: processedMainQuestionText(activeQuestion.mainQuestionText) }} /></div></div></CardContent></Card>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {isAIGradingMode ? (
                <Card className="border-none shadow-md"><CardHeader><CardTitle className="text-lg">Your Answer</CardTitle><CardDescription>Upload a clear photo of your solution for AI grading.</CardDescription></CardHeader><CardContent className="space-y-6"><AIAnswerUploader questionId={activeQuestion.id} isGrading={isAiGrading} savedImage={aiImages[activeQuestion.id]} onImageSelected={(file) => setAiImages(prev => ({ ...prev, [activeQuestion.id]: file }))} disabled={isQuestionGraded} />
                  {isQuestionGraded && (<div className="animate-in fade-in slide-in-from-bottom-2 space-y-6"><AIRubricBreakdown rubric={activeQuestion.aiRubric || {}} breakdown={(currentResult as any)?.aiBreakdown || {}} maxMarks={qMaxMarks} />{currentFeedback && (<div className="bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm overflow-hidden"><div className="bg-indigo-50/50 dark:bg-indigo-950/30 px-4 py-3 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-600" /><h4 className="font-semibold text-sm text-indigo-900 dark:text-indigo-200">AI Feedback</h4></div><div className="p-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"><ReactMarkdown components={{ strong: ({ node, ...props }) => <span className="font-bold text-indigo-700 dark:text-indigo-400" {...props} />, ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />, li: ({ node, ...props }) => <li className="pl-1" {...props} />, p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} /> }}>{currentFeedback}</ReactMarkdown></div></div>)}</div>)}
                  {!isQuestionGraded && (<div className="flex justify-end pt-2"><Button onClick={() => handleAICheck(activeQuestion)} disabled={isAiGrading} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20 w-full sm:w-auto" size="lg">{isAiGrading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="mr-2 h-4 w-4" /> Grade My Answer</>}</Button></div>)}
                </CardContent></Card>
              ) : (<QuestionRunner key={activeQuestion.id} question={activeQuestion} onAnswerSubmit={(subQuestionId, answer) => setAnswers(prev => ({ ...prev, [subQuestionId]: { answer } }))} onResultCalculated={(subQuestionId, isCorrect) => setResults((prev: ResultState) => ({ ...prev, [subQuestionId]: { isCorrect } }))} initialAnswers={answers} />)}
            </div>
          </div>
        </main>
        <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t flex justify-center z-40"><div className="w-full max-w-4xl flex justify-between items-center gap-3 sm:gap-0"><Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0} className="flex-1 sm:flex-none sm:w-32"><ArrowLeft className="mr-2 h-4 w-4" /> <span className="sr-only sm:not-sr-only">Previous</span> <span className="sm:hidden">Prev</span></Button><div className="text-xs text-muted-foreground hidden sm:block">{currentQuestionIndex + 1} / {orderedQuestions.length}</div>{isLastQuestion ? (<Button onClick={handleFinish} className="flex-1 sm:flex-none sm:w-32 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20"><CheckCircle className="mr-2 h-4 w-4" /> Finish</Button>) : (<Button onClick={handleNext} className="flex-1 sm:flex-none sm:w-32 shadow-lg shadow-primary/20">Next <ArrowRight className="ml-2 h-4 w-4" /></Button>)}</div></div>
      </div>
    </>
  );
}