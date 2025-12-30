'use client';
import ReactMarkdown from 'react-markdown';
import type { Question, SubQuestion, Worksheet, CurrencyType, WorksheetAttempt, EconomySettings, Class, Subject } from "@/types";
import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Timer, CheckCircle, XCircle, Award, Sparkles, Coins, Crown, Gem, Home, Loader2, ExternalLink, FileImage, ArrowLeft, Printer, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { calculateAttemptRewards } from "@/lib/wallet";
import confetti from "canvas-confetti";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generateSolutionAction } from '@/app/actions/ai-solution'; // Ensure this file exists

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

const currencyIcons: Record<string, React.ElementType> = {
  coin: Coins,
  gold: Crown,
  diamond: Gem,
  spark: Sparkles,
};

const currencyColors: Record<string, string> = {
  spark: 'text-gray-400',
  coin: 'text-yellow-500',
  gold: 'text-amber-500',
  diamond: 'text-blue-500',
};

// Helper for display
const CurrencyDisplay = ({ type, amount }: { type: string, amount: number }) => {
    const Icon = currencyIcons[type] || Coins;
    return (
        <span className={cn("flex items-center gap-1 font-bold", currencyColors[type])}>
            <Icon className="h-3 w-3" /> {amount}
        </span>
    );
};

