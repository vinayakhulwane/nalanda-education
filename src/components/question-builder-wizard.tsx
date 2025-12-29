'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Save, CheckCircle } from 'lucide-react';
import type { Question } from '@/types'; // Using the master type
import { useSearchParams } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// Step Components
import { Step1Metadata } from './question-builder/step-1-metadata';
import { Step2SolutionBuilder } from './question-builder/step-2-solution-builder';
import { Step3Preview } from './question-builder/step-3-preview';
import { Step4Grading } from './question-builder/step-4-grading';
import { Step5Finalize } from './question-builder/step-5-finalize';


const initialQuestionState: Partial<Question> = {
  name: '',
  mainQuestionText: '',
  classId: '',
  subjectId: '',
  unitId: '',
  categoryId: '',
  currencyType: 'spark',
  solutionSteps: [],
  gradingMode: 'system',
  aiRubric: {
      problemUnderstanding: 20,
      formulaSelection: 15,
      substitution: 15,
      calculationAccuracy: 20,
      finalAnswer: 20,
      presentationClarity: 10,
  },
  aiFeedbackPatterns: [],
  status: 'draft',
};


export function QuestionBuilderWizard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const [currentStep, setCurrentStep] = useState(1);
    const [question, setQuestion] = useState<Partial<Question>>(initialQuestionState);
    const [stepValidity, setStepValidity] = useState({ 1: false, 2: false, 3: true, 4: true, 5: true });
    
    const totalSteps = 5;

    useEffect(() => {
        const questionId = searchParams.get('questionId');
        const classId = searchParams.get('classId');
        const subjectId = searchParams.get('subjectId');

        if (questionId && firestore) {
            const fetchQuestion = async () => {
                const docRef = doc(firestore, 'questions', questionId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setQuestion({ id: docSnap.id, ...docSnap.data() } as Partial<Question>);
                }
            };
            fetchQuestion();
        } else {
             // If creating a new question, pre-fill from URL params
            setQuestion(prev => ({
                ...prev,
                classId: classId || '',
                subjectId: subjectId || '',
            }))
        }
    }, [searchParams, firestore]);

    const handleNext = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleValidityChange = (step: number, isValid: boolean) => {
        setStepValidity(prev => ({ ...prev, [step]: isValid }));
    };
    
    const handleSave = async () => {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'User or database not available.' });
            return;
        }

        const finalQuestionData = {
            ...question,
            authorId: question.authorId || user.uid,
            updatedAt: serverTimestamp(),
        };

        try {
            if (question.id) {
                // Update existing question
                const questionRef = doc(firestore, 'questions', question.id);
                await setDoc(questionRef, finalQuestionData, { merge: true });
                toast({ title: 'Question Updated', description: `"${question.name}" has been saved.` });
            } else {
                // Create new question
                const questionWithCreationDate = {
                    ...finalQuestionData,
                    createdAt: serverTimestamp(),
                };
                const questionRef = await addDoc(collection(firestore, 'questions'), questionWithCreationDate);
                setQuestion(prev => ({ ...prev, id: questionRef.id })); // Set new ID in state
                toast({ title: 'Question Created', description: `"${question.name}" has been saved.` });
            }
            // Navigate to question bank
            router.push(`/questions/bank?classId=${question.classId}&subjectId=${question.subjectId}`);
        } catch (error) {
            console.error("Error saving question:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'An error occurred while saving.' });
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <Step1Metadata question={question} setQuestion={setQuestion} onValidityChange={(isValid) => handleValidityChange(1, isValid)} />;
            case 2:
                return <Step2SolutionBuilder question={question} setQuestion={setQuestion} onValidityChange={(isValid) => handleValidityChange(2, isValid)} />;
            case 3:
                return <Step3Preview question={question} />;
            case 4:
                return <Step4Grading question={question} setQuestion={setQuestion} onValidityChange={(isValid) => handleValidityChange(4, isValid)} />;
            case 5:
                return <Step5Finalize question={question} setQuestion={setQuestion} />;
            default:
                return <div>Invalid Step</div>;
        }
    };

    const stepTitles = ["Metadata", "Solution Builder", "Live Preview", "Grading Logic", "Finalize & Publish"];

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <Progress value={(currentStep / totalSteps) * 100} className="w-full" />
                <div className="mt-2 text-center text-sm font-medium text-muted-foreground">
                    Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
                </div>
            </div>

            <div className="min-h-[400px]">
                {renderStep()}
            </div>

            <div className="mt-8 flex justify-between items-center border-t pt-6">
                <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                {currentStep === totalSteps ? (
                    <Button onClick={handleSave} disabled={!stepValidity[1] || !stepValidity[2] || !stepValidity[4]}>
                        <Save className="mr-2 h-4 w-4" /> Save Question
                    </Button>
                ) : (
                    <Button onClick={handleNext} disabled={!stepValidity[currentStep]}>
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
