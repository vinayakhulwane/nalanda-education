'use client';

import type { Question, SubQuestion, Worksheet, CurrencyType, WorksheetAttempt, ResultState, EconomySettings } from "@/types"; // ✅ Added EconomySettings
import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { Timer, CheckCircle, XCircle, Award, Sparkles, Coins, Crown, Gem, Home, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"; // ✅ Added Hooks
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { calculateAttemptRewards } from "@/lib/wallet";

// ✅ Explicitly export AnswerState so 'solve/page.tsx' can import it
export type AnswerState = {
  [subQuestionId: string]: {
    answer: any; // Using 'any' to support text, number, or array (MCQ)
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
      if (!baseUnit || baseUnit.toLowerCase() === 'unitless') {
        return `${correctValue ?? 'N/A'}`;
      }
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
  const [isBlasting, setIsBlasting] = useState(false);

  // ✅ 1. FETCH REAL SETTINGS
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
  const { data: settings } = useDoc<EconomySettings>(settingsRef);

  const { totalMarks, score, calculatedRewards } = useMemo(() => {
    let totalMarks = 0;
    let score = 0;

    questions.forEach(q => {
      q.solutionSteps.forEach(step => {
        step.subQuestions.forEach(subQ => {
          totalMarks += subQ.marks;
          if (results[subQ.id]?.isCorrect) {
            score += subQ.marks;
          }
        })
      });
    });

    // ✅ 2. PASS SETTINGS TO CALCULATOR
    // We pass 'settings ?? undefined' to safely handle the loading state
    const calculatedRewards = user?.uid 
        ? calculateAttemptRewards(worksheet, questions, results, user.uid, settings ?? undefined) 
        : {};

    return { totalMarks, score, calculatedRewards };
  }, [questions, results, worksheet, user?.uid, settings]); // ✅ Added settings dependency

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
          // Map singular key (coin) to DB plural field (coins)
          const fieldMap: Record<string, string> = { coin: 'coins', gold: 'gold', diamond: 'diamonds' };
          
          if (fieldMap[currency]) {
            updatePayload[fieldMap[currency]] = increment(amount);
          }

          // Add a transaction log
          transactionPromises.push(addDoc(transactionsColRef, {
            userId: user.uid,
            type: 'earned',
            description: `Reward from worksheet: ${worksheet.title}`,
            amount: amount,
            currency: currency,
            createdAt: serverTimestamp()
          }));
        }
      }

      if (Object.keys(updatePayload).length > 0) {
        await updateDoc(userRef, updatePayload);
      }

      // Mark the attempt as claimed
      await updateDoc(attemptRef, { rewardsClaimed: true });

      // Execute all transaction logging promises
      await Promise.all(transactionPromises);

      setIsBlasting(true);
      setTimeout(() => setIsBlasting(false), 600);

      toast({
        title: "Rewards Claimed!",
        description: "Your wallet has been updated.",
      });
      setHasClaimed(true);

    } catch (error) {
      console.error("Error claiming rewards:", error);
      toast({
        variant: "destructive",
        title: "Claim Failed",
        description: "Could not update your wallet. Please try again later.",
      });
    } finally {
      setIsClaiming(false);
    }
  }

  const processedMainQuestionText = (questionText: string) => {
    if (!questionText) return '';
    return questionText.replace(/&nbsp;/g, ' ');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-4">
        <Button variant="outline" onClick={() => router.push(`/academics/${worksheet.classId}/${worksheet.subjectId}`)}>
          <Home className="mr-2 h-4 w-4" />
          Back to Subject
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl text-center">{isReview ? 'Worksheet Review' : 'Worksheet Complete!'}</CardTitle>
          <CardDescription className="text-center">
            {worksheet.title}
            {attempt?.attemptedAt?.toDate && (
              <span className="block text-xs mt-1">
                Attempted on: {format(attempt.attemptedAt.toDate(), 'PPpp')}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center my-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <Timer className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-2xl font-bold mt-2">{Math.floor(timeTaken / 60)}m {timeTaken % 60}s</p>
              <p className="text-xs text-muted-foreground">Time Taken</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <CheckCircle className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-2xl font-bold mt-2">{score} / {totalMarks}</p>
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
                    return (
                      <div key={currency} className={cn("flex items-center gap-1 font-bold", color)}>
                        <Icon className="h-5 w-5" />
                        <span>{amount}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-2xl font-bold">0</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Rewards Earned</p>
            </div>
          </div>

          <div className="mt-8 mb-6 relative flex justify-center">
            {isBlasting && Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-blast pointer-events-none"
                style={{
                  transform: `rotate(${(i / 12) * 360}deg) translateX(60px)`,
                  animationDelay: `${Math.random() * 0.1}s`,
                }}
              />
            ))}

            <Button
              className="w-full h-14 text-lg font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg transform hover:scale-105 transition-transform duration-200 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
              onClick={handleClaimRewards}
              disabled={isClaiming || hasClaimed || !calculatedRewards || Object.values(calculatedRewards).every(a => a === 0)}
            >
              {isClaiming ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : hasClaimed ? (
                'Rewards Claimed'
              ) : (
                'Claim Rewards'
              )}
            </Button>
          </div>

          <Separator className="my-8" />

          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-center">Question Review</h3>
            {questions.map((question, qIndex) => {
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
                              <div
                                className="prose-sm dark:prose-invert max-w-none mb-2"
                                dangerouslySetInnerHTML={{ __html: subQ.questionText }}
                              />
                            </div>
                            <div className={`flex items-center gap-2 font-semibold text-sm ${isCorrect ? 'text-green-600' : 'text-destructive'}`}>
                              {isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                              {isCorrect ? `${subQ.marks}/${subQ.marks}` : `0/${subQ.marks}`}
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded space-y-1">
                            <div>
                              Your Answer: <span className="font-semibold">{getAnswerText(subQ, studentAnswer)}</span>
                            </div>
                            {!isCorrect && (
                              <div>
                                Correct Answer: <span className="font-semibold">{getCorrectAnswerText(subQ)}</span>
                              </div>
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
              <Home className="mr-2 h-4 w-4" />
              Back to Subject
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}