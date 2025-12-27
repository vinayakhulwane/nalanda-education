'use client';
import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query, where, documentId, updateDoc, arrayUnion, addDoc, serverTimestamp, getDocs, limit, orderBy } from 'firebase/firestore';
import type { Worksheet, Question, WorksheetAttempt, ResultState } from '@/types';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle, Timer, X, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionRunner } from '@/components/question-runner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { WorksheetResults, type AnswerState } from '@/components/worksheet-results';
import { AIAnswerUploader } from '@/components/solve/ai-answer-uploader';
import { useToast } from '@/hooks/use-toast';

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

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

  // --- AI GRADING STATE ---
  const [aiImages, setAiImages] = useState<Record<string, File | null>>({});
  const [isAiGrading, setIsAiGrading] = useState(false);

  // Fetch worksheet
  const worksheetRef = useMemoFirebase(() => (firestore && worksheetId ? doc(firestore, 'worksheets', worksheetId) : null), [firestore, worksheetId]);
  const { data: worksheet, isLoading: isWorksheetLoading } = useDoc<Worksheet>(worksheetRef);

  // Fetch questions
  const questionsQuery = useMemoFirebase(() => {
    if (!firestore || !worksheet?.questions || worksheet.questions.length === 0) return null;
    return query(collection(firestore, 'questions'), where(documentId(), 'in', worksheet.questions.slice(0,30)));
  }, [firestore, worksheet?.questions]);
  const { data: questions, isLoading: areQuestionsLoading } = useCollection<Question>(questionsQuery);
  
  // Check for existing attempt (Resume functionality)
  useEffect(() => {
    const checkExistingAttempt = async () => {
        if (user && firestore && userProfile?.completedWorksheets?.includes(worksheetId)) {
            const attemptsQuery = query(
                collection(firestore, 'worksheet_attempts'), 
                where('userId', '==', user.uid),
                where('worksheetId', '==', worksheetId),
                orderBy('attemptedAt', 'desc'),
                limit(1)
            );
            
            try {
                const querySnapshot = await getDocs(attemptsQuery);
                if (!querySnapshot.empty) {
                    const lastAttemptDoc = querySnapshot.docs[0];
                    const lastAttempt = { id: lastAttemptDoc.id, ...lastAttemptDoc.data() } as WorksheetAttempt;
                    setAnswers(lastAttempt.answers);
                    setResults(lastAttempt.results);
                    setTimeTaken(lastAttempt.timeTaken);
                    setAttempt(lastAttempt);
                    setIsFinished(true);
                }
            } catch (error) {
                console.error("Error fetching past attempt:", error);
            }
        }
    };
    checkExistingAttempt();
  }, [user, firestore, worksheetId, userProfile?.completedWorksheets]);

  const orderedQuestions = useMemo(() => {
    if (!worksheet?.questions || !questions) return [];
    const questionsMap = new Map(questions.map(q => [q.id, q]));
    return worksheet.questions.map(id => questionsMap.get(id)).filter(Boolean) as Question[];
  }, [worksheet?.questions, questions]);

  // Timer Logic
  const { totalMarks, totalDuration } = useMemo(() => {
    if (!orderedQuestions) return { totalMarks: 0, totalDuration: 0 };
    const marks = orderedQuestions.reduce((total, question) => {
      const questionMarks = question.solutionSteps?.reduce((stepSum, step) => 
          stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
      return total + questionMarks;
    }, 0);
    const duration = marks > 0 ? marks * 20 : 60;
    return { totalMarks: marks, totalDuration: duration };
  }, [orderedQuestions]);

  const [timeLeft, setTimeLeft] = useState(totalDuration);
  const [startTime, setStartTime] = useState<Date | null>(null);

   useEffect(() => {
    if (totalDuration > 0) setTimeLeft(totalDuration);
  }, [totalDuration]);

  useEffect(() => {
    if (startTime && !isFinished) {
       if (timeLeft <= 0) { handleFinish(); return; }
       const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
       return () => clearInterval(timerId);
    }
  }, [timeLeft, startTime, isFinished]);

  const isLoading = isWorksheetLoading || areQuestionsLoading;
  
  const handleStart = () => setStartTime(new Date());

  const handleNext = () => {
    if (currentQuestionIndex < orderedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
        handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(currentQuestionIndex - 1);
  };
  
  const handleFinish = async () => {
    const finalTimeTaken = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000) : 0;
    setTimeTaken(finalTimeTaken);
    setIsFinished(true);

    if (user && firestore && worksheet) {
        if (worksheet.worksheetType === 'practice' && !userProfile?.completedWorksheets?.includes(worksheetId)) {
            const userRef = doc(firestore, 'users', user.uid);
            await updateDoc(userRef, { completedWorksheets: arrayUnion(worksheetId) });
        }
        
        const attemptData: Omit<WorksheetAttempt, 'id'> = {
            userId: user.uid,
            worksheetId: worksheet.id,
            answers,
            results,
            timeTaken: finalTimeTaken,
            attemptedAt: serverTimestamp(),
            rewardsClaimed: false,
        };

        const attemptRef = await addDoc(collection(firestore, 'worksheet_attempts'), attemptData);
        setAttempt({ ...attemptData, id: attemptRef.id, attemptedAt: new Date() });
    }
  }

  // --- AI GRADING LOGIC ---
  const handleAICheck = async (question: Question) => {
    const imageFile = aiImages[question.id];
    if (!imageFile) {
        toast({ variant: 'destructive', title: "Solution Required", description: "Please upload a photo of your solution first." });
        return;
    }

    setIsAiGrading(true);
    try {
        // 1. Simulating AI API Call (Replace with real call later)
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 2. Mock Response based on Rubric
        // In real app, we send: image + question.rubric -> receive score + feedback
        const mockScore = Math.floor(Math.random() * 5) + 5; // Random score 5-10
        const mockFeedback = "AI Analysis: \n- Step 1: Formula is correct. \n- Step 2: Substitution values match. \n- Final Answer: Correct unit usage. \n\nGreat job!";

        // 3. Update Results & Answers
        // We update all subquestions for this main question with the AI result
        const subQuestionIds = question.solutionSteps.flatMap(s => s.subQuestions).map(sq => sq.id);
        
        const newResults: ResultState = {};
        const newAnswers: AnswerState = {};
        
        subQuestionIds.forEach(id => {
            newResults[id] = {
                isCorrect: mockScore > 5, // Simple pass/fail logic for demo
                score: mockScore,
                feedback: mockFeedback
            };
            newAnswers[id] = { answer: "AI_GRADED_IMAGE" }; // Marker for answer state
        });

        setResults(prev => ({ ...prev, ...newResults }));
        setAnswers(prev => ({ ...prev, ...newAnswers }));
        
        toast({ title: "AI Grading Complete", description: "Your solution has been analyzed." });

    } catch (error) {
        console.error("AI Grading Error", error);
        toast({ variant: 'destructive', title: "Grading Failed", description: "Could not connect to AI service." });
    } finally {
        setIsAiGrading(false);
    }
  };


  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  if (!worksheet || orderedQuestions.length === 0) return <div className="text-center py-10"><p>Worksheet could not be loaded.</p><Button variant="link" onClick={() => router.back()}>Go Back</Button></div>;

  const activeQuestion = orderedQuestions[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex + 1) / orderedQuestions.length) * 100;
  const isLastQuestion = currentQuestionIndex === orderedQuestions.length - 1;

  if (isFinished) {
    return <WorksheetResults worksheet={worksheet} questions={orderedQuestions} answers={answers} results={results} timeTaken={timeTaken} attempt={attempt ?? undefined} />;
  }

  if (!startTime) {
    return (
        <div className="flex flex-col h-screen p-4 sm:p-6 lg:p-8 items-center justify-center">
             <Card className="max-w-2xl text-center">
                <CardHeader>
                    <CardTitle>{worksheet.title}</CardTitle>
                    <CardDescription>Ready to begin? You'll have {formatTime(totalDuration)} to complete {orderedQuestions.length} questions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button size="lg" onClick={handleStart}>Start Attempt</Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  // Check if current question is AI Graded
  const isAIGradingMode = activeQuestion.gradingMode === 'ai';
  // Check if current question has been graded (any subquestion has a result)
  const isQuestionGraded = activeQuestion.solutionSteps.some(step => step.subQuestions.some(sq => results[sq.id]));
  const currentFeedback = activeQuestion.solutionSteps.flatMap(s => s.subQuestions).map(sq => results[sq.id]?.feedback).find(f => f);

  return (
    <div className="flex flex-col h-screen p-4 sm:p-6 lg:p-8">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b h-16 flex items-center px-6">
            <div className="ml-auto flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-muted-foreground" />
                    <span className="text-lg font-semibold font-mono">{formatTime(timeLeft)}</span>
                </div>
                <Button variant="destructive" onClick={handleFinish}>
                    <X className="mr-2" /> End Attempt
                </Button>
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
                            {isAIGradingMode && (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold border border-purple-100">
                                    <Sparkles className="h-3 w-3" /> AI Graded
                                </div>
                            )}
                        </div>
                        <Progress value={progressPercentage} className="mt-2" />
                    </CardHeader>
                    
                    <CardContent className="flex-grow overflow-y-auto">
                        <div className="mb-4 prose dark:prose-invert max-w-none">
                            {/* Render Main Question Text */}
                            <div dangerouslySetInnerHTML={{ __html: activeQuestion.mainQuestionText }} />
                        </div>

                        {/* === LOGIC SWITCH: AI VS SYSTEM === */}
                        {isAIGradingMode ? (
                            <div className="space-y-6">
                                <AIAnswerUploader 
                                    questionId={activeQuestion.id}
                                    isGrading={isAiGrading}
                                    savedImage={aiImages[activeQuestion.id]}
                                    onImageSelected={(file) => setAiImages(prev => ({ ...prev, [activeQuestion.id]: file }))}
                                />
                                
                                {/* Feedback Section (Appears after grading) */}
                                {isQuestionGraded && currentFeedback && (
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                            <div>
                                                <h4 className="font-semibold text-green-800">AI Feedback</h4>
                                                <p className="text-sm text-green-700 mt-1 whitespace-pre-wrap">{currentFeedback}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end pt-4">
                                    <Button 
                                        onClick={() => handleAICheck(activeQuestion)} 
                                        disabled={isAiGrading || isQuestionGraded}
                                        className={isQuestionGraded ? "bg-green-600 hover:bg-green-700" : "bg-purple-600 hover:bg-purple-700"}
                                    >
                                        {isAiGrading ? (
                                            <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing... </>
                                        ) : isQuestionGraded ? (
                                            <> <CheckCircle className="mr-2 h-4 w-4" /> Graded </>
                                        ) : (
                                            <> <Sparkles className="mr-2 h-4 w-4" /> Check with AI </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            /* === SYSTEM GRADING === */
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
                        <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                        </Button>
                        {isLastQuestion ? (
                            <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" /> Finish Attempt
                            </Button>
                        ) : (
                            <Button onClick={handleNext}>
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </CardFooter>
            </Card>
        </main>
    </div>
  );
}