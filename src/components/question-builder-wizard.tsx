'use client';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Class, Subject, Unit, Category } from '@/types';
import { AlertCircle, FileJson, Loader2 } from 'lucide-react';
import { RichTextEditor } from './rich-text-editor';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const steps = [
  { id: 1, name: 'Metadata', description: 'Basic question identity' },
  { id: 2, name: 'Steps', description: 'Solution builder engine' },
  { id: 3, name: 'Validation', description: 'System integrity check' },
  { id: 4, name: 'Grading', description: 'Evaluation settings' },
  { id: 5, name: 'Preview & Save', description: 'Final review and publish' },
];

function Step1Metadata({ onValidityChange }: { onValidityChange: (isValid: boolean) => void }) {
    const firestore = useFirestore();

    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [mainQuestionText, setMainQuestionText] = useState('');

    // Data fetching
    const { data: classes, isLoading: classesLoading } = useCollection<Class>(useMemoFirebase(() => firestore && collection(firestore, 'classes'), [firestore]));
    
    const subjectsQuery = useMemoFirebase(() => firestore && selectedClass ? query(collection(firestore, 'subjects'), where('classId', '==', selectedClass)) : null, [firestore, selectedClass]);
    const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

    const unitsQuery = useMemoFirebase(() => firestore && selectedSubject ? query(collection(firestore, 'units'), where('subjectId', '==', selectedSubject)) : null, [firestore, selectedSubject]);
    const { data: units, isLoading: unitsLoading } = useCollection<Unit>(unitsQuery);

    const categoriesQuery = useMemoFirebase(() => {
        if (!firestore || !units || units.length === 0) return null;
        const unitIds = units.map(u => u.id);
        return query(collection(firestore, 'categories'), where('unitId', 'in', unitIds));
    }, [firestore, units]);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

    // TODO: Connect form inputs to a state management solution (e.g., useForm) and perform validation.
    // For now, we'll just enable the next step.
    useEffect(() => {
      onValidityChange(true); // Placeholder
    }, [onValidityChange]);


    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                 <Button variant="outline">
                    <FileJson className="mr-2 h-4 w-4" />
                    Bulk Upload JSON
                </Button>
            </div>
            <div className="space-y-2">
                <Label htmlFor="q-name">Question Name</Label>
                <Input id="q-name" placeholder="Internal reference name for this question" />
            </div>
             <div className="space-y-2">
                <Label>Main Question Text</Label>
                <RichTextEditor value={mainQuestionText} onChange={setMainQuestionText} />
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
                    <Select disabled={!selectedSubject || unitsLoading}>
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
                     <Select disabled={!units || units.length === 0 || categoriesLoading}>
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
                <Select>
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

function StepPlaceholder({ stepName }: { stepName: string }) {
    return (
        <div className="flex flex-col items-center justify-center text-center h-96 rounded-lg border-2 border-dashed">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4"/>
            <h3 className="text-xl font-bold font-headline">Work in Progress</h3>
            <p className="text-muted-foreground mt-2">The "{stepName}" feature is currently under construction. <br/> Please check back later.</p>
        </div>
    )
}

function Step3Validation() {
    return (
        <div className="space-y-4">
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Automated Gatekeeper</AlertTitle>
                <AlertDescription>
                    This step automatically validates the integrity of your question. The 'Next' button will be enabled once all rules are met.
                </AlertDescription>
            </Alert>
            <div className="p-6 border rounded-lg">
                <h3 className="font-semibold mb-4">Validation Checks</h3>
                 <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        Checking for empty Step Titles or Questions...
                    </li>
                    <li className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        Verifying all sub-questions have answers and marks...
                    </li>
                    <li className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        Ensuring all numerical answers have a tolerance value...
                    </li>
                    <li className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        Confirming total marks for the question are greater than 0...
                    </li>
                </ul>
            </div>
        </div>
    )
}


export function QuestionBuilderWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isStepValid, setStepValid] = useState(false);

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
      case 1: return <Step1Metadata onValidityChange={handleStepValidityChange} />;
      case 2: return <StepPlaceholder stepName="Solution Builder Engine" />;
      case 3: return <Step3Validation />;
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
      <CardContent>
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
