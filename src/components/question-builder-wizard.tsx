'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation'; // ✅ Added useParams
import { Step1Metadata } from "@/components/question-builder/step-1-metadata";
import { Step2Sequence } from "@/components/question-builder/step-2-sequence";
import { Step3Validation } from "@/components/question-builder/step-3-validation"; 
import { Step4Grading } from "@/components/question-builder/step-4-grading"; 
import { Step5Preview } from "@/components/question-builder/step-5-preview"; 
import { Question } from "@/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast"; // ✅ Using Shadcn Toast
import { Save, Check, Rocket, Loader2 } from 'lucide-react';

import { useFirestore } from '@/firebase'; 
import { collection, doc, addDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// --- HELPER: DATA SANITIZER ---
// Firestore crashes if you save 'undefined'. This function converts undefined -> null
const cleanPayload = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => cleanPayload(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const value = obj[key];
            if (value === undefined) {
                acc[key] = null; // Convert undefined to null
            } else {
                acc[key] = cleanPayload(value);
            }
            return acc;
        }, {} as any);
    }
    return obj;
};

const initialQuestionState: Question = {
  id: '', name: '', mainQuestionText: '', authorId: '', classId: '', subjectId: '', unitId: '', categoryId: '', currencyType: 'spark',
  solutionSteps: [], gradingMode: 'system', aiFeedbackPatterns: [], status: 'draft',
  aiRubric: { 
    problemUnderstanding: 20, formulaSelection: 20, substitution: 20, 
    calculationAccuracy: 20, finalAnswer: 10, presentationClarity: 10 
  },
  createdAt: { seconds: 0, nanoseconds: 0 }, updatedAt: { seconds: 0, nanoseconds: 0 }
};

