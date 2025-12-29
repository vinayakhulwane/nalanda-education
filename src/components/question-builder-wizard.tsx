'use client';

import React, { useState, useEffect } from 'react';
import { Step1Metadata } from "@/components/question-builder/step-1-metadata";
import { Step2SolutionBuilder } from "@/components/question-builder/step-2-solution-builder";
import { Step3Validation } from "@/components/question-builder/step-3-validation";
import { Question } from "@/types";
import { Button } from "@/components/ui/button";
import { Save, Loader2, ArrowLeft } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Step4Grading } from './question-builder/step-4-grading';
import { Step5Finalize } from './question-builder/step-5-finalize';

const initialQuestionState: Question = {
  id: '', name: '', mainQuestionText: '', authorId: '', classId: '', subjectId: '', unitId: '', categoryId: '', currencyType: 'spark',
  solutionSteps: [], gradingMode: 'system', aiFeedbackPatterns: [], status: 'draft',
  createdAt: { seconds: 0, nanoseconds: 0 }, updatedAt: { seconds: 0, nanoseconds: 0 }
};

export function QuestionBuilderWizard() {
  const [question, setQuestion] = useState<Question>(initialQuestionState);
  const [currentStep, setCurrentStep] = useState(1);
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State to manage uploaded JSON data before applying it
  const [uploadedQuestionData, setUploadedQuestionData] = useState<Partial<Question> | null>(null);

  useEffect(() => {
    const questionId = searchParams.get('questionId');
    if (questionId && firestore) {
      const fetchQuestion = async () => {
        setIsLoading(true);
        const docRef = doc(firestore, 'questions', questionId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setQuestion({ ...initialQuestionState, ...docSnap.data(), id: docSnap.id } as Question);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Question not found.' });
        }
        setIsLoading(false);
      };
      fetchQuestion();
    } else {
      setIsLoading(false);
    }
  }, [searchParams, firestore, toast]);


  const [isStep1Valid, setIsStep1Valid] = useState(false);
  const [isStep2Valid, setIsStep2Valid] = useState(false);
  const [isStep3Valid, setIsStep3Valid] = useState(false);
  const [isStep4Valid, setIsStep4Valid] = useState(false);


  const handleNext = () => setCurrentStep((prev) => prev + 1);
  const handleBack = () => setCurrentStep((prev) => Math.max(1, prev - 1));

  const handleSave = async (andExit = false) => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'User or database not available.' });
        return;
    }
    setIsSaving(true);
    try {
        const questionToSave = {
            ...question,
            authorId: user.uid,
            updatedAt: serverTimestamp(),
        };

        const docId = question.id || doc(firestore, 'questions', 'new_id').id;
        const finalQuestionData = { ...questionToSave, id: docId };
        
        await setDoc(doc(firestore, 'questions', docId), finalQuestionData, { merge: true });

        // Update local state with the saved ID
        setQuestion(finalQuestionData);

        toast({ title: 'Success', description: `Question "${question.name}" has been saved.` });

        if (andExit) {
            router.push(`/questions/bank?classId=${question.classId}&subjectId=${question.subjectId}`);
        }
    } catch (error) {
        console.error("Error saving question:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'An error occurred while saving.' });
    } finally {
        setIsSaving(false);
    }
  };

  const isNextDisabled = () => {
    if (currentStep === 1) return !isStep1Valid;
    if (currentStep === 2) return !isStep2Valid;
    if (currentStep === 3) return !isStep3Valid;
    if (currentStep === 4) return !isStep4Valid;
    return false;
  };
  
  const steps = [
    { name: 'Metadata', isValid: isStep1Valid },
    { name: 'Solution Steps', isValid: isStep2Valid },
    { name: 'Validation', isValid: isStep3Valid },
    { name: 'Grading', isValid: isStep4Valid },
    { name: 'Finalize', isValid: true },
  ];

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8 flex justify-between items-center text-sm font-medium text-slate-500 border-b pb-4">
        {steps.map((step, idx) => (
            <span key={step.name} className={currentStep > idx + 1 ? "text-green-600 font-bold" : currentStep === idx + 1 ? "text-violet-600 font-bold" : ""}>
                {idx + 1}. {step.name}
            </span>
        ))}
      </div>

      <div className="min-h-[400px] bg-white p-6 rounded-lg shadow-sm border mb-6">
        {currentStep === 1 && <Step1Metadata question={question} setQuestion={setQuestion} onValidityChange={setIsStep1Valid} />}
        {currentStep === 2 && <Step2SolutionBuilder question={question} setQuestion={setQuestion} onValidityChange={setIsStep2Valid} />}
        {currentStep === 3 && <Step3Validation question={question} onValidityChange={setIsStep3Valid} />}
        {currentStep === 4 && <Step4Grading question={question} setQuestion={setQuestion} onValidityChange={setIsStep4Valid} />}
        {currentStep === 5 && <Step5Finalize question={question} setQuestion={setQuestion} />}
      </div>

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || isSaving}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="flex gap-4">
            <Button variant="secondary" onClick={() => handleSave(false)} className="gap-2" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 Save Draft
            </Button>
            
            {currentStep < steps.length ? (
                <Button onClick={handleNext} disabled={isNextDisabled() || isSaving} className="bg-violet-600 hover:bg-violet-700 text-white">
                    Next Step →
                </Button>
            ) : (
                 <Button onClick={() => handleSave(true)} className="bg-green-600 hover:bg-green-700 text-white" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="w-4 h-4" />}
                     Finish & Save
                </Button>
            )}
        </div>
      </div>
    </div>
  );
}
