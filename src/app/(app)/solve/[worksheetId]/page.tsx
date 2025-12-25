'use client';
import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, documentId } from 'firebase/firestore';
import type { Worksheet, Question } from '@/types';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle, Timer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionRunner } from '@/components/question-runner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

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

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Fetch worksheet
  const worksheetRef = useMemoFirebase(() => (firestore && worksheetId ? doc(firestore, 'worksheets', worksheetId) : null), [firestore, worksheetId]);
  const { data: worksheet, isLoading: isWorksheetLoading } = useDoc<Worksheet>(worksheetRef);

  // Fetch questions for the worksheet
  const questionsQuery = useMemoFirebase(() => {
    if (!firestore || !worksheet?.questions || worksheet.questions.length === 0) return null;
    // Firestore 'in' queries are limited to 30 items. For worksheets with more questions, pagination would be needed.
    return query(collection(firestore, 'questions'), where(documentId(), 'in', worksheet.questions.slice(0,30)));
  }, [firestore, worksheet?.questions]);
  const { data: questions, isLoading: areQuestionsLoading } = useCollection<Question>(questionsQuery);
  
  const orderedQuestions = useMemo(() => {
    if (!worksheet?.questions || !questions) return [];
    const questionsMap = new Map(questions.map(q => [q.id, q]));
    return worksheet.questions.map(id => questionsMap.get(id)).filter(Boolean) as Question[];
  }, [worksheet?.questions, questions]);

  const { totalMarks, totalDuration } = useMemo(() => {
    if (!orderedQuestions) return { totalMarks: 0, totalDuration: 0 };
    const marks = orderedQuestions.reduce((total, question) => {
      const questionMarks = question.solutionSteps?.reduce((stepSum, step) => 
          stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
      return total + questionMarks;
    }, 0);
    return { totalMarks: marks, totalDuration: marks * 20 };
  }, [orderedQuestions]);

  const [timeLeft, setTimeLeft] = useState(totalDuration);

  useEffect(() => {
    if (totalDuration > 0) {
      setTimeLeft(totalDuration);
    }
  }, [totalDuration]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);


  const isLoading = isWorksheetLoading || areQuestionsLoading;
  
  const handleNext = () => {
    if (currentQuestionIndex < orderedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const handleFinish = () => {
    // In a real app, you would submit answers here and navigate to a results page
    console.log('Worksheet finished!');
    if (worksheet) {
      router.push(`/academics/${worksheet.classId}/${worksheet.subjectId}`);
    } else {
      router.push('/dashboard');
    }
  }

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!worksheet || orderedQuestions.length === 0) {
    return (
      <div className="text-center py-10">
        <p>Worksheet or questions could not be loaded.</p>
        <Button variant="link" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const activeQuestion = orderedQuestions[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex + 1) / orderedQuestions.length) * 100;
  const isLastQuestion = currentQuestionIndex === orderedQuestions.length - 1;


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
                        <CardTitle>{worksheet.title}</CardTitle>
                        <CardDescription>Question {currentQuestionIndex + 1} of {orderedQuestions.length}</CardDescription>
                        <Progress value={progressPercentage} className="mt-2" />
                    </CardHeader>
                    <CardContent className="flex-grow overflow-y-auto">
                        <QuestionRunner question={activeQuestion} />
                    </CardContent>
                    <CardFooter className="flex justify-between mt-auto">
                        <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Previous
                        </Button>
                        {isLastQuestion ? (
                            <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Finish Attempt
                            </Button>
                        ) : (
                            <Button onClick={handleNext}>
                                Next
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </CardFooter>
            </Card>
        </main>
    </div>
  );
}
