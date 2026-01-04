'use client';

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import type { Question, SubQuestion, Worksheet, WorksheetAttempt, EconomySettings, Class, Subject, CurrencyType } from "@/types";
import { useMemo, useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "./ui/card";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Timer, CheckCircle2, XCircle, Award, Sparkles, Coins, Crown, Gem, Home, Loader2, ExternalLink, ArrowLeft, Printer, Lock, Unlock, Zap, GraduationCap, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { calculateAttemptRewards } from "@/lib/wallet";
import confetti from "canvas-confetti";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generateSolutionAction } from '@/app/actions/ai-solution';
import { BrandLogo } from './brand-logo';

// --- TYPES ---
export type AnswerState = {
  [subQuestionId: string]: {
    answer: any;
  };
};

export type ResultState = {
  [subQuestionId: string]: {
    isCorrect: boolean;
    score?: number;
    feedback?: string;
  }
};

interface WorksheetResultsProps {
  worksheet: Worksheet;
  questions: Question[];
  answers: AnswerState;
  results: ResultState;
  timeTaken: number;
  isReview?: boolean;
  attempt?: WorksheetAttempt;
}

// --- HELPER COMPONENTS ---
const currencyIcons: Record<string, React.ElementType> = {
  coin: Coins,
  gold: Crown,
  diamond: Gem,
  spark: Sparkles,
  aiCredits: BrainCircuit,
};

const currencyColors: Record<string, string> = {
  spark: 'text-slate-500',
  coin: 'text-yellow-600 dark:text-yellow-400',
  gold: 'text-amber-600 dark:text-amber-400',
  diamond: 'text-blue-600 dark:text-blue-400',
  aiCredits: 'text-indigo-600 dark:text-indigo-400',
};

const currencyBg: Record<string, string> = {
  coin: 'bg-yellow-100 dark:bg-yellow-900/30',
  gold: 'bg-amber-100 dark:bg-amber-900/30',
  diamond: 'bg-blue-100 dark:bg-blue-900/30',
  spark: 'bg-slate-100 dark:bg-slate-800',
  aiCredits: 'bg-indigo-100 dark:bg-indigo-900/30',
}

const CurrencyDisplay = ({ type, amount }: { type: string, amount: number }) => {
  const Icon = currencyIcons[type] || Coins;
  const colorClass = currencyColors[type] || 'text-slate-500';
  const bgClass = currencyBg[type] || 'bg-slate-100';

  return (
    <span className={cn("inline-flex items-center gap-1 font-extrabold px-2 py-0.5 rounded-md bg-opacity-10 text-xs tracking-wide", colorClass, bgClass)}>
      <Icon className="h-3.5 w-3.5" /> {amount}
    </span>
  );
};

const processedMainQuestionText = (text: string) => {
  if (!text) return '';
  return text.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ');
};

const formatCriterionKey = (key: string) => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
};