// ... (Rest of your existing helper functions: processedMainQuestionText, formatCriterionKey, AIRubricBreakdown, getAnswerText, getCorrectAnswerText - keep them as they were) ...
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
        <div className="space-y-4 my-6 animate-in fade-in duration-700">
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Skill Assessment Breakdown</h4>
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
                                    <span className="font-semibold">{criterion}</span>
                                    <span className="text-muted-foreground text-[10px]">({weightPct}%)</span>
                                </div>
                                <div className="font-mono font-bold">
                                    <span className={percentageScore < 50 ? "text-red-500" : "text-green-600"}>{earnedCategoryMarks.toFixed(2)}</span>
                                    <span className="text-muted-foreground ml-1">/ {maxCategoryMarks.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div className={cn("h-full transition-all duration-1000 ease-out", percentageScore < 40 ? "bg-red-500" : percentageScore < 70 ? "bg-amber-500" : "bg-green-500")} style={{ width: `${percentageScore}%` }} />
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
  
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
  const { data: settings } = useDoc<EconomySettings>(settingsRef);
  
  // Data for PDF Header
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
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
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

  // === NEW: Handle Get Solution ===
  const handleGetSolution = async (question: Question) => {
      if (!user || !userProfile || !attempt?.id) return;
      
      const cost = settings?.solutionCost ?? 5; // Default flat cost
      const currency = settings?.solutionCurrency ?? 'coin'; // Default currency

      // @ts-ignore
      const currentBalance = userProfile[currency === 'coin' ? 'coins' : currency === 'gold' ? 'gold' : 'diamonds'] || 0;

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
          // 1. Generate Solution
          const aiResponse = await generateSolutionAction({ questionText: question.mainQuestionText });
          if (!aiResponse.success || !aiResponse.solution) throw new Error("Failed to generate solution");

          // 2. Deduct Currency
          const userRef = doc(firestore, 'users', user.uid);
          const attemptRef = doc(firestore, 'worksheet_attempts', attempt.id);
          const updatePayload: any = {};
          const fieldName = currency === 'coin' ? 'coins' : currency === 'gold' ? 'gold' : 'diamonds';
          updatePayload[fieldName] = increment(-cost);
          await updateDoc(userRef, updatePayload);

          // 3. Log Transaction
          await addDoc(collection(firestore, 'transactions'), {
              userId: user.uid, amount: cost, currency: currency,
              type: 'spent', description: `Unlocked solution for: ${question.name}`,
              createdAt: serverTimestamp()
          });

          // 4. Save to Attempt
          await updateDoc(attemptRef, {
              [`unlockedSolutions.${question.id}`]: aiResponse.solution
          });

          toast({ title: 'Solution Unlocked!' });
      } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not unlock solution.' });
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

  // ... (handleDirectDownload & handlePrint omitted for brevity, identical to your original code) ...
  const handleDirectDownload = async () => { /* ... existing code ... */ };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div id="printable-report-area" className="printable-area">
            {/* ... Existing Styles & Header ... */}
            
            <Card>
                <CardHeader>
                     {/* ... Existing Card Header ... */}
                </CardHeader>
                <CardContent>
                    {/* ... Existing Score Grid ... */}
                    {/* ... Existing Buttons (Claim / Print) ... */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-center">Question Review</h3>
                        
                        {questions.map((question, qIndex) => {
                            // Check if unlocked
                            // @ts-ignore
                            const unlockedSolution = attempt?.unlockedSolutions?.[question.id];
                            const cost = settings?.solutionCost ?? 5;
                            const currency = settings?.solutionCurrency ?? 'coin';
                            const isSolutionLoading = loadingSolutions[question.id];

                            // --- RENDER AI GRADED QUESTION ---
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
                                    <div key={question.id} className="border rounded-lg overflow-hidden">
                                        <div className="prose dark:prose-invert max-w-none p-4 bg-muted rounded-t-lg break-words border-b">
                                            <div className="flex gap-2">
                                                <span className="font-bold">Q{qIndex + 1}.</span>
                                                <div dangerouslySetInnerHTML={{ __html: processedMainQuestionText(question.mainQuestionText) }} />
                                            </div>
                                        </div>

                                        <div className="p-4 space-y-4">
                                            <AIRubricBreakdown rubric={question.aiRubric || null} breakdown={breakdown} maxMarks={qMaxMarks} />
                                            
                                            {feedback && (
                                                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-lg">
                                                    <div className="flex items-start gap-3">
                                                        <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-purple-800 mb-1">AI Feedback</h4>
                                                            <ReactMarkdown className="text-sm text-purple-800 leading-relaxed">{feedback}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center justify-between pt-2">
                                                 {driveLink && (
                                                    <a href={driveLink} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center text-muted-foreground hover:text-primary transition-colors no-print">
                                                        <ExternalLink className="h-3 w-3 mr-1" /> View Original Submission
                                                    </a>
                                                 )}
                                            </div>

                                            {/* === AI SOLUTION SECTION === */}
                                            {unlockedSolution ? (
                                                <div className="mt-4 p-4 bg-green-50/50 border border-green-100 rounded-lg animate-in fade-in">
                                                    <h4 className="font-semibold text-green-700 flex items-center gap-2 mb-2">
                                                        <Unlock className="h-4 w-4" /> Expert Solution
                                                    </h4>
                                                    <ReactMarkdown className="text-sm text-gray-700">{unlockedSolution}</ReactMarkdown>
                                                </div>
                                            ) : (
                                                <div className="mt-2 flex justify-end no-print">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => handleGetSolution(question)}
                                                        disabled={isSolutionLoading}
                                                        className="border-primary/20 hover:bg-primary/5 hover:text-primary gap-2"
                                                    >
                                                        {isSolutionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3 w-3 opacity-70" />}
                                                        Get Solution <span className="bg-muted px-1.5 py-0.5 rounded text-xs"><CurrencyDisplay type={currency} amount={cost} /></span>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }

                            // --- RENDER STANDARD QUESTION ---
                            return (
                                <div key={question.id} className="border rounded-lg overflow-hidden">
                                     <div className="prose dark:prose-invert max-w-none p-4 bg-muted rounded-t-lg break-words">
                                        <div className="flex gap-2">
                                            <span className="font-bold">Q{qIndex + 1}.</span>
                                            <div dangerouslySetInnerHTML={{ __html: processedMainQuestionText(question.mainQuestionText) }} />
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {question.solutionSteps.flatMap(step => step.subQuestions).map(subQ => {
                                            const result = results[subQ.id];
                                            const isCorrect = result?.isCorrect;
                                            const studentAnswer = answers[subQ.id]?.answer;
                                            return (
                                                <div key={subQ.id} className="p-3 border rounded-md text-sm">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="prose-sm dark:prose-invert max-w-none mb-2" dangerouslySetInnerHTML={{ __html: subQ.questionText }} />
                                                        </div>
                                                        <div className={`flex items-center gap-2 font-semibold text-sm ${isCorrect ? 'text-green-600' : 'text-destructive'}`}>
                                                            {isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                                            {isCorrect ? `${subQ.marks}/${subQ.marks}` : `0/${subQ.marks}`}
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded space-y-1">
                                                        <div>Your Answer: <span className="font-semibold">{getAnswerText(subQ, studentAnswer)}</span></div>
                                                        {!isCorrect && (
                                                            <div>Correct Answer: <span className="font-semibold">{getCorrectAnswerText(subQ)}</span></div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        {/* === AI SOLUTION SECTION (FOR MANUAL QS) === */}
                                        {unlockedSolution ? (
                                            <div className="mt-4 p-4 bg-green-50/50 border border-green-100 rounded-lg animate-in fade-in">
                                                <h4 className="font-semibold text-green-700 flex items-center gap-2 mb-2">
                                                    <Unlock className="h-4 w-4" /> Expert Solution
                                                </h4>
                                                <ReactMarkdown className="text-sm text-gray-700">{unlockedSolution}</ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className="mt-2 flex justify-end no-print">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => handleGetSolution(question)}
                                                    disabled={isSolutionLoading}
                                                    className="border-primary/20 hover:bg-primary/5 hover:text-primary gap-2"
                                                >
                                                    {isSolutionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3 w-3 opacity-70" />}
                                                    Get Solution <span className="bg-muted px-1.5 py-0.5 rounded text-xs"><CurrencyDisplay type={currency} amount={cost} /></span>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="text-center mt-8 no-print">
                         <Button onClick={handleBackClick}>
                            <Home className="mr-2 h-4 w-4" /> 
                            {from === 'progress' ? 'Back to Progress' : 'Back to Subject'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}