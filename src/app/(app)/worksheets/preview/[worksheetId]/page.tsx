'use client';
import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, documentId } from 'firebase/firestore';
import type { Worksheet, Question, Subject, Class } from '@/types';
import { Loader2, ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

function WorksheetPreviewContent() {
  const router = useRouter();
  const params = useParams();
  const worksheetId = params.worksheetId as string;
  const firestore = useFirestore();

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
  
  // Fetch related metadata
  const classRef = useMemoFirebase(() => (firestore && worksheet ? doc(firestore, 'classes', worksheet.classId) : null), [firestore, worksheet]);
  const { data: classData, isLoading: isClassLoading } = useDoc<Class>(classRef);

  const subjectRef = useMemoFirebase(() => (firestore && worksheet ? doc(firestore, 'subjects', worksheet.subjectId) : null), [firestore, worksheet]);
  const { data: subjectData, isLoading: isSubjectLoading } = useDoc<Subject>(subjectRef);
  
  // Create a map for quick question lookup
  const questionsMap = useMemo(() => {
    if (!questions) return new Map();
    return new Map(questions.map(q => [q.id, q]));
  }, [questions]);

  // Order the fetched questions according to the worksheet's question array
  const orderedQuestions = useMemo(() => {
    if (!worksheet?.questions || !questionsMap.size) return [];
    return worksheet.questions.map(id => questionsMap.get(id)).filter(Boolean) as Question[];
  }, [worksheet?.questions, questionsMap]);


  const isLoading = isWorksheetLoading || areQuestionsLoading || isClassLoading || isSubjectLoading;
  
  const handlePrint = () => {
    window.print();
  }

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!worksheet) {
    return (
      <div className="text-center py-10">
        <p>Worksheet not found.</p>
        <Button variant="link" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const getTotalMarks = () => {
    return orderedQuestions.reduce((total, q) => {
        const questionMarks = q.solutionSteps?.reduce((stepSum, step) => 
            stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
        return total + questionMarks;
    }, 0);
  }

  return (
    <div>
        <style jsx global>{`
            @media print {
                body {
                    background-color: #fff !important;
                }
                .printable-area {
                    box-shadow: none !important;
                    border: none !important;
                    padding: 0 !important;
                }
                .no-print {
                    display: none !important;
                }
            }
        `}</style>
      <div className="no-print mb-6 flex justify-between items-center">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Saved Worksheets
        </Button>
        <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print / Save as PDF
        </Button>
      </div>

      <div className="printable-area max-w-4xl mx-auto bg-white text-black p-8 md:p-12 shadow-lg rounded-lg border">
        <header className="border-b border-gray-300 pb-4 mb-8">
            <h1 className="text-3xl font-bold text-center font-headline">{worksheet.title}</h1>
            <div className="flex justify-between text-sm mt-4 text-gray-700">
                <span><strong>Class:</strong> {classData?.name || '...'}</span>
                <span><strong>Subject:</strong> {subjectData?.name || '...'}</span>
                <span><strong>Date:</strong> {worksheet.startTime ? format(worksheet.startTime.toDate(), 'PP') : format(new Date(), 'PP')}</span>
            </div>
             <div className="flex justify-between text-sm mt-2 text-gray-700">
                <span><strong>Name:</strong> _________________________</span>
                <span><strong>Score:</strong> __________ / {getTotalMarks()}</span>
            </div>
        </header>
        
        <section className="space-y-8">
            {orderedQuestions.map((question, index) => (
                <div key={question.id} className="prose prose-sm max-w-none">
                    <div className="flex items-start gap-4">
                        <span className="font-bold">{index + 1}.</span>
                        <div dangerouslySetInnerHTML={{ __html: question.mainQuestionText }} />
                    </div>
                </div>
            ))}
             {orderedQuestions.length === 0 && <p className="text-center text-gray-500">This worksheet has no questions.</p>}
        </section>
      </div>
    </div>
  );
}

export default function WorksheetPreviewPage() {
    return <WorksheetPreviewContent />;
}
