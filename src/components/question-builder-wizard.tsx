
'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Class, Subject, Unit, Category, Question } from '@/types';
import { AlertCircle, FileJson, Loader2, Download, Check } from 'lucide-react';
import { RichTextEditor } from './rich-text-editor';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useRouter } from 'next/navigation';
import { Step2SolutionBuilder } from './question-builder/step-2-solution-builder';
import { Step4Grading } from './question-builder/step-4-grading';
import { QuestionRunner } from './question-runner';
import { cn } from '@/lib/utils';


const steps = [
  { id: 1, name: 'Metadata', description: 'Basic question identity' },
  { id: 2, name: 'Steps', description: 'Solution builder engine' },
  { id: 3, name: 'Validation', description: 'System integrity check' },
  { id: 4, name: 'Grading', description: 'Evaluation settings' },
  { id: 5, name: 'Preview & Save', description: 'Final review and publish' },
];

function Step1Metadata({ onValidityChange, question, setQuestion }: { onValidityChange: (isValid: boolean) => void, question: Partial<Question>, setQuestion: (q: Partial<Question>) => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();

    const paramClassId = searchParams.get('classId');
    const paramSubjectId = searchParams.get('subjectId');

    const [selectedClass, setSelectedClass] = useState(question.classId || paramClassId || '');
    const [selectedSubject, setSelectedSubject] = useState(question.subjectId || paramSubjectId || '');

    // Data fetching
    const { data: classes, isLoading: classesLoading } = useCollection<Class>(useMemoFirebase(() => firestore && collection(firestore, 'classes'), [firestore]));
    
    const subjectsQuery = useMemoFirebase(() => firestore && selectedClass ? query(collection(firestore, 'subjects'), where('classId', '==', selectedClass)) : null, [firestore, selectedClass]);
    const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

    const unitsQuery = useMemoFirebase(() => firestore && selectedSubject ? query(collection(firestore, 'units'), where('subjectId', '==', selectedSubject)) : null, [firestore, selectedSubject]);
    const { data: units, isLoading: unitsLoading } = useCollection<Unit>(unitsQuery);

    const categoriesQuery = useMemoFirebase(() => {
        if (!firestore || !question.unitId) return null;
        return query(collection(firestore, 'categories'), where('unitId', '==', question.unitId));
    }, [firestore, question.unitId]);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

    useEffect(() => {
        setQuestion(prev => ({...prev, classId: selectedClass, subjectId: selectedSubject}));
    }, [selectedClass, selectedSubject, setQuestion]);

    useEffect(() => {
        // Reset subject if class changes
        if (selectedClass !== question.classId) {
            setSelectedSubject('');
            setQuestion(prev => ({...prev, subjectId: undefined, unitId: undefined, categoryId: undefined}));
        }
    }, [selectedClass, question.classId, setQuestion]);

    useEffect(() => {
        // Reset unit/category if subject changes
        if(selectedSubject !== question.subjectId) {
            setQuestion(prev => ({...prev, unitId: undefined, categoryId: undefined}));
        }
    }, [selectedSubject, question.subjectId, setQuestion]);


    const isFormValid = !!question.name && !!question.mainQuestionText && !!question.classId && !!question.subjectId && !!question.unitId && !!question.categoryId && !!question.currencyType;

     useEffect(() => {
      onValidityChange(isFormValid);
    }, [isFormValid, onValidityChange]);

    const handleBulkUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const jsonData = JSON.parse(content);
                    // Here you would have more robust validation and state setting
                    setQuestion(prev => ({...prev, ...jsonData}));

                    toast({
                        title: 'Success',
                        description: 'JSON data loaded successfully.',
                    });

                } catch (error) {
                    console.error("Failed to parse JSON:", error);
                    toast({
                        variant: "destructive",
                        title: 'Upload Failed',
                        description: 'The selected file is not valid JSON.',
                    });
                }
            };
            reader.readAsText(file);
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                 <Button variant="outline" onClick={handleBulkUploadClick}>
                    <FileJson className="mr-2 h-4 w-4" />
                    Bulk Upload JSON
                </Button>
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="application/json"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="q-name">Question Name</Label>
                <Input id="q-name" placeholder="Internal reference name for this question" value={question.name || ''} onChange={e => setQuestion({...question, name: e.target.value})} />
            </div>
             <div className="space-y-2">
                <Label>Main Question Text</Label>
                <RichTextEditor value={question.mainQuestionText || ''} onChange={val => setQuestion({...question, mainQuestionText: val})} />
            </div>

            <h3 className="text-md font-medium pt-4">Academic Context</h3>
            <div className="grid md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Class</Label>
                    <Select onValueChange={setSelectedClass} value={selectedClass}>
                        <SelectTrigger disabled={classesLoading}>
                            <SelectValue placeholder={classesLoading ? 'Loading classes...' : 'Select a class'} />
                        </SelectTrigger>
                        <SelectContent>
                            {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={!selectedClass || subjectsLoading}>
                        <SelectTrigger>
                            <SelectValue placeholder={subjectsLoading ? 'Loading subjects...' : 'Select a subject'} />
                        </SelectTrigger>
                        <SelectContent>
                            {subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

             <div className="grid md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select onValueChange={val => setQuestion({...question, unitId: val, categoryId: undefined})} value={question.unitId} disabled={!selectedSubject || unitsLoading}>
                        <SelectTrigger>
                            <SelectValue placeholder={unitsLoading ? 'Loading units...' : 'Select a unit'} />
                        </SelectTrigger>
                        <SelectContent>
                            {units?.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label>Category</Label>
                     <Select onValueChange={val => setQuestion({...question, categoryId: val})} value={question.categoryId} disabled={!question.unitId || categoriesLoading}>
                        <SelectTrigger>
                            <SelectValue placeholder={categoriesLoading ? 'Loading...' : 'Select a category'} />
                        </SelectTrigger>
                        <SelectContent>
                           {categories?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
             <div className="space-y-2">
                <Label>Currency Type</Label>
                <Select onValueChange={val => setQuestion({...question, currencyType: val as any})} value={question.currencyType}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a currency reward for this question" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="spark">Spark</SelectItem>
                        <SelectItem value="coin">Coin</SelectItem>
                        <SelectItem value="gold">Gold</SelectItem>
                        <SelectItem value="diamond">Diamond</SelectItem>
                    </SelectContent>
                </Select>
            </div>

        </div>
    )
}

function Step3Validation({question, onValidityChange}: {question: Partial<Question>, onValidityChange: (isValid: boolean) => void}) {
     const validationRules = useMemo(() => [
        { id: 'steps-exist', check: () => (question.solutionSteps?.length || 0) > 0, text: 'At least one step must exist.' },
        { id: 'steps-not-empty', check: () => question.solutionSteps?.every(s => s.title.trim() !== '' && s.stepQuestion.trim() !== ''), text: 'All steps must have a Title and Step Objective.'},
        { id: 'subquestions-exist', check: () => question.solutionSteps?.every(s => s.subQuestions.length > 0), text: 'Each step must have at least one sub-question.' },
        { id: 'subquestions-answered', check: () => question.solutionSteps?.every(s => s.subQuestions.every(sq => sq.marks > 0)), text: 'All sub-questions must have marks assigned.' },
        // Add more specific answer checks here later
    ], [question.solutionSteps]);

    const allValid = useMemo(() => validationRules.every(rule => rule.check()), [validationRules]);
    
    useEffect(() => {
        onValidityChange(allValid);
    }, [allValid, onValidityChange]);

    return (
        <div className="space-y-4">
            <Alert variant={allValid ? 'default' : 'destructive'}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{allValid ? 'Validation Passed' : 'Validation Failed'}</AlertTitle>
                <AlertDescription>
                    {allValid ? 'All rules are met. You can proceed to the next step.' : 'Please fix the issues below before proceeding.'}
                </AlertDescription>
            </Alert>
            <div className="p-6 border rounded-lg">
                <h3 className="font-semibold mb-4">Validation Checks</h3>
                 <ul className="space-y-2 text-sm">
                    {validationRules.map(rule => (
                        <li key={rule.id} className={`flex items-center gap-2 ${rule.check() ? 'text-green-600' : 'text-destructive'}`}>
                            {rule.check() ? '✅' : '❌'}
                            <span className={rule.check() ? 'text-muted-foreground' : 'font-medium'}>{rule.text}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}


export function QuestionBuilderWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const questionId = searchParams.get('questionId');

  const [currentStep, setCurrentStep] = useState(1);
  const [isStepValid, setStepValid] = useState(false);
  const [question, setQuestion] = useState<Partial<Question>>({
      solutionSteps: [],
      status: 'draft',
      gradingMode: 'system'
  });
  const [isLoading, setIsLoading] = useState(!!questionId);
  
  const questionDocRef = useMemoFirebase(() => {
    if (!firestore || !questionId) return null;
    return doc(firestore, 'questions', questionId);
  }, [firestore, questionId]);

  const { data: fetchedQuestion } = useDoc<Question>(questionDocRef);

  useEffect(() => {
      if (fetchedQuestion) {
          setQuestion(fetchedQuestion);
          setIsLoading(false);
      }
       // If we have a questionId but no fetchedQuestion, it might be loading or not exist.
      // We set isLoading to false only when we are NOT in edit mode (no questionId).
      if (!questionId) {
          setIsLoading(false);
      }
  }, [fetchedQuestion, questionId]);

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleStepValidityChange = (isValid: boolean) => {
    setStepValid(isValid);
  }
  
  useEffect(() => {
    // This effect re-evaluates validity whenever the current step or the question data changes.
     switch (currentStep) {
        case 1:
            const isMetaValid = !!question.name && !!question.mainQuestionText && !!question.classId && !!question.subjectId && !!question.unitId && !!question.categoryId && !!question.currencyType;
            setStepValid(isMetaValid);
            break;
        case 2:
            setStepValid((question.solutionSteps?.length || 0) > 0);
            break;
        case 3:
            const rules = [
                { check: () => (question.solutionSteps?.length || 0) > 0 },
                { check: () => question.solutionSteps?.every(s => s.title.trim() !== '' && s.stepQuestion.trim() !== '') },
                { check: () => question.solutionSteps?.every(s => s.subQuestions.length > 0) },
                { check: () => question.solutionSteps?.every(s => s.subQuestions.every(sq => sq.marks > 0)) },
            ];
            setStepValid(rules.every(rule => rule.check()));
            break;
        case 4:
            if (question.gradingMode === 'system') {
                setStepValid(true);
            } else {
                const totalWeightage = Object.values(question.aiRubric || {}).reduce((sum, val) => sum + val, 0);
                setStepValid(totalWeightage === 100);
            }
            break;
        case 5:
            // Preview step is always "valid" to proceed to publish, actual validation is on the whole object
            setStepValid(true);
            break;
        default:
            setStepValid(false);
            break;
    }
  }, [currentStep, question]);

  const handleSaveDraft = async () => {
    if (!firestore || !user) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Cannot save. User or database not available.",
        });
        return;
    }
    
    const dataToSave = {
        ...question,
        authorId: user.uid,
        status: 'draft',
        updatedAt: serverTimestamp()
    };

    try {
        if (question.id) {
            // Update existing question
            const questionRef = doc(firestore, 'questions', question.id);
            await updateDoc(questionRef, dataToSave);
            toast({
                title: "Draft Updated",
                description: "Your changes have been saved.",
            });
        } else {
            // Create new question
            const collectionRef = collection(firestore, 'questions');
            const docRef = await addDoc(collectionRef, { ...dataToSave, createdAt: serverTimestamp() });
            setQuestion(prev => ({...prev, id: docRef.id})); // Set new ID in state
            toast({
                title: "Draft Saved",
                description: "Question has been saved as a draft.",
            });
             // Optionally, update URL without navigation
            router.replace(`/questions/new?questionId=${docRef.id}`, { scroll: false });
        }

    } catch (error) {
        console.error("Error saving draft:", error);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: "Could not save the draft. Please try again.",
        });
    }
};

  const handleExportJson = () => {
    if (!question) return;
    const jsonString = JSON.stringify(question, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(question.name || 'question').replace(/ /g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const renderStepContent = () => {
    if (isLoading) {
        return <div className="flex h-full min-h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }
    switch (currentStep) {
      case 1: return <Step1Metadata onValidityChange={handleStepValidityChange} question={question} setQuestion={setQuestion}/>;
      case 2: return <Step2SolutionBuilder onValidityChange={handleStepValidityChange} question={question} setQuestion={setQuestion} />;
      case 3: return <Step3Validation question={question} onValidityChange={handleStepValidityChange}/>;
      case 4: return <Step4Grading onValidityChange={handleStepValidityChange} question={question} setQuestion={setQuestion} />;
      case 5: return (
        <div>
            <QuestionRunner question={question as Question} />
        </div>
      );
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex w-full items-center justify-between p-4">
            {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center">
                        <div
                            className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-full border-2',
                                currentStep > step.id ? 'border-primary bg-primary text-primary-foreground' : '',
                                currentStep === step.id ? 'border-primary' : '',
                                currentStep < step.id ? 'border-border' : ''
                            )}
                        >
                            {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                        </div>
                        <p className={cn('mt-2 text-xs text-center', currentStep === step.id ? 'font-semibold text-primary' : 'text-muted-foreground')}>{step.name}</p>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={cn(
                            'flex-1 h-px bg-border -mx-4',
                            currentStep > step.id ? 'bg-primary' : ''
                        )} />
                    )}
                </React.Fragment>
            ))}
        </div>
        <CardTitle>{steps[currentStep - 1].name}</CardTitle>
        <CardDescription>{steps[currentStep - 1].description}</CardDescription>
        {currentStep === 5 && (
          <div className="flex justify-end pt-4">
            <Button variant="outline" size="sm" onClick={handleExportJson}>
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="min-h-[400px]">
        {renderStepContent()}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
           {currentStep > 1 && <Button variant="outline" onClick={handleBack}>Back</Button>}
        </div>
        <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleSaveDraft}>Save as Draft</Button>
            {currentStep < steps.length ? (
                <Button onClick={handleNext} disabled={!isStepValid}>Next</Button>
            ) : (
                <Button disabled={!isStepValid}>Publish</Button>
            )}
        </div>
      </CardFooter>
    </Card>
  );
}

