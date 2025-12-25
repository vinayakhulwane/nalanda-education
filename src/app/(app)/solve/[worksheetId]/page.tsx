'use client';
import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, documentId } from 'firebase/firestore';
import type { Worksheet, Question, Subject, Class } from '@/types';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionRunner } from '@/components/question-runner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

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
  
  // Create a map for quick question lookup and then order them
  const orderedQuestions = useMemo(() => {
    if (!worksheet?.questions || !questions) return [];
    const questionsMap = new Map(questions.map(q => [q.id, q]));
    return worksheet.questions.map(id => questionsMap.get(id)).filter(Boolean) as Question[];
  }, [worksheet?.questions, questions]);

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
    <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>
       
       <Card>
            <CardHeader>
                <CardTitle>{worksheet.title}</CardTitle>
                <CardDescription>Question {currentQuestionIndex + 1} of {orderedQuestions.length}</CardDescription>
                <Progress value={progressPercentage} className="mt-2" />
            </CardHeader>
            <CardContent>
                <QuestionRunner question={activeQuestion} />
            </CardContent>
            <CardFooter className="flex justify-between">
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
    </div>
  );
}