const AIRubricBreakdown = ({ rubric, breakdown, maxMarks = 8 }: { rubric: Record<string, any> | null, breakdown: Record<string, number>, maxMarks?: number }) => {
  if (!breakdown || Object.keys(breakdown).length === 0) return null;
  const activeRubric = (rubric && Object.keys(rubric).length > 0)
    ? rubric
    : Object.keys(breakdown).reduce((acc, key) => ({ ...acc, [key]: "N/A" }), {} as Record<string, any>);

  return (
    <div className="space-y-4 my-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border animate-in fade-in duration-700">
      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
        <Zap className="h-3 w-3" /> Skill Breakdown
      </h4>
      <div className="space-y-4">
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
                  <span className="font-medium text-slate-700 dark:text-slate-300">{criterion}</span>
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 rounded text-muted-foreground">{weightPct}%</span>
                </div>
                <div className="font-mono font-bold text-xs">
                  <span className={percentageScore < 50 ? "text-red-500" : "text-green-600"}>{earnedCategoryMarks.toFixed(1)}</span>
                  <span className="text-muted-foreground ml-1 opacity-50">/ {maxCategoryMarks.toFixed(1)}</span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all duration-1000 ease-out rounded-full", percentageScore < 40 ? "bg-red-500" : percentageScore < 70 ? "bg-amber-500" : "bg-green-500")} style={{ width: `${percentageScore}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getAnswerText = (subQuestion: SubQuestion, answer: any) => {
  if (answer === null || answer === undefined || answer === '') return 'Not Answered';
  switch (subQuestion.answerType) {
    case 'numerical':
    case 'text': return answer.toString();
    case 'mcq':
      const optionMap = new Map(subQuestion.mcqAnswer?.options.map(o => [o.id, o.text]));
      if (subQuestion.mcqAnswer?.isMultiCorrect) {
        const answers = (answer as string[] || []);
        if (answers.length === 0) return 'Not Answered';
        return answers.map(id => optionMap.get(id)).join(', ');
      }
      return optionMap.get(answer) || 'N/A';
    default: return 'N/A';
  }
}

const getCorrectAnswerText = (subQ: SubQuestion) => {
  switch (subQ.answerType) {
    case 'numerical':
      const { correctValue, baseUnit } = subQ.numericalAnswer || {};
      if (!baseUnit || baseUnit.toLowerCase() === 'unitless') return `${correctValue ?? 'N/A'}`;
      return `${correctValue ?? 'N/A'}${baseUnit ? ` ${baseUnit}` : ''}`;
    case 'text': return subQ.textAnswerKeywords?.join(', ') || 'N/A';
    case 'mcq':
      return subQ.mcqAnswer?.options
        .filter(opt => subQ.mcqAnswer?.correctOptions.includes(opt.id))
        .map(opt => opt.text).join(', ') || 'N/A';
    default: return 'N/A';
  }
}

// --- MAIN COMPONENT ---
export function WorksheetResults({
  worksheet,
  questions,
  answers,
  results,
  timeTaken,
  isReview = false,
  attempt,
}: WorksheetResultsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { user, userProfile } = useUser();
  const { toast } = useToast();

  const from = searchParams.get('from');
  const studentId = searchParams.get('studentId');

  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(isReview || attempt?.rewardsClaimed);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadingSolutions, setLoadingSolutions] = useState<Record<string, boolean>>({});
  const [localUnlocked, setLocalUnlocked] = useState<Record<string, string>>(attempt?.unlockedSolutions || {});

  useEffect(() => {
    if (attempt?.unlockedSolutions) {
      setLocalUnlocked(prev => ({ ...prev, ...attempt.unlockedSolutions }));
    }
  }, [attempt]);

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
  const { data: settings } = useDoc<EconomySettings>(settingsRef);

  const classRef = useMemoFirebase(() => (firestore && worksheet ? doc(firestore, 'classes', worksheet.classId) : null), [firestore, worksheet]);
  const { data: classData } = useDoc<Class>(classRef);
  const subjectRef = useMemoFirebase(() => (firestore && worksheet ? doc(firestore, 'subjects', worksheet.subjectId) : null), [firestore, worksheet]);
  const { data: subjectData } = useDoc<Subject>(subjectRef);

  const { totalMarks, score, calculatedRewards } = useMemo(() => {
    let totalMarks = 0;
    let score = 0;

    questions.forEach(q => {
      const isAiGraded = q.gradingMode === 'ai';
      if (isAiGraded) {
        const qTotalMarks = q.solutionSteps.reduce((acc, s) => acc + s.subQuestions.reduce((ss, sq) => ss + sq.marks, 0), 0);
        totalMarks += qTotalMarks;
        const firstSubId = q.solutionSteps[0]?.subQuestions[0]?.id;
        const result = results[firstSubId];
        if (result) {
          let calculatedSum = 0;
          // @ts-ignore
          const breakdown = result.aiBreakdown || {};
          const rubric = q.aiRubric || {};
          if (Object.keys(breakdown).length > 0 && Object.keys(rubric).length > 0) {
            Object.entries(rubric).forEach(([key, weight]) => {
              const cleanKey = formatCriterionKey(key);
              // @ts-ignore
              const scoreVal = breakdown[key] ?? breakdown[cleanKey] ?? 0;
              const weightVal = typeof weight === 'string' ? parseFloat(weight) : (weight as number);
              calculatedSum += (scoreVal / 100) * (weightVal / 100) * qTotalMarks;
            });
            score += calculatedSum;
          } else {
            let val = Number((result as any).score || 0);
            if (val > qTotalMarks) val = (val / 100) * qTotalMarks;
            score += val;
          }
        }
      } else {
        q.solutionSteps.forEach(step => {
          step.subQuestions.forEach(subQ => {
            totalMarks += subQ.marks;
            if (results[subQ.id]?.isCorrect) score += subQ.marks;
          })
        });
      }
    });

    const calculatedRewards = user?.uid
      ? calculateAttemptRewards(worksheet, questions, results, user.uid, settings ?? undefined)
      : {};

    return { totalMarks, score, calculatedRewards };
  }, [questions, results, worksheet, user?.uid, settings]);

  const triggerCelebration = () => {
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
  };

  const handleClaimRewards = async () => {
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
          transactionPromises.push(addDoc(transactionsColRef, {
            userId: user.uid, type: 'earned', description: `Reward from worksheet: ${worksheet.title}`,
            amount: amount, currency: currency, createdAt: serverTimestamp()
          }));
        }
      }
      if (Object.keys(updatePayload).length > 0) await updateDoc(userRef, updatePayload);
      await updateDoc(attemptRef, { rewardsClaimed: true });
      await Promise.all(transactionPromises);
      triggerCelebration();
      toast({ title: "Rewards Claimed!", description: "Your wallet has been updated." });
      setHasClaimed(true);
    } catch (error) {
      console.error("Error claiming rewards:", error);
      toast({ variant: "destructive", title: "Claim Failed", description: "Could not update your wallet." });
    } finally {
      setIsClaiming(false);
    }
  }

  const handleGetSolution = async (question: Question) => {
    if (!user || !userProfile || !attempt?.id) return;

    const cost = settings?.solutionCost ?? 5;
    const currency = settings?.solutionCurrency ?? 'coin';

    // @ts-ignore
    const currentBalance = userProfile[currency === 'coin' ? 'coins' : currency === 'aiCredits' ? 'aiCredits' : currency] || 0;

    if (currentBalance < cost) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Funds',
        description: `You need ${cost} ${currency} to unlock this solution.`
      });
      return;
    }

    setLoadingSolutions(prev => ({ ...prev, [question.id]: true }));

    try {
      // Call Server Action
      const aiResponse = await generateSolutionAction({ questionText: question.mainQuestionText });

      // Robust check for failure
      if (!aiResponse || !aiResponse.success || !aiResponse.solution) {
        console.error("AI Generation Error Details:", JSON.stringify(aiResponse, null, 2));
        throw new Error(aiResponse?.error || "AI could not generate a solution.");
      }

      setLocalUnlocked(prev => ({ ...prev, [question.id]: aiResponse.solution }));

      const userRef = doc(firestore, 'users', user.uid);
      const attemptRef = doc(firestore, 'worksheet_attempts', attempt.id);
      const updatePayload: any = {};
      const fieldName = currency === 'coin' ? 'coins' : currency === 'aiCredits' ? 'aiCredits' : currency;

      updatePayload[fieldName] = increment(-cost);

      await updateDoc(userRef, updatePayload);

      await addDoc(collection(firestore, 'transactions'), {
        userId: user.uid,
        amount: cost,
        currency: currency,
        type: 'spent',
        description: `Unlocked solution for: ${question.name}`,
        createdAt: serverTimestamp()
      });

      await updateDoc(attemptRef, {
        [`unlockedSolutions.${question.id}`]: aiResponse.solution
      });

      toast({ title: 'Solution Unlocked!' });
    } catch (error: any) {
      console.error("handleGetSolution Error:", error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message || 'Could not unlock solution. Check console for details.'
      });

      setLocalUnlocked(prev => {
        const newState = { ...prev };
        delete newState[question.id];
        return newState;
      });
    } finally {
      setLoadingSolutions(prev => ({ ...prev, [question.id]: false }));
    }
  };

  const handleBackClick = () => {
    if (studentId) {
      router.push(`/user-management/${studentId}/progress`);
    } else if (from === 'progress') {
      router.push('/progress');
    } else {
      router.push(`/academics/${worksheet.classId}/${worksheet.subjectId}`);
    }
  };

  const handleDirectDownload = async () => {
    setIsDownloading(true);
    const reportElement = document.getElementById('printable-report-area');
    if (!reportElement) {
      toast({ variant: "destructive", title: "Download Failed", description: "Report element not found." });
      setIsDownloading(false);
      return;
    }

    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        scrollY: -window.scrollY,
        onclone: (clonedDoc) => {
          const doc = clonedDoc;
          doc.getElementById('printable-report-area')?.classList.remove('no-print');
          const printOnlyElements = doc.querySelectorAll('.print-only');
          printOnlyElements.forEach(el => (el as HTMLElement).style.display = 'block');
          const noPrintElements = doc.querySelectorAll('.no-print');
          noPrintElements.forEach(el => (el as HTMLElement).style.display = 'none');
          const animatedElements = doc.querySelectorAll('.animate-in');
          animatedElements.forEach(el => {
            el.classList.remove('animate-in', 'fade-in', 'duration-700', 'slide-in-from-bottom-2');
            (el as HTMLElement).style.opacity = '1';
            (el as HTMLElement).style.transform = 'none';
            (el as HTMLElement).style.animation = 'none';
            (el as HTMLElement).style.transition = 'none';
          });
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;

      let finalImgWidth = pdfWidth;
      let finalImgHeight = pdfWidth / ratio;

      if (finalImgHeight > pdfHeight) {
        finalImgHeight = pdfHeight;
        finalImgWidth = pdfHeight * ratio;
      }

      const x = (pdfWidth - finalImgWidth) / 2;
      const y = 0;

      pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight);
      pdf.save('worksheet-results.pdf');
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({ variant: "destructive", title: "Download Failed", description: "An error occurred while generating the PDF." });
    } finally {
      setIsDownloading(false);
    }
  };

  const formattedDate = attempt?.attemptedAt?.toDate ? format(attempt.attemptedAt.toDate(), 'PPP p') : format(new Date(), 'PPP');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div id="printable-report-area" className="printable-area">
        <style jsx global>{`
                  @media print {
                      body { -webkit-print-color-adjust: exact; color-adjust: exact; }
                      .printable-area { box-shadow: none !important; border: none !important; padding: 0 !important; }
                      .no-print { display: none !important; }
                      .print-only { display: block !important; }
                      .page-break { page-break-after: always; }
                      .print-watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 10vw; font-weight: bold; color: rgba(100, 116, 139, 0.08); z-index: -1; pointer-events: none; text-align: center; }
                  }
              `}</style>

        <div className="print-watermark hidden print-only">
          <BrandLogo size={400} />
        </div>

        {/* --- BACK BUTTON --- */}
        <div className="no-print mb-6">
          <Button variant="ghost" onClick={handleBackClick} className="pl-0 hover:bg-transparent hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {from === 'progress' ? 'Back to Progress' : 'Back to Subject'}
          </Button>
        </div>

        {/* --- HERO HEADER --- */}
        <div className="relative mb-8 text-center sm:text-left">
          <div className="absolute top-0 right-0 hidden sm:block opacity-10">
            <GraduationCap className="h-32 w-32" />
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-primary">{worksheet.title}</h1>
            <p className="text-lg text-muted-foreground mt-2 flex items-center justify-center sm:justify-start gap-2">
              {isReview ? <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded text-sm font-semibold">Review</span> : <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded text-sm font-semibold">Completed</span>}
              <span className="opacity-50">•</span>
              <span>{formattedDate}</span>
            </p>
          </div>
        </div>

        {/* --- PRINT HEADER --- */}
        <div className="hidden print-only mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold mb-2">{worksheet.title} - Performance Report</h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <p>Student: {userProfile?.name}</p>
            <p>Class: {classData?.name} | Subject: {subjectData?.name}</p>
          </div>
        </div>

        {/* --- STAT CARDS GRID --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {/* 1. TIME CARD */}
          <Card className="border-none shadow-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Timer className="h-16 w-16" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription>Time Taken</CardDescription>
              <CardTitle className="text-3xl font-bold tracking-tight">
                {Math.floor(timeTaken / 60)}<span className="text-sm font-normal text-muted-foreground">m</span> {timeTaken % 60}<span className="text-sm font-normal text-muted-foreground">s</span>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* 2. SCORE CARD */}
          <Card className="border-none shadow-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-16 w-16" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription>Total Score</CardDescription>
              <CardTitle className="text-3xl font-bold tracking-tight text-primary">
                {Number(score).toFixed(1)} <span className="text-lg text-muted-foreground font-medium">/ {totalMarks}</span>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* 3. REWARDS CARD */}
          <Card className="border-none shadow-md bg-gradient-to-br from-white to-amber-50 dark:from-slate-900 dark:to-amber-950/20 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-amber-500">
              <Award className="h-16 w-16" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription>Rewards Earned</CardDescription>
              <div className="flex flex-wrap gap-3 mt-1">
                {calculatedRewards && Object.keys(calculatedRewards).length > 0 ? (
                  Object.entries(calculatedRewards).map(([currency, amount]) => {
                    if (!amount || amount === 0) return null;
                    const Icon = currencyIcons[currency];
                    const color = currencyColors[currency];
                    if (!Icon) return null;
                    return (
                      <div key={currency} className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-800 shadow-sm border", color)}>
                        <Icon className="h-4 w-4" />
                        <span className="font-bold text-lg">{Number(amount).toFixed(0)}</span>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground">0</span>
                )}
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* --- ACTION BUTTONS (CLAIM / DOWNLOAD) --- */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10 no-print">
          <Button
            size="lg"
            className={cn(
              "flex-1 h-14 text-lg font-bold shadow-lg transition-all duration-300",
              hasClaimed
                ? "bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed hover:bg-slate-100"
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white hover:shadow-amber-500/25 hover:scale-[1.02]"
            )}
            onClick={handleClaimRewards}
            disabled={isClaiming || hasClaimed || !calculatedRewards || Object.values(calculatedRewards).every(a => a === 0)}
          >
            {isClaiming ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : hasClaimed ? (
              <>
                <CheckCircle2 className="mr-2 h-6 w-6" /> Rewards Claimed
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-6 w-6" /> Claim Rewards
              </>
            )}
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={handleDirectDownload}
            disabled={isDownloading}
            className="flex-1 h-14 text-lg border-2 hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            {isDownloading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Printer className="mr-2 h-5 w-5" />}
            Export Report
          </Button>
        </div>

        <Separator className="my-8" />

        {/* --- QUESTIONS LIST --- */}
        <div className="space-y-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px bg-border flex-1 max-w-[100px]" />
            <h3 className="text-xl font-bold text-center uppercase tracking-wider text-muted-foreground">Detailed Review</h3>
            <div className="h-px bg-border flex-1 max-w-[100px]" />
          </div>

          {questions.map((question, qIndex) => {
            const unlockedSolution = localUnlocked[question.id] || attempt?.unlockedSolutions?.[question.id];
            const cost = settings?.solutionCost ?? 5;
            const currency = settings?.solutionCurrency ?? 'coin';
            const isSolutionLoading = loadingSolutions[question.id];

            if (question.gradingMode === 'ai') {
              const firstSub = question.solutionSteps[0]?.subQuestions[0];
              const result = results[firstSub?.id];
              // @ts-ignore
              const breakdown = result?.aiBreakdown;
              // @ts-ignore
              const feedback = result?.feedback;
              const driveLink = answers[firstSub?.id]?.answer;
              const qMaxMarks = question.solutionSteps.reduce((acc, s) => acc + s.subQuestions.reduce((ss, sq) => ss + sq.marks, 0), 0);

              return (
                <Card key={question.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-slate-50 dark:bg-slate-900 border-b p-5">
                    <div className="flex gap-3">
                      <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                        {qIndex + 1}
                      </span>
                      <div className="prose dark:prose-invert max-w-none prose-p:my-1">
                        <div dangerouslySetInnerHTML={{ __html: processedMainQuestionText(question.mainQuestionText) }} />
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-5 space-y-6">
                    <AIRubricBreakdown rubric={question.aiRubric || null} breakdown={breakdown} maxMarks={qMaxMarks} />
                    {feedback && (
                      <div className="relative overflow-hidden rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-900 p-5">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                          <Sparkles className="h-24 w-24 text-purple-600" />
                        </div>
                        <div className="relative z-10 flex gap-4">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg h-fit shrink-0">
                            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-purple-900 dark:text-purple-300">AI Feedback</h4>
                            <div className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed">
                              <ReactMarkdown rehypePlugins={[rehypeRaw]}>{feedback}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {driveLink && (
                      <div className="flex justify-end">
                        <a href={driveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors no-print px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>View Original Upload</span>
                        </a>
                      </div>
                    )}
                    {unlockedSolution ? (
                      <div className="relative overflow-hidden rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-5 animate-in slide-in-from-bottom-2">
                        <div className="relative z-10 space-y-3">
                          <h4 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                            <Unlock className="h-4 w-4" /> Expert Solution
                          </h4>
                          <div className="text-sm text-slate-700 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{unlockedSolution}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end no-print pt-2">
                        <Button
                          variant="outline"
                          onClick={() => handleGetSolution(question)}
                          disabled={isSolutionLoading}
                          className="border-primary/20 bg-primary/5 hover:bg-primary hover:text-primary-foreground text-primary gap-2 shadow-sm h-auto py-2 px-4 transition-colors"
                        >
                          {isSolutionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3.5 w-3.5 opacity-70" />}
                          Unlock Expert Solution
                          <CurrencyDisplay type={currency} amount={cost} />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={question.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-slate-50 dark:bg-slate-900 border-b p-5">
                  <div className="flex gap-3">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm shrink-0">
                      {qIndex + 1}
                    </span>
                    <div className="prose dark:prose-invert max-w-none prose-p:my-1">
                      <div dangerouslySetInnerHTML={{ __html: processedMainQuestionText(question.mainQuestionText) }} />
                    </div>
                  </div>
                </div>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {question.solutionSteps.flatMap(step => step.subQuestions).map(subQ => {
                      const result = results[subQ.id];
                      const isCorrect = result?.isCorrect;
                      const studentAnswer = answers[subQ.id]?.answer;

                      return (
                        <div key={subQ.id} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                          <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="prose-sm dark:prose-invert max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: subQ.questionText }} />
                            </div>
                            <div className="shrink-0">
                              <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", isCorrect ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200")}>
                                {isCorrect ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                {isCorrect ? `${subQ.marks}/${subQ.marks}` : `0/${subQ.marks}`}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg">
                              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-1">Your Answer</span>
                              <span className="font-medium">{getAnswerText(subQ, studentAnswer)}</span>
                            </div>
                            {!isCorrect && (
                              <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 rounded-lg">
                                <span className="text-xs font-bold uppercase text-green-600 tracking-wider block mb-1">Correct Answer</span>
                                <span className="font-medium text-green-800 dark:text-green-300">{getCorrectAnswerText(subQ)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="p-5 bg-slate-50/30 dark:bg-slate-900/30 border-t">
                    {unlockedSolution ? (
                      <div className="relative overflow-hidden rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-5 animate-in slide-in-from-bottom-2">
                        <div className="relative z-10 space-y-3">
                          <h4 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                            <Unlock className="h-4 w-4" /> Expert Solution
                          </h4>
                          <div className="text-sm text-slate-700 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{unlockedSolution}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end no-print">
                        <Button
                          variant="outline"
                          onClick={() => handleGetSolution(question)}
                          disabled={isSolutionLoading}
                          className="border-primary/20 bg-primary/5 hover:bg-primary hover:text-primary-foreground text-primary gap-2 shadow-sm h-auto py-2 px-4 transition-colors"
                        >
                          {isSolutionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3.5 w-3.5 opacity-70" />}
                          Unlock Expert Solution
                          <CurrencyDisplay type={currency} amount={cost} />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12 mb-8 no-print">
          <p className="text-muted-foreground mb-4 text-sm">Great job reviewing your work!</p>
          <Button onClick={handleBackClick} variant="ghost">
            <Home className="mr-2 h-4 w-4" />
            {from === 'progress' ? 'Return to Progress' : 'Return to Subject Dashboard'}
          </Button>
        </div>
      </div>
    </div>
  );
}