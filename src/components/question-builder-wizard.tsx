'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Class, Subject, Unit, Category, Question, SolutionStep } from '@/types';
import { AlertCircle, FileJson, Loader2, GripVertical, Plus, Trash2 } from 'lucide-react';
import { RichTextEditor } from './rich-text-editor';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StepEditor } from './step-editor';

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

    const [selectedClass, setSelectedClass] = useState(paramClassId || '');
    const [selectedSubject, setSelectedSubject] = useState(paramSubjectId || '');

    // Data fetching
    const { data: classes, isLoading: classesLoading } = useCollection<Class>(useMemoFirebase(() => firestore && collection(firestore, 'classes'), [firestore]));
    
    const subjectsQuery = useMemoFirebase(() => firestore && selectedClass ? query(collection(firestore, 'subjects'), where('classId', '==', selectedClass)) : null, [firestore, selectedClass]);
    const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

    const unitsQuery = useMemoFirebase(() => firestore && selectedSubject ? query(collection(firestore, 'units'), where('subjectId', '==', selectedSubject)) : null, [firestore, selectedSubject]);
    const { data: units, isLoading: unitsLoading } = useCollection<Unit>(unitsQuery);

    const categoriesQuery = useMemoFirebase(() => {
        if (!firestore || !units || units.length === 0) return null;
        const unitIds = units.map(u => u.id);
        if (unitIds.length === 0) return null;
        return query(collection(firestore, 'categories'), where('unitId', 'in', unitIds));
    }, [firestore, units]);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

    useEffect(() => {
        // When component mounts, if we have URL params, update the main question state
        if (paramClassId) setSelectedClass(paramClassId);
        if (paramSubjectId) setSelectedSubject(paramSubjectId);
    }, [paramClassId, paramSubjectId]);
    
    useEffect(() => {
        // Reset subject if class changes, unless it was pre-filled from URL param
        if (selectedClass !== paramClassId) {
            setSelectedSubject('');
            setQuestion({...question, unitId: undefined, categoryId: undefined});
        }
    }, [selectedClass, paramClassId]);

    const isFormValid = !!question.name && !!question.mainQuestionText && !!selectedClass && !!selectedSubject && !!question.unitId && !!question.categoryId && !!question.currencyType;

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
                    if (jsonData.mainQuestionText) {
                         setQuestion({...question, mainQuestionText: jsonData.mainQuestionText});
                    }
                    if (jsonData.name) {
                        setQuestion({...question, name: jsonData.name});
                    }
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
                    <Select onValueChange={val => setQuestion({...question, unitId: val})} value={question.unitId} disabled={!selectedSubject || unitsLoading}>
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
                     <Select onValueChange={val => setQuestion({...question, categoryId: val})} value={question.categoryId} disabled={!units || units.length === 0 || categoriesLoading}>
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

function SortableStepItem({ step, index, selectedStepId, setSelectedStepId, deleteStep }: { step: SolutionStep, index: number, selectedStepId: string | null, setSelectedStepId: (id: string) => void, deleteStep: (id: string) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => setSelectedStepId(step.id)}
            className={`p-3 border rounded-md cursor-pointer flex items-center gap-2 ${selectedStepId === step.id ? 'bg-muted ring-2 ring-primary' : 'hover:bg-muted/50'}`}
        >
            <button {...attributes} {...listeners} className="cursor-grab">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="font-medium text-sm flex-grow">{index + 1}. {step.title}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
        </div>
    );
}

