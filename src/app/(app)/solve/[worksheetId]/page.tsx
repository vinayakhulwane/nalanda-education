'use client';
import ReactMarkdown from 'react-markdown';
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
  Award,
  Clock,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionRunner } from '@/components/question-runner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { WorksheetResults, type AnswerState } from '@/components/worksheet-results';
import { AIAnswerUploader } from '@/components/solve/ai-answer-uploader';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
        <div className="space-y-4 my-6 animate-in fade-in duration-700 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Skill Assessment
            </h4>
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
                                    {criterion.toLowerCase().includes('understanding') && <Sparkles className="h-3.5 w-3.5 text-indigo-500"/>}
                                    {criterion.toLowerCase().includes('formula') && <FileImage className="h-3.5 w-3.5 text-blue-500"/>}
                                    {criterion.toLowerCase().includes('calculation') && <Timer className="h-3.5 w-3.5 text-emerald-500"/>}
                                    {!['understanding', 'formula', 'calculation'].some(s => criterion.toLowerCase().includes(s)) && <CheckCircle className="h-3.5 w-3.5 text-slate-500"/>}
                                    
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{criterion}</span>
                                    <span className="text-muted-foreground text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">{weightPct}% Weight</span>
                                </div>
                                <div className="font-mono font-bold text-xs">
                                    <span className={percentageScore < 50 ? "text-red-500" : "text-emerald-600"}>
                                        {earnedCategoryMarks.toFixed(2)}
                                    </span>
                                    <span className="text-muted-foreground ml-1">/ {maxCategoryMarks.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className={cn(
                                        "h-full transition-all duration-1000 ease-out rounded-full",
                                        percentageScore < 40 ? "bg-red-500" : percentageScore < 70 ? "bg-amber-500" : "bg-emerald-500"
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

  // Timer Logic
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

  const handleAICheck = async (question: Question) => {
    const imageFile = aiImages[question.id];
    if (!imageFile) {
        toast({ variant: 'destructive', title: "Solution Required", description: "Please upload a photo first." });
        return;
    }
    setIsAiGrading(true);
    
    try {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('questionText', question.mainQuestionText);
        
        const qMaxMarks = question.solutionSteps.reduce((acc, s) => acc + s.subQuestions.reduce((ss, sq) => ss + sq.marks, 0), 0);
        formData.append('totalMarks', qMaxMarks.toString());

        const rubricToSend = question.aiRubric || { "General Accuracy": "100%" };
        formData.append('rubric', JSON.stringify(rubricToSend));

        // ✅ ADD THIS LINE: Sends the selected patterns (like 'nextSteps') to the backend
        // This ensures the backend can map these to "How you can improve?" etc.
        formData.append('feedbackPatterns', JSON.stringify(question.aiFeedbackPatterns || []));

        const response = await fetch('/api/grade', { method: 'POST', body: formData });
        
        // Improved error handling to capture the actual backend error message
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Server Response Error:", errorText);
            throw new Error("API call failed: Check console for details.");
        }
        
        const aiResult = await response.json();
        const subQuestionIds = question.solutionSteps.flatMap(s => s.subQuestions).map(sq => sq.id);
        const newResults: ResultState = {};
        const newAnswers: AnswerState = {};
        
        // Use the totalScore calculated mathematically by the backend for accuracy
        const finalActualMarks = (aiResult.totalScore / 100) * qMaxMarks;

        subQuestionIds.forEach(id => {
            newResults[id] = {
                isCorrect: aiResult.isCorrect,
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
            description: `Score: ${finalActualMarks.toFixed(2)} / ${qMaxMarks}` 
        });

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

  if (isFinished) return <WorksheetResults worksheet={worksheet} questions={orderedQuestions} answers={answers} results={results} timeTaken={timeTaken} attempt={attempt ?? undefined} />;

  // --- START SCREEN ---
  if (!startTime) return (
        <div className="flex flex-col h-screen bg-slate-50/50 dark:bg-slate-950/50 items-center justify-center p-4">
             <Card className="w-full max-w-lg shadow-xl border-none">
                <div className="h-2 w-full bg-gradient-to-r from-primary to-indigo-500 rounded-t-xl" />
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4 w-fit">
                        <Timer className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">{worksheet.title}</CardTitle>
                    <CardDescription className="text-base">
                        You are about to start a timed worksheet.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground uppercase font-bold">Duration</p>
                            <p className="text-xl font-mono font-semibold">{formatTime(totalDuration)}</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground uppercase font-bold">Questions</p>
                            <p className="text-xl font-mono font-semibold">{orderedQuestions.length}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="pt-2 pb-8">
                    <Button size="lg" className="w-full text-lg font-semibold shadow-lg shadow-primary/20" onClick={handleStart}>
                        Start Attempt <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
  );

  const isAIGradingMode = activeQuestion.gradingMode === 'ai';
  const isQuestionGraded = activeQuestion.solutionSteps.some(step => step.subQuestions.some(sq => results[sq.id]));
  const currentResult = isQuestionGraded ? results[activeQuestion.solutionSteps[0]?.subQuestions[0]?.id] : null;
  const currentFeedback = currentResult?.feedback;
  const qMaxMarks = activeQuestion.solutionSteps.reduce((acc, s) => acc + s.subQuestions.reduce((ss, sq) => ss + sq.marks, 0), 0);

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 dark:bg-slate-950/30">
        {/* --- MODERN HEADER --- */}
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b h-16 flex items-center justify-between px-4 sm:px-8 shadow-sm">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => router.back()}>
                    <X className="h-5 w-5" />
                </Button>
                <div className="hidden sm:block">
                    <h1 className="text-sm font-semibold truncate max-w-[200px]">{worksheet.title}</h1>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Question {currentQuestionIndex + 1} of {orderedQuestions.length}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span>{Math.round(progressPercentage)}% Complete</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
                <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full font-mono font-medium border", timeLeft < 60 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700")}>
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(timeLeft)}</span>
                </div>
                <Button onClick={handleFinish} variant="destructive" size="sm" className="hidden sm:flex">
                    Submit Attempt
                </Button>
            </div>
        </header>

        <main className="flex-grow flex flex-col items-center p-4 sm:p-6 overflow-y-auto">
            <div className="w-full max-w-4xl space-y-6 pb-20">
                {/* --- QUESTION CARD --- */}
                <Card className="border-none shadow-md overflow-hidden">
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 w-full">
                        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
                    </div>
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs font-mono text-muted-foreground">Q{currentQuestionIndex + 1}</Badge>
                                    {isAIGradingMode && (
                                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 gap-1">
                                            <Sparkles className="h-3 w-3" /> AI Graded
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="text-xl leading-tight">
                                    Question {currentQuestionIndex + 1}
                                </CardTitle>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{qMaxMarks} Marks</span>
                            </div>
                        </div>
                    </CardHeader>
                    
                    <CardContent>
                        <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-base leading-relaxed bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div dangerouslySetInnerHTML={{ __html: processedMainQuestionText(activeQuestion.mainQuestionText) }} />
                        </div>
                    </CardContent>
                </Card>

                {/* --- ANSWER SECTION --- */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {isAIGradingMode ? (
                        <Card className="border-none shadow-md">
                            <CardHeader>
                                <CardTitle className="text-lg">Your Answer</CardTitle>
                                <CardDescription>Upload a clear photo of your solution for AI grading.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <AIAnswerUploader 
                                    questionId={activeQuestion.id}
                                    isGrading={isAiGrading}
                                    savedImage={aiImages[activeQuestion.id]}
                                    onImageSelected={(file) => setAiImages(prev => ({ ...prev, [activeQuestion.id]: file }))}
                                    disabled={isQuestionGraded}
                                />
                                
                                {isQuestionGraded && (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                                        <AIRubricBreakdown 
                                            rubric={activeQuestion.aiRubric || {}} 
                                            breakdown={(currentResult as any)?.aiBreakdown || {}} 
                                            maxMarks={qMaxMarks}
                                        />
                                        
                                        {currentFeedback && (
                                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm overflow-hidden">
                                                <div className="bg-indigo-50/50 dark:bg-indigo-950/30 px-4 py-3 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-indigo-600" />
                                                    <h4 className="font-semibold text-sm text-indigo-900 dark:text-indigo-200">AI Feedback</h4>
                                                </div>
                                                <div className="p-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                    <ReactMarkdown
                                                        components={{
                                                            strong: ({node, ...props}) => <span className="font-bold text-indigo-700 dark:text-indigo-400" {...props} />,
                                                            ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                                                            li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />
                                                        }}
                                                    >
                                                        {currentFeedback}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!isQuestionGraded && (
                                    <div className="flex justify-end pt-2">
                                        <Button 
                                            onClick={() => handleAICheck(activeQuestion)} 
                                            disabled={isAiGrading}
                                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20"
                                            size="lg"
                                        >
                                            {isAiGrading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="mr-2 h-4 w-4" /> Grade My Answer</>}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <QuestionRunner 
                            key={activeQuestion.id} 
                            question={activeQuestion}
                            onAnswerSubmit={(subQuestionId, answer) => setAnswers(prev => ({...prev, [subQuestionId]: { answer }}))}
                            onResultCalculated={(subQuestionId, isCorrect) => setResults((prev: ResultState) => ({...prev, [subQuestionId]: { isCorrect }}))}
                            initialAnswers={answers}
                        />
                    )}
                </div>
            </div>
        </main>

        {/* --- BOTTOM NAVIGATION BAR --- */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t flex justify-center z-40">
            <div className="w-full max-w-4xl flex justify-between items-center">
                <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0} className="w-32">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                
                <div className="text-xs text-muted-foreground hidden sm:block">
                    {currentQuestionIndex + 1} / {orderedQuestions.length}
                </div>

                {isLastQuestion ? (
                    <Button onClick={handleFinish} className="w-32 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20">
                        <CheckCircle className="mr-2 h-4 w-4" /> Finish
                    </Button>
                ) : (
                    <Button onClick={handleNext} className="w-32 shadow-lg shadow-primary/20">
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    </div>
  );
}