export function QuestionBuilderWizard() {
  const firestore = useFirestore(); 
  const router = useRouter(); 
  const params = useParams(); // ✅ Get ID from URL
  const { toast } = useToast(); // ✅ Toast Hook

  const [question, setQuestion] = useState<Question>(initialQuestionState);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false); 
  const [isLoading, setIsLoading] = useState(true); // ✅ Loading State for Fetching

  // Validation States
  const [isStep1Valid, setIsStep1Valid] = useState(false);
  const [isStep3Valid, setIsStep3Valid] = useState(false);
  
  const isStep4Valid = question.aiRubric 
    ? Object.values(question.aiRubric).reduce((a, b) => a + b, 0) === 100 
    : false;

  // --- 1. LOAD EXISTING DATA ---
  useEffect(() => {
    const loadData = async () => {
        // Check if there is an ID in the URL (e.g. /questions/123)
        const questionId = params?.questionId as string; 

        if (questionId && firestore) {
            console.log("Loading Question ID:", questionId);
            try {
                const docRef = doc(firestore, 'questions', questionId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data() as Question;
                    // Ensure ID is set correctly
                    setQuestion({ ...data, id: docSnap.id });
                    // Validate Step 1 automatically on load
                    if (data.name && data.mainQuestionText) setIsStep1Valid(true);
                } else {
                    toast({ variant: "destructive", title: "Error", description: "Question not found." });
                }
            } catch (err) {
                console.error("Load Error:", err);
                toast({ variant: "destructive", title: "Error", description: "Failed to load question." });
            }
        }
        setIsLoading(false);
    };

    if (firestore) loadData();
    else setIsLoading(false); // Stop loading if no firestore (e.g. new question)

  }, [firestore, params, toast]);

  const handleNext = () => setCurrentStep((prev) => prev + 1);
  const handleBack = () => setCurrentStep((prev) => Math.max(1, prev - 1));

  // --- 2. SAVE LOGIC (With Sanitizer) ---
  const saveToDatabase = async (status: 'draft' | 'published') => {
    if (!firestore) return;

    setIsSaving(true);
    try {
        // Prepare Payload
        const rawPayload = {
            ...question,
            status,
            updatedAt: serverTimestamp(),
            ...(status === 'published' ? { publishedAt: serverTimestamp() } : {})
        };

        // 🛑 CRITICAL: Sanitize data to remove 'undefined' which crashes Firestore
        const payload = cleanPayload(rawPayload);
        if (!question.id) delete payload.id; // Let Firestore gen ID if new

        if (!question.id) {
            // CREATE
            const docRef = await addDoc(collection(firestore, 'questions'), {
                ...payload,
                createdAt: serverTimestamp()
            });
            setQuestion(prev => ({ ...prev, id: docRef.id }));
            
            toast({ 
                title: "Success", 
                description: status === 'draft' ? "Draft created successfully." : "Question published!" 
            });

            // Optional: Update URL without refreshing
            window.history.replaceState(null, '', `/questions/${docRef.id}`);

        } else {
            // UPDATE
            const docRef = doc(firestore, 'questions', question.id);
            await updateDoc(docRef, payload);
            
            toast({ 
                title: "Saved", 
                description: "Changes saved successfully." 
            });
        }

    } catch (error) {
        console.error("Save Failed:", error);
        toast({ 
            variant: "destructive", 
            title: "Save Failed", 
            description: "Could not save data. Check console." 
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => await saveToDatabase('draft');

  const handlePublish = async () => {
      if (!confirm("Are you sure you want to publish?")) return;
      await saveToDatabase('published');
      setTimeout(() => router.push('/questions'), 1000);
  };

  const isNextDisabled = () => {
    if (currentStep === 1) return !isStep1Valid;
    if (currentStep === 3) return !isStep3Valid; 
    if (currentStep === 4) return !isStep4Valid; 
    return false;
  };

  if (isLoading) {
      return <div className="flex h-[500px] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-600"/></div>;
  }

  const steps = ['Metadata', 'Steps', 'Validation', 'Grading', 'Preview'];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* PROGRESS BAR */}
      <div className="mb-8 flex justify-between items-center relative">
        <div className="absolute left-0 right-0 top-[15px] h-0.5 bg-slate-200 -z-10" />
        
        {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum;
            const isActive = currentStep === stepNum;
            
            return (
                <div key={step} className="flex flex-col items-center gap-2 z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300
                        ${isCompleted 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : isActive 
                                ? 'bg-white border-violet-600 text-violet-600' 
                                : 'bg-white border-slate-300 text-slate-300'}
                    `}>
                        {isCompleted ? <Check className="w-5 h-5" /> : <span className="text-sm font-bold">{stepNum}</span>}
                    </div>
                    <span className={`text-xs font-semibold ${isActive ? 'text-violet-600' : isCompleted ? 'text-green-600' : 'text-slate-400'}`}>
                        {step}
                    </span>
                </div>
            );
        })}
      </div>

      {/* CONTENT AREA */}
      <div className="min-h-[400px] bg-white p-6 rounded-lg shadow-sm border mb-6">
        {currentStep === 1 && <Step1Metadata question={question} setQuestion={setQuestion} onValidityChange={setIsStep1Valid} />}
        {currentStep === 2 && <Step2Sequence question={question} setQuestion={setQuestion} />}
        {currentStep === 3 && <Step3Validation question={question} onValidityChange={setIsStep3Valid} />}
        {currentStep === 4 && <Step4Grading question={question} setQuestion={setQuestion} />}
        {currentStep === 5 && <Step5Preview question={question} />} 
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>Back</Button>

        <div className="flex gap-4">
            <Button 
                variant="secondary" 
                onClick={handleSaveDraft} 
                disabled={isSaving}
                className="gap-2"
            >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />} 
                Save Draft
            </Button>
            
            {currentStep === 5 ? (
                <Button 
                    onClick={handlePublish} 
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 text-white shadow-md gap-2"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Rocket className="w-4 h-4" />} 
                    Publish Question
                </Button>
            ) : (
                <Button onClick={handleNext} disabled={isNextDisabled()} className="bg-violet-600 hover:bg-violet-700 text-white">
                    Next Step →
                </Button>
            )}
        </div>
      </div>
    </div>
  );
}