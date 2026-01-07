'use client';

import { useMemo, Suspense, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query, where, documentId, updateDoc, increment } from 'firebase/firestore';
import type { Worksheet, Question, WorksheetAttempt, EconomySettings, Class, Subject } from '@/types';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorksheetResults } from '@/components/worksheet-results';
import { PageHeader } from '@/components/page-header';
import { MobileResultView } from '@/components/solve/mobile-result-view'; // Import the new mobile component
import { generateSolutionAction } from '@/app/actions/ai-solution';
import { useToast } from '@/components/ui/use-toast';

function ReviewAttemptPageContent() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;
  const firestore = useFirestore();
  const { user, userProfile } = useUser();
  const { toast } = useToast();

  // Local state for unlocking solutions in Review Mode
  const [localUnlocked, setLocalUnlocked] = useState<Record<string, string>>({});
  const [loadingSolutions, setLoadingSolutions] = useState<Record<string, boolean>>({});

  // 1. Fetch the Attempt Document
  const attemptRef = useMemoFirebase(() => (firestore && attemptId ? doc(firestore, 'worksheet_attempts', attemptId) : null), [firestore, attemptId]);
  const { data: attempt, isLoading: isAttemptLoading } = useDoc<WorksheetAttempt>(attemptRef);

  // 2. Fetch the Worksheet Document using the ID from the attempt
  const worksheetRef = useMemoFirebase(() => (firestore && attempt?.worksheetId ? doc(firestore, 'worksheets', attempt.worksheetId) : null), [firestore, attempt?.worksheetId]);
  const { data: worksheet, isLoading: isWorksheetLoading } = useDoc<Worksheet>(worksheetRef);

  // 3. Fetch Settings, Class, and Subject (Needed for Mobile View context)
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
  const { data: economySettings } = useDoc<EconomySettings>(settingsRef);
  
  const classRef = useMemoFirebase(() => (firestore && worksheet ? doc(firestore, 'classes', worksheet.classId) : null), [firestore, worksheet]);
  const { data: classData } = useDoc<Class>(classRef);
  
  const subjectRef = useMemoFirebase(() => (firestore && worksheet ? doc(firestore, 'subjects', worksheet.subjectId) : null), [firestore, worksheet]);
  const { data: subjectData } = useDoc<Subject>(subjectRef);

  // 4. Fetch the Questions using the IDs from the worksheet
  const questionsQuery = useMemoFirebase(() => {
    if (!firestore || !worksheet?.questions || worksheet.questions.length === 0) return null;
    return query(collection(firestore, 'questions'), where(documentId(), 'in', worksheet.questions.slice(0, 30)));
  }, [firestore, worksheet?.questions]);
  const { data: questions, isLoading: areQuestionsLoading } = useCollection<Question>(questionsQuery);
  
  // Order questions based on the worksheet's question array
  const orderedQuestions = useMemo(() => {
    if (!worksheet?.questions || !questions) return [];
    const questionsMap = new Map(questions.map(q => [q.id, q]));
    return worksheet.questions.map(id => questionsMap.get(id)).filter(Boolean) as Question[];
  }, [worksheet?.questions, questions]);

  // Calculate Totals for Mobile View
  const { totalMarks, maxMarks } = useMemo(() => {
    if (!orderedQuestions || !attempt?.results) return { totalMarks: 0, maxMarks: 0 };
    
    // Calculate Max Marks
    const max = orderedQuestions.reduce((acc, q) => 
      acc + q.solutionSteps.reduce((stepSum, step) => 
        stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0), 0);

    // Calculate Earned Marks
    const earned = orderedQuestions.reduce((acc, q) => {
       const qMarks = q.solutionSteps?.reduce((stepAcc, step) => {
         return stepAcc + step.subQuestions.reduce((subAcc, sub) => {
           const res = attempt.results[sub.id];
           if (!res) return subAcc;
           if (typeof res.score === 'number') return subAcc + res.score;
           if (res.isCorrect) return subAcc + sub.marks;
           return subAcc;
         }, 0);
       }, 0) || 0;
       return acc + qMarks;
    }, 0);

    return { totalMarks: earned, maxMarks: max };
  }, [orderedQuestions, attempt?.results]);


  // Handle Unlocking Solutions (Re-implemented for Review Page)
  const handleUnlockSolution = async (question: Question) => {
      if (!user || !userProfile || !attempt?.id || !firestore) return;

      // Check if already unlocked in database attempt
      if (attempt.unlockedSolutions?.[question.id]) {
          return; // Already unlocked
      }

      const cost = economySettings?.solutionCost ?? 5;
      const currency = economySettings?.solutionCurrency ?? 'coin';
      // @ts-ignore
      const bal = userProfile[currency === 'coin' ? 'coins' : currency] || 0;

      if (bal < cost) { 
          toast({ variant: 'destructive', title: 'Insufficient Funds' }); 
          return; 
      }

      setLoadingSolutions(prev => ({ ...prev, [question.id]: true }));

      try {
          const res = await generateSolutionAction({ questionText: question.mainQuestionText });
          if (!res || !res.success) throw new Error(res?.error || "Failed");

          setLocalUnlocked(prev => ({...prev, [question.id]: res.solution || ""}));

          const userRef = doc(firestore, 'users', user.uid);
          const updatePayload: any = {};
          const fieldName = currency === 'coin' ? 'coins' : currency === 'aiCredits' ? 'aiCredits' : currency;
          updatePayload[fieldName] = increment(-cost);

          await updateDoc(userRef, updatePayload);
          await updateDoc(doc(firestore, 'worksheet_attempts', attempt.id), { 
              [`unlockedSolutions.${question.id}`]: res.solution 
          });

          toast({ title: "Unlocked!" });
      } catch (e) { 
          toast({ variant: 'destructive', title: "Error unlocking solution" }); 
      } finally { 
          setLoadingSolutions(prev => ({ ...prev, [question.id]: false })); 
      }
  };

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

  // Combine unlocked solutions from DB and local session
  const effectiveUnlockedSolutions = { 
      ...(attempt.unlockedSolutions || {}), 
      ...localUnlocked 
  };

  return (
    <>
        {/* --- MOBILE VIEW --- */}
        <div className="block sm:hidden animate-in fade-in duration-500">
            <MobileResultView
                worksheet={worksheet}
                results={attempt.results}
                answers={attempt.answers}
                questions={orderedQuestions}
                timeTaken={attempt.timeTaken}
                totalMarks={totalMarks}
                maxMarks={maxMarks}
                // Review Mode Specifics:
                onClaimReward={() => {}} 
                calculatedRewards={{}} 
                isClaiming={false}
                hasClaimed={true} // Hide claim button
                userProfile={userProfile}
                classData={classData}
                subjectData={subjectData}
                economySettings={economySettings}
                onUnlockSolution={handleUnlockSolution}
                unlockedSolutions={effectiveUnlockedSolutions}
                loadingSolutions={loadingSolutions}
            />
        </div>

        {/* --- DESKTOP VIEW --- */}
        <div className="hidden sm:block">
            <WorksheetResults
            worksheet={worksheet}
            questions={orderedQuestions}
            answers={attempt.answers}
            results={attempt.results}
            timeTaken={attempt.timeTaken}
            isReview={true} 
            attempt={attempt}
            />
        </div>
    </>
  );
}

export default function ReviewAttemptPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ReviewAttemptPageContent />
        </Suspense>
    )
}