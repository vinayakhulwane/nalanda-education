'use client';
import ReactMarkdown from 'react-markdown';
import type { Question, SubQuestion, Worksheet, CurrencyType, WorksheetAttempt, EconomySettings, Class, Subject } from "@/types";
import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Timer, CheckCircle, XCircle, Award, Sparkles, Coins, Crown, Gem, Home, Loader2, ExternalLink, FileImage, ArrowLeft, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { calculateAttemptRewards } from "@/lib/wallet";
import confetti from "canvas-confetti";
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';


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

// Answer Helpers
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
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { user, userProfile } = useUser();
  const { toast } = useToast();
  
  const from = searchParams.get('from');

  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(isReview || attempt?.rewardsClaimed);
  
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
                const breakdown = (result as any).aiBreakdown || {};
                const rubric = q.aiRubric || {};

                if (Object.keys(breakdown).length > 0 && Object.keys(rubric).length > 0) {
                    Object.entries(rubric).forEach(([key, weight]) => {
                        const cleanKey = formatCriterionKey(key);
                        const scoreVal = breakdown[key] ?? breakdown[cleanKey] ?? 0;
                        const weightVal = typeof weight === 'string' ? parseFloat(weight) : (weight as number);
                        calculatedSum += (scoreVal / 100) * (weightVal / 100) * qTotalMarks;
                    });
                    score += calculatedSum;
                } else {
                    let val = Number(result.score || 0);
                    if (val > qTotalMarks) val = (val / 100) * qTotalMarks;
                    score += val;
                }
            }
        } else {
            q.solutionSteps.forEach(step => {
                step.subQuestions.forEach(subQ => {
                    totalMarks += subQ.marks;
                    if (results[subQ.id]?.isCorrect) {
                        score += subQ.marks;
                    }
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
  
  const handleBackClick = () => {
    if (from === 'progress') {
        router.push('/progress');
    } else {
        router.push(`/academics/${worksheet.classId}/${worksheet.subjectId}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto printable-area">
        {/* Print-only Styles */}
        <style jsx global>{`
            @media print {
                body {
                    -webkit-print-color-adjust: exact; /* Chrome, Safari */
                    color-adjust: exact; /* Firefox */
                }
                .printable-area {
                    box-shadow: none !important;
                    border: none !important;
                    padding: 0 !important;
                }
                .no-print {
                    display: none !important;
                }
                .print-only {
                    display: block !important;
                }
                .page-break {
                    page-break-after: always;
                }
                .print-watermark {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 10vw;
                    font-weight: bold;
                    color: rgba(100, 116, 139, 0.08); /* slate-500 with opacity */
                    z-index: -1;
                    pointer-events: none;
                    text-align: center;
                }
            }
        `}</style>

        {/* Watermark Element */}
        <div className="print-watermark hidden print-only">
            Nalanda Education
        </div>

        <div className="no-print mb-4">
            <Button variant="outline" onClick={handleBackClick}>
            <ArrowLeft className="mr-2 h-4 w-4" /> 
            {from === 'progress' ? 'Back to Progress' : 'Back to Subject'}
            </Button>
      </div>

       {/* Print-only Header */}
       <header className="hidden print-only mb-8 border-b pb-4">
            <h1 className="text-3xl font-bold">{worksheet.title} - Performance Report</h1>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <p><strong>Student:</strong> {userProfile?.name}</p>
                <p><strong>Class:</strong> {classData?.name}</p>
                <p><strong>Subject:</strong> {subjectData?.name}</p>
                <p><strong>Date:</strong> {format(new Date(), 'PP')}</p>
            </div>
      </header>

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

          <div className="mt-8 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              className="w-full h-12 text-lg font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg transform hover:scale-105 transition-transform duration-200 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed no-print"
              onClick={handleClaimRewards}
              disabled={isClaiming || hasClaimed || !calculatedRewards || Object.values(calculatedRewards).every(a => a === 0)}
            >
              {isClaiming ? <Loader2 className="h-6 w-6 animate-spin" /> : hasClaimed ? 'Rewards Claimed' : 'Claim Rewards'}
            </Button>
            <Button variant="outline" className="w-full h-12 text-lg no-print" onClick={handlePrint}>
                <Printer className="mr-2 h-5 w-5" /> Export to PDF
            </Button>
          </div>

          <Separator className="my-8" />

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
                        <div className="prose dark:prose-invert max-w-none p-4 bg-muted rounded-t-lg break-words border-b">
                            <div className="flex gap-2">
                                <span className="font-bold">Q{qIndex + 1}.</span>
                                <div dangerouslySetInnerHTML={{ __html: processedMainQuestionText(question.mainQuestionText) }} />
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            <AIRubricBreakdown 
                                rubric={question.aiRubric || null} 
                                breakdown={breakdown} 
                                maxMarks={qMaxMarks} 
                            />
        
                            {feedback && (
                                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-purple-800 mb-1">AI Feedback</h4>
                                            
                                            <div className="text-sm text-purple-800 leading-relaxed">
                                                <ReactMarkdown
                                                    components={{
                                                        strong: ({node, ...props}) => <span className="font-bold text-purple-900" {...props} />,
                                                        ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 mt-1" {...props} />,
                                                        li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />
                                                    }}
                                                >
                                                    {feedback}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
        
                            {driveLink && (
                                <div className="flex justify-end pt-2">
                                    <a 
                                        href={driveLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs flex items-center text-muted-foreground hover:text-primary transition-colors no-print"
                                    >
                                        <ExternalLink className="h-3 w-3 mr-1" /> View Original Submission
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                );
            }

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

          <div className="text-center mt-8 no-print">
            <Button onClick={handleBackClick}>
              <Home className="mr-2 h-4 w-4" /> 
               {from === 'progress' ? 'Back to Progress' : 'Back to Subject'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
