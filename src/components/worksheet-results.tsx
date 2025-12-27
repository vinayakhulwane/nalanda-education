'use client';

import type { Question, SubQuestion, Worksheet, CurrencyType, WorksheetAttempt, ResultState, EconomySettings } from "@/types";
import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { Timer, CheckCircle, XCircle, Award, Sparkles, Coins, Crown, Gem, Home, Loader2, ExternalLink, FileImage } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { calculateAttemptRewards } from "@/lib/wallet";
import confetti from "canvas-confetti";

export type AnswerState = {
  [subQuestionId: string]: {
    answer: any;
  };
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

// 1. Currency Icons
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

// 2. Helper to clean text
const processedMainQuestionText = (text: string) => {
    if (!text) return '';
    return text.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ');
};

const formatCriterionKey = (key: string) => {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
};

// 3. "Smart" Rubric Table with Progress Bars
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
                                    <div className="p-1.5 bg-primary/10 rounded text-primary">
                                       {criterion.toLowerCase().includes('understanding') && <Sparkles className="h-3 w-3"/>}
                                       {criterion.toLowerCase().includes('formula') && <FileImage className="h-3 w-3"/>}
                                       {criterion.toLowerCase().includes('calculation') && <Timer className="h-3 w-3"/>}
                                       {!['understanding', 'formula', 'calculation'].some(s => criterion.toLowerCase().includes(s)) && <Award className="h-3 w-3"/>}
                                    </div>
                                    <span className="font-semibold">{criterion}</span>
                                    <span className="text-muted-foreground text-[10px]">({weightPct}%)</span>
                                </div>
                                <div className="font-mono font-bold">
                                    <span className={percentageScore < 50 ? "text-red-500" : "text-green-600"}>
                                        {earnedCategoryMarks.toFixed(2)}
                                    </span>
                                    <span className="text-muted-foreground ml-1">/ {maxCategoryMarks.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div 
                                    className={cn(
                                        "h-full transition-all duration-1000 ease-out",
                                        percentageScore < 40 ? "bg-red-500" : percentageScore < 70 ? "bg-amber-500" : "bg-green-500"
                                    )}
                                    style={{ width: `${percentageScore}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// 4. Standard Answer Helper
const getAnswerText = (subQuestion: SubQuestion, answer: any) => {
  if (answer === null || answer === undefined || answer === '') return 'Not Answered';
  switch (subQuestion.answerType) {
    case 'numerical':
    case 'text':
      return answer.toString();
    case 'mcq':
      const optionMap = new Map(subQuestion.mcqAnswer?.options.map(o => [o.id, o.text]));
      if (subQuestion.mcqAnswer?.isMultiCorrect) {
        const answers = (answer as string[] || []);
        if (answers.length === 0) return 'Not Answered';
        return answers.map(id => optionMap.get(id)).join(', ');
      }
      return optionMap.get(answer) || 'N/A';
    default:
      return 'N/A';
  }
}

const getCorrectAnswerText = (subQ: SubQuestion) => {
  switch (subQ.answerType) {
    case 'numerical':
      const { correctValue, baseUnit } = subQ.numericalAnswer || {};
      if (!baseUnit || baseUnit.toLowerCase() === 'unitless') return `${correctValue ?? 'N/A'}`;
      return `${correctValue ?? 'N/A'}${baseUnit ? ` ${baseUnit}` : ''}`;
    case 'text': return subQ.textAnswer?.keywords.join(', ') || 'N/A';
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
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(isReview || attempt?.rewardsClaimed);

  // Settings & Score Calculation
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
  const { data: settings } = useDoc<EconomySettings>(settingsRef);

  const { totalMarks, score, calculatedRewards } = useMemo(() => {
    let totalMarks = 0;
    let score = 0;

    questions.forEach(q => {
      const isAiGraded = q.gradingMode === 'ai';
      q.solutionSteps.forEach(step => {
        step.subQuestions.forEach(subQ => {
          totalMarks += subQ.marks;
          const result = results[subQ.id];
          if (!result) return;
          
          // --- THIS IS THE FIX ---
          // For AI questions, 'result.score' now holds the CORRECT calculated marks (not a percentage).
          // For System questions, 'result.score' is undefined, so we use the old logic.
          if (isAiGraded && typeof result.score === 'number') {
              score += result.score;
          } else if (result.isCorrect) {
              score += subQ.marks;
          }
        });
      });
    });

    const calculatedRewards = user?.uid 
        ? calculateAttemptRewards(worksheet, questions, results, user.uid, settings ?? undefined) 
        : {};

    return { totalMarks, score, calculatedRewards };
  }, [questions, results, worksheet, user?.uid, settings]);

  const triggerCelebration = () => {
    const count = 200;
    const defaults = { origin: { y: 0.7 }, zIndex: 1000 };
    function fire(particleRatio: number, opts: any) {
      confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
    }
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-4">
        <Button variant="outline" onClick={() => router.push(`/academics/${worksheet.classId}/${worksheet.subjectId}`)}>
          <Home className="mr-2 h-4 w-4" /> Back to Subject
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl text-center">{isReview ? 'Worksheet Review' : 'Worksheet Complete!'}</CardTitle>
          <CardDescription className="text-center">
            {worksheet.title}
            {attempt?.attemptedAt?.toDate && <span className="block text-xs mt-1">Attempted on: {format(attempt.attemptedAt.toDate(), 'PPpp')}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center my-6">
            {/* Stats Cards */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <Timer className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-2xl font-bold mt-2">{Math.floor(timeTaken / 60)}m {timeTaken % 60}s</p>
              <p className="text-xs text-muted-foreground">Time Taken</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <CheckCircle className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-2xl font-bold mt-2">{Number(score).toFixed(2)} / {totalMarks}</p>
              <p className="text-xs text-muted-foreground">Marks Scored</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <Award className="h-6 w-6 mx-auto text-muted-foreground" />
              <div className="flex justify-center items-center gap-3 mt-2">
                {calculatedRewards && Object.keys(calculatedRewards).length > 0 ? (
                  Object.entries(calculatedRewards).map(([currency, amount]) => {
                    if (!amount || amount === 0) return null;
                    const Icon = currencyIcons[currency];
                    const color = currencyColors[currency];
                    if (!Icon) return null;
                    return <div key={currency} className={cn("flex items-center gap-1 font-bold", color)}><Icon className="h-5 w-5" /><span>{Number(amount).toFixed(0)}</span></div>;
                  })
                ) : <p className="text-2xl font-bold">0</p>}
              </div>
              <p className="text-xs text-muted-foreground">Rewards Earned</p>
            </div>
          </div>

          <div className="mt-8 mb-6 relative flex justify-center">
            <Button
              className="w-full h-14 text-lg font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg transform hover:scale-105 transition-transform duration-200 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
              onClick={handleClaimRewards}
              disabled={isClaiming || hasClaimed || !calculatedRewards || Object.values(calculatedRewards).every(a => a === 0)}
            >
              {isClaiming ? <Loader2 className="h-6 w-6 animate-spin" /> : hasClaimed ? 'Rewards Claimed' : 'Claim Rewards'}
            </Button>
          </div>

          <Separator className="my-8" />

          {/* Question Review Section */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-center">Question Review</h3>
            
            {questions.map((question, qIndex) => {
              if (question.gradingMode === 'ai') {
                  const firstSub = question.solutionSteps[0]?.subQuestions[0];
                  const result = results[firstSub?.id];
                  const breakdown = (result as any)?.aiBreakdown;
                  const feedback = result?.feedback;
                  const driveLink = answers[firstSub?.id]?.answer;
                  const qMaxMarks = question.solutionSteps.reduce((acc, s) => acc + s.subQuestions.reduce((ss, sq) => ss + sq.marks, 0), 0);

                  return (
                    <div key={question.id} className="border rounded-lg overflow-hidden">
                        <div className="bg-purple-50/50 dark:bg-purple-900/10 p-4 border-b">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-purple-600" />
                                <span className="text-xs font-bold uppercase tracking-wider text-purple-600">AI Assessment</span>
                            </div>
                            <div className="prose dark:prose-invert max-w-none text-sm font-medium">
                                <span className="mr-2 font-bold">Q{qIndex + 1}.</span>
                                <span dangerouslySetInnerHTML={{ __html: processedMainQuestionText(question.mainQuestionText) }} />
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            <AIRubricBreakdown rubric={question.aiRubric || null} breakdown={breakdown} maxMarks={qMaxMarks} />
                            {feedback && (
                                <div className="bg-muted/50 p-3 rounded-md text-sm">
                                    <p className="font-semibold text-purple-700 mb-1 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> AI Feedback</p>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{feedback}</p>
                                </div>
                            )}
                            {driveLink && (
                                <div className="flex justify-end">
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={driveLink} target="_blank" rel="noopener noreferrer">
                                            <FileImage className="mr-2 h-4 w-4 text-blue-500" />
                                            View My Original Solution
                                            <ExternalLink className="ml-2 h-3 w-3 opacity-50" />
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                  );
              }

              // Standard System Grading
              return (
                <div key={question.id}>
                  <div className="prose dark:prose-invert max-w-none p-4 bg-muted rounded-t-lg break-words">
                    <div className="flex gap-2">
                      <span className="font-bold">Q{qIndex + 1}.</span>
                      <div dangerouslySetInnerHTML={{ __html: processedMainQuestionText(question.mainQuestionText) }} />
                    </div>
                  </div>
                  <div className="border border-t-0 rounded-b-lg p-4 space-y-3">
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
                  </div>
                </div>
              )
            })}
          </div>

          <div className="text-center mt-8">
            <Button onClick={() => router.push(`/academics/${worksheet.classId}/${worksheet.subjectId}`)}>
              <Home className="mr-2 h-4 w-4" /> Back to Subject
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
