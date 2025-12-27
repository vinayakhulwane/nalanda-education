'use client';
import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query, where, documentId, updateDoc, arrayUnion, addDoc, serverTimestamp, getDocs, limit, orderBy } from 'firebase/firestore';
import type { Worksheet, Question, WorksheetAttempt, ResultState } from '@/types';
import { 
  Loader2, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Timer, 
  X, 
  Sparkles, 
  FileImage, 
  Award 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionRunner } from '@/components/question-runner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { WorksheetResults, type AnswerState } from '@/components/worksheet-results';
import { AIAnswerUploader } from '@/components/solve/ai-answer-uploader';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Helper Formatters
function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

const processedMainQuestionText = (text: string) => {
    if (!text) return '';
    return text.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ');
};

const formatCriterionKey = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
};

// --- RUBRIC COMPONENT (Visual Bars & Decimals) ---
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
                    // Handle case mismatch or raw key
                    const percentageScore = breakdown[rawKey] ?? breakdown[criterion] ?? 0; 
                    const weightPct = typeof rawWeight === 'string' ? parseFloat(rawWeight) : (rawWeight as number);
                    
                    // MATH: (AI Score / 100) * (Weight / 100) * Total Question Marks
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

  // Firestore Refs
  const worksheetRef = useMemoFirebase(() => (firestore && worksheetId ? doc(firestore, 'worksheets', worksheetId) : null), [firestore, worksheetId]);
  const { data: worksheet, isLoading: isWorksheetLoading } = useDoc<Worksheet>(worksheetRef);

  const questionsQuery = useMemoFirebase(() => {
    if (!firestore || !worksheet?.questions || worksheet.questions.length === 0) return null;
    return query(collection(firestore, 'questions'), where(documentId(), 'in', worksheet.questions.slice(0,30)));
  }, [firestore, worksheet?.questions]);
  const { data: questions, isLoading: areQuestionsLoading } = useCollection<Question>(questionsQuery);
  
  // Existing Attempt Check
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
                    setIsFinished(true);
                }
            } catch (error) { console.error("Error fetching past attempt:", error); }
        }
    };
    checkExistingAttempt();
  }, [user, firestore, worksheetId, userProfile?.completedWorksheets]);

  // Order Questions
  const orderedQuestions = useMemo(() => {
    if (!worksheet?.questions || !questions) return [];
    const questionsMap = new Map(questions.map(q => [q.id, q]));
    return worksheet.questions.map(id => questionsMap.get(id)).filter(Boolean) as Question[];
  }, [worksheet?.questions, questions]);

  // ✅ TIMER LOGIC: +40s for AI
  const { totalMarks, totalDuration } = useMemo(() => {
    if (!orderedQuestions) return { totalMarks: 0, totalDuration: 0 };
    
    let marks = 0;
    let duration = 0;

    orderedQuestions.forEach((question) => {
        const qMarks = question.solutionSteps?.reduce((stepSum, step) => stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
        marks += qMarks;

        let qTime = qMarks > 0 ? qMarks * 20 : 60;

        if (question.gradingMode === 'ai') {
            qTime += 40;
        }

        duration += qTime;
    });

    return { totalMarks: marks, totalDuration: duration };
  }, [orderedQuestions]);

  const [timeLeft, setTimeLeft] = useState(totalDuration);
  const [startTime, setStartTime] = useState<Date | null>(null);

   useEffect(() => { 
       if (totalDuration > 0 && !startTime) setTimeLeft(totalDuration); 
   }, [totalDuration, startTime]);

   useEffect(() => {
    if (startTime && !isFinished) {
       if (timeLeft <= 0) { handleFinish(); return; }
       
       const timerId = setInterval(() => {
           setTimeLeft(prev => Math.max(0, prev - 1));
       }, 1000);
       return () => clearInterval(timerId);
    }
  }, [timeLeft, startTime, isFinished]);

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

  // ✅ FIXED: SUMMATION LOGIC FOR SCORING
  const handleAICheck = async (question: Question) => {
    const imageFile = aiImages[question.id];
    if (!imageFile) {
        toast({ variant: 'destructive', title: "Solution Required", description: "Please upload a photo first." });
        return;
    }
    setIsAiGrading(true);
    
    try {
        console.log("🚀 STARTING AI CHECK (FINAL V3)...");

        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('questionText', question.mainQuestionText);
        
        // Calculate max marks
        const qMaxMarks = question.solutionSteps.reduce((acc, s) => acc + s.subQuestions.reduce((ss, sq) => ss + sq.marks, 0), 0);
        formData.append('totalMarks', qMaxMarks.toString());

        const rubricToSend = question.aiRubric || { "General Accuracy": "100%" };
        formData.append('rubric', JSON.stringify(rubricToSend));

        const response = await fetch('/api/grade', { method: 'POST', body: formData });
        if (!response.ok) throw new Error("API call failed");
        
        const aiResult = await response.json();
        const subQuestionIds = question.solutionSteps.flatMap(s => s.subQuestions).map(sq => sq.id);
        const newResults: ResultState = {};
        const newAnswers: AnswerState = {};
        
        // ✅ CALCULATION: Exact Sum of Rubric Parts
        // (Matches your Visual Component Logic)
        let calculatedSum = 0;
        const rubric = question.aiRubric || {};
        const breakdown = aiResult.breakdown || {};

        if (Object.keys(rubric).length > 0) {
            Object.entries(rubric).forEach(([key, weight]) => {
                const cleanKey = formatCriterionKey(key);
                // Try both key formats to be safe
                const scoreVal = breakdown[key] ?? breakdown[cleanKey] ?? 0;
                
                const weightVal = typeof weight === 'string' ? parseFloat(weight) : (weight as number);
                
                // Formula: (Score% / 100) * (Weight% / 100) * TotalMarks
                const partMarks = (scoreVal / 100) * (weightVal / 100) * qMaxMarks;
                calculatedSum += partMarks;
            });
        } else {
            // Fallback only if no rubric exists
            calculatedSum = (parseFloat(aiResult.totalScore) / 100) * qMaxMarks;
        }

        // Round to 2 decimals
        const finalActualMarks = Math.round(calculatedSum * 100) / 100;

        console.log(`🧮 CALCULATION: Summed Score = ${finalActualMarks} / ${qMaxMarks}`);

        subQuestionIds.forEach(id => {
            newResults[id] = {
                // Correct if score > 50% of total
                isCorrect: finalActualMarks >= (qMaxMarks / 2),
                score: finalActualMarks, 
                feedback: aiResult.feedback,
                aiBreakdown: aiResult.breakdown 
            } as any; 
            
            newAnswers[id] = { answer: aiResult.driveLink };
        });

        setResults(prev => ({ ...prev, ...newResults }));
        setAnswers(prev => ({ ...prev, ...newAnswers }));
        
        toast({ 
            title: "Grading Complete!", 
            description: `Summed Score: ${finalActualMarks.toFixed(2)} / ${qMaxMarks}` 
        });

    } catch (error: any) {
        console.error("AI Grading Error", error);
        toast({ variant: 'destructive', title: "Grading Failed", description: error.message });
    } finally {
        setIsAiGrading(false);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!worksheet || orderedQuestions.length === 0) return <div className="text-center py-10"><p>Worksheet could not be loaded.</p><Button variant="link" onClick={() => router.back()}>Go Back</Button></div>;

  const activeQuestion = orderedQuestions[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex + 1) / orderedQuestions.length) * 100;
  const isLastQuestion = currentQuestionIndex === orderedQuestions.length - 1;

  if (isFinished) return <WorksheetResults worksheet={worksheet} questions={orderedQuestions} answers={answers} results={results} timeTaken={timeTaken} attempt={attempt ?? undefined} />;

  if (!startTime) return (
        <div className="flex flex-col h-screen p-4 sm:p-6 lg:p-8 items-center justify-center">
             <Card className="max-w-2xl text-center">
                <CardHeader>
                    <CardTitle>{worksheet.title}</CardTitle>
                    <CardDescription>Ready? {formatTime(totalDuration)} for {orderedQuestions.length} questions.</CardDescription>
                </CardHeader>
                <CardContent><Button size="lg" onClick={handleStart}>Start Attempt</Button></CardContent>
            </Card>
        </div>
  );

  const isAIGradingMode = activeQuestion.gradingMode === 'ai';
  const isQuestionGraded = activeQuestion.solutionSteps.some(step => step.subQuestions.some(sq => results[sq.id]));
  const currentResult = isQuestionGraded ? results[activeQuestion.solutionSteps[0]?.subQuestions[0]?.id] : null;
  const currentFeedback = currentResult?.feedback;
  const qMaxMarks = activeQuestion.solutionSteps.reduce((acc, s) => acc + s.subQuestions.reduce((ss, sq) => ss + sq.marks, 0), 0);

  return (
    <div className="flex flex-col h-screen p-4 sm:p-6 lg:p-8">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b h-16 flex items-center px-6">
            <div className="ml-auto flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-muted-foreground" />
                    <span className="text-lg font-semibold font-mono">{formatTime(timeLeft)}</span>
                </div>
                <Button variant="destructive" onClick={handleFinish}><X className="mr-2" /> End Attempt</Button>
            </div>
        </header>

        <main className="flex-grow mt-16 flex flex-col">
            <Card className="flex-grow flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{worksheet.title}</CardTitle>
                                <CardDescription>Question {currentQuestionIndex + 1} of {orderedQuestions.length}</CardDescription>
                            </div>
                            {isAIGradingMode && <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold border border-purple-100"><Sparkles className="h-3 w-3" /> AI Graded</div>}
                        </div>
                        <Progress value={progressPercentage} className="mt-2" />
                    </CardHeader>
                    
                    <CardContent className="flex-grow overflow-y-auto">
                        <div className="mb-4 prose dark:prose-invert max-w-none w-full min-w-0 break-words whitespace-pre-wrap">
                            <div dangerouslySetInnerHTML={{ __html: processedMainQuestionText(activeQuestion.mainQuestionText) }} />
                        </div>

                        {isAIGradingMode ? (
                            <div className="space-y-6">
                                <AIAnswerUploader 
                                    questionId={activeQuestion.id}
                                    isGrading={isAiGrading}
                                    savedImage={aiImages[activeQuestion.id]}
                                    onImageSelected={(file) => setAiImages(prev => ({ ...prev, [activeQuestion.id]: file }))}
                                    disabled={isQuestionGraded}
                                />
                                
                                {isQuestionGraded && (
                                     <div className="animate-in fade-in slide-in-from-bottom-3 space-y-4">
                                        <div>
                                            <AIRubricBreakdown 
                                                rubric={activeQuestion.aiRubric || {}} 
                                                breakdown={(currentResult as any)?.aiBreakdown || {}} 
                                                maxMarks={qMaxMarks}
                                            />
                                        </div>

                                        {currentFeedback && (
                                            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-lg">
                                                <div className="flex items-start gap-3">
                                                    <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                                                    <div>
                                                        <h4 className="font-semibold text-purple-800">Feedback</h4>
                                                        <p className="text-sm text-purple-700 mt-1 whitespace-pre-wrap leading-relaxed">{currentFeedback}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                     </div>
                                )}

                                {!isQuestionGraded && (
                                    <div className="flex justify-end pt-4">
                                        <Button 
                                            onClick={() => handleAICheck(activeQuestion)} 
                                            disabled={isAiGrading}
                                            className="bg-purple-600 hover:bg-purple-700"
                                        >
                                            {isAiGrading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="mr-2 h-4 w-4" /> Check with AI (Sum)</>}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <QuestionRunner 
                                key={activeQuestion.id} 
                                question={activeQuestion}
                                onAnswerSubmit={(subQuestionId, answer) => setAnswers(prev => ({...prev, [subQuestionId]: { answer }}))}
                                onResultCalculated={(subQuestionId, isCorrect) => setResults((prev: ResultState) => ({...prev, [subQuestionId]: { isCorrect }}))}
                                initialAnswers={answers}
                            />
                        )}
                    </CardContent>

                    <CardFooter className="flex justify-between mt-auto border-t pt-6">
                        <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}><ArrowLeft className="mr-2 h-4 w-4" /> Previous</Button>
                        {isLastQuestion ? (
                            <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700"><CheckCircle className="mr-2 h-4 w-4" /> Finish Attempt</Button>
                        ) : (
                            <Button onClick={handleNext}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
                        )}
                    </CardFooter>
            </Card>
        </main>
    </div>
  );
}