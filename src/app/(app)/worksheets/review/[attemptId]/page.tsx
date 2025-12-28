'use client';
import { useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, documentId } from 'firebase/firestore';
import type { Worksheet, Question, WorksheetAttempt } from '@/types';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorksheetResults } from '@/components/worksheet-results';
import { PageHeader } from '@/components/page-header';

function ReviewAttemptPageContent() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;
  const firestore = useFirestore();

  // 1. Fetch the Attempt Document
  const attemptRef = useMemoFirebase(() => (firestore && attemptId ? doc(firestore, 'worksheet_attempts', attemptId) : null), [firestore, attemptId]);
  const { data: attempt, isLoading: isAttemptLoading } = useDoc<WorksheetAttempt>(attemptRef);

  // 2. Fetch the Worksheet Document using the ID from the attempt
  const worksheetRef = useMemoFirebase(() => (firestore && attempt?.worksheetId ? doc(firestore, 'worksheets', attempt.worksheetId) : null), [firestore, attempt?.worksheetId]);
  const { data: worksheet, isLoading: isWorksheetLoading } = useDoc<Worksheet>(worksheetRef);

  // 3. Fetch the Questions using the IDs from the worksheet
  const questionsQuery = useMemoFirebase(() => {
    if (!firestore || !worksheet?.questions || worksheet.questions.length === 0) return null;
    return query(collection(firestore, 'questions'), where(documentId(), 'in', worksheet.questions.slice(0,30)));
  }, [firestore, worksheet?.questions]);
  const { data: questions, isLoading: areQuestionsLoading } = useCollection<Question>(questionsQuery);
  
  // Order questions based on the worksheet's question array
  const orderedQuestions = useMemo(() => {
    if (!worksheet?.questions || !questions) return [];
    const questionsMap = new Map(questions.map(q => [q.id, q]));
    return worksheet.questions.map(id => questionsMap.get(id)).filter(Boolean) as Question[];
  }, [worksheet?.questions, questions]);


  const isLoading = isAttemptLoading || isWorksheetLoading || areQuestionsLoading;

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!attempt || !worksheet || !orderedQuestions) {
    return (
      <div className="container mx-auto py-10 text-center">
        <PageHeader title="Error" description="Could not load the worksheet review. The attempt may not exist."/>
        <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
        </Button>
      </div>
    );
  }

  // 4. Render the WorksheetResults component with all the fetched data
  return (
    <WorksheetResults
      worksheet={worksheet}
      questions={orderedQuestions}
      answers={attempt.answers}
      results={attempt.results}
      timeTaken={attempt.timeTaken}
      isReview={true} // ✅ DISABLED CLAIMING HERE
      attempt={attempt}
    />
  );
}

export default function ReviewAttemptPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ReviewAttemptPageContent />
        </Suspense>
    )
}