function Step2SolutionBuilder({ onValidityChange, question, setQuestion } : { onValidityChange: (isValid: boolean) => void, question: Partial<Question>, setQuestion: (q: Partial<Question>) => void }) {
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

    useEffect(() => {
        const steps = question.solutionSteps || [];
        // If there are steps but none is selected, select the first one.
        if (steps.length > 0 && !selectedStepId) {
            setSelectedStepId(steps[0].id);
        }
        // If the selected step is deleted, select the previous one or null.
        if (selectedStepId && !steps.find(s => s.id === selectedStepId)) {
            const lastStep = steps[steps.length - 1];
            setSelectedStepId(lastStep ? lastStep.id : null);
        }
    }, [question.solutionSteps, selectedStepId]);

    const handleAddStep = () => {
        const newStep: SolutionStep = {
            id: uuidv4(),
            title: `New Step ${ (question.solutionSteps?.length || 0) + 1}`,
            description: '',
            stepQuestion: '',
            subQuestions: [],
        };
        const newSteps = [...(question.solutionSteps || []), newStep];
        setQuestion({ ...question, solutionSteps: newSteps });
        setSelectedStepId(newStep.id);
    };

    const handleStepDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = question.solutionSteps?.findIndex(s => s.id === active.id) ?? -1;
            const newIndex = question.solutionSteps?.findIndex(s => s.id === over.id) ?? -1;
            if (oldIndex !== -1 && newIndex !== -1) {
                const newSteps = arrayMove(question.solutionSteps!, oldIndex, newIndex);
                setQuestion({ ...question, solutionSteps: newSteps });
            }
        }
    };

    const selectedStep = useMemo(() => {
        return question.solutionSteps?.find(s => s.id === selectedStepId);
    }, [question.solutionSteps, selectedStepId]);
    
    const updateStep = (updatedStep: SolutionStep) => {
        const newSteps = question.solutionSteps?.map(s => s.id === updatedStep.id ? updatedStep : s);
        setQuestion({...question, solutionSteps: newSteps});
    }

    const deleteStep = (stepId: string) => {
        const newSteps = question.solutionSteps?.filter(s => s.id !== stepId);
        setQuestion({...question, solutionSteps: newSteps});
    }
    
    const isStepValid = !!question.solutionSteps && question.solutionSteps.length > 0;
     useEffect(() => {
        onValidityChange(isStepValid);
    }, [isStepValid, onValidityChange]);


    return (
        <div className="grid md:grid-cols-3 gap-6">
            {/* Left Panel: Step List */}
            <div className="md:col-span-1 space-y-2">
                <Button onClick={handleAddStep} className="w-full">
                    <Plus className="mr-2" /> Add Step
                </Button>
                <DndContext collisionDetection={closestCenter} onDragEnd={handleStepDragEnd}>
                    <SortableContext items={question.solutionSteps?.map(s => s.id) || []} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {question.solutionSteps?.map((step, index) => (
                                <SortableStepItem
                                    key={step.id}
                                    step={step}
                                    index={index}
                                    selectedStepId={selectedStepId}
                                    setSelectedStepId={setSelectedStepId}
                                    deleteStep={deleteStep}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
                 {(!question.solutionSteps || question.solutionSteps.length === 0) && (
                    <div className="text-center text-sm text-muted-foreground py-10 border-2 border-dashed rounded-lg">
                        No steps created yet. <br /> Click "Add Step" to begin.
                    </div>
                )}
            </div>

            {/* Right Panel: Step Editor */}
            <div className="md:col-span-2">
                {selectedStep ? (
                    <StepEditor key={selectedStep.id} step={selectedStep} updateStep={updateStep} />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-center border-2 border-dashed rounded-lg p-8">
                        Select a step on the left to edit it, or add a new one.
                    </div>
                )}
            </div>
        </div>
    );
}

function StepPlaceholder({ stepName }: { stepName: string }) {
    return (
        <div className="flex flex-col items-center justify-center text-center h-96 rounded-lg border-2 border-dashed">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4"/>
            <h3 className="text-xl font-bold font-headline">Work in Progress</h3>
            <p className="text-muted-foreground mt-2">The "{stepName}" feature is currently under construction. <br/> Please check back later.</p>
        </div>
    )
}

function Step3Validation({question}: {question: Partial<Question>}) {
     const validationRules = [
        { id: 'steps-exist', check: () => (question.solutionSteps?.length || 0) > 0, text: 'At least one step must exist.' },
        { id: 'steps-not-empty', check: () => question.solutionSteps?.every(s => s.title.trim() !== '' && s.stepQuestion.trim() !== ''), text: 'All steps must have a Title and Step Question.'},
        { id: 'subquestions-exist', check: () => question.solutionSteps?.every(s => s.subQuestions.length > 0), text: 'Each step must have at least one sub-question.' },
        { id: 'subquestions-answered', check: () => question.solutionSteps?.every(s => s.subQuestions.every(sq => sq.marks > 0)), text: 'All sub-questions must have marks assigned.' },
        // Add more specific answer checks here later
    ];

    const allValid = validationRules.every(rule => rule.check());

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
  const [currentStep, setCurrentStep] = useState(1);
  const [isStepValid, setStepValid] = useState(false);
  const [question, setQuestion] = useState<Partial<Question>>({
      solutionSteps: [],
      status: 'draft',
      gradingMode: 'system'
  });

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      setStepValid(false); // Reset validation for the next step
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setStepValid(true); // Assume previous steps are valid
    }
  };
  
  const handleStepValidityChange = (isValid: boolean) => {
    setStepValid(isValid);
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return <Step1Metadata onValidityChange={handleStepValidityChange} question={question} setQuestion={setQuestion}/>;
      case 2: return <Step2SolutionBuilder onValidityChange={handleStepValidityChange} question={question} setQuestion={setQuestion} />;
      case 3: return <Step3Validation question={question} />;
      case 4: return <StepPlaceholder stepName="Grading Settings" />;
      case 5: return <StepPlaceholder stepName="Preview & Save" />;
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <Progress value={progress} className="h-2 mb-4" />
        <CardTitle>{steps[currentStep - 1].name}</CardTitle>
        <CardDescription>{steps[currentStep - 1].description}</CardDescription>
      </CardHeader>
      <CardContent className="min-h-[400px]">
        {renderStepContent()}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
           {currentStep > 1 && <Button variant="outline" onClick={handleBack}>Back</Button>}
        </div>
        <div className="flex items-center gap-4">
            <Button variant="ghost">Save as Draft</Button>
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
