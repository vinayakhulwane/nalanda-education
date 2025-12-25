'use client';
import { PageHeader } from "@/components/page-header";
import { WorksheetBuilder } from "@/components/worksheet-builder";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import type { Question, Unit, Subject } from "@/types";
import { collection, query, where, doc } from "firebase/firestore";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

function NewWorksheetPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const firestore = useFirestore();

    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    
    // Form State
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [title, setTitle] = useState('');
    const [unitId, setUnitId] = useState('');
    const [mode, setMode] = useState<'practice' | 'exam'>('practice');
    const [examDate, setExamDate] = useState<Date | undefined>(undefined);
    const [startTime, setStartTime] = useState('09:00');

    // Date dropdown states
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');

    // Data Fetching
    const subjectDocRef = useMemoFirebase(() => (firestore && subjectId ? doc(firestore, 'subjects', subjectId) : null), [firestore, subjectId]);
    const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);

    const unitsQueryRef = useMemoFirebase(() => firestore && subjectId ? query(collection(firestore, 'units'), where('subjectId', '==', subjectId)) : null, [firestore, subjectId]);
    const { data: units, isLoading: areUnitsLoading } = useCollection<Unit>(unitsQueryRef);

    const questionsQuery = useMemoFirebase(() => {
        if (!firestore || !formSubmitted) return null; // Only fetch questions after form submission
        let q = collection(firestore, 'questions');
        if (unitId) {
            return query(q, where('unitId', '==', unitId));
        }
        if (subjectId) {
            return query(q, where('subjectId', '==', subjectId));
        }
        return q;
    }, [firestore, subjectId, unitId, formSubmitted]);
    
    const { data: questions, isLoading: areQuestionsLoading } = useCollection<Question>(questionsQuery);
    
    useEffect(() => {
        if (day && month && year) {
            // JS months are 0-indexed, so subtract 1
            const newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            setExamDate(newDate);
        } else {
            setExamDate(undefined);
        }
    }, [day, month, year]);

    const isFormValid = useMemo(() => {
        if (!title) return false;
        if (mode === 'exam') {
            return !!examDate;
        }
        return true;
    }, [title, mode, examDate]);
    
    const handleProceed = () => {
        setFormSubmitted(true);
    }

    const backUrl = subjectId && classId ? `/worksheets/${classId}/${subjectId}` : '/worksheets';
    const isLoading = areUnitsLoading || isSubjectLoading || (formSubmitted && areQuestionsLoading);

    // Dynamic date parts for dropdowns
    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);
    const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
    const daysInMonth = useMemo(() => {
        if (!month || !year) return 31;
        return new Date(parseInt(year), parseInt(month), 0).getDate();
    }, [month, year]);

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!formSubmitted) {
        return (
             <div>
                <Button variant="ghost" onClick={() => router.push(backUrl)} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <PageHeader
                    title="Create New Worksheet"
                    description={`For subject: ${subject?.name || 'Loading...'}`}
                />
                 <Card className="max-w-3xl mx-auto">
                    <CardHeader>
                        <CardTitle>Worksheet Details</CardTitle>
                        <CardDescription>Define the identity and rules for your new worksheet before adding questions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Chapter 5 Review" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unit">Unit (Optional)</Label>
                            <Select onValueChange={setUnitId} value={unitId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter questions by a specific unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    {units?.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Worksheet Mode</Label>
                            <RadioGroup defaultValue="practice" onValueChange={(v) => setMode(v as 'practice' | 'exam')} className="flex gap-4">
                                <Label htmlFor="practice" className="flex items-center space-x-2 border rounded-md p-3 flex-1 cursor-pointer hover:bg-muted/50 data-[state=checked]:border-primary">
                                    <RadioGroupItem value="practice" id="practice" />
                                    <span>Practice Mode</span>
                                </Label>
                                <Label htmlFor="exam" className="flex items-center space-x-2 border rounded-md p-3 flex-1 cursor-pointer hover:bg-muted/50 data-[state=checked]:border-primary">
                                    <RadioGroupItem value="exam" id="exam" />
                                    <span>Exam Mode</span>
                                </Label>
                            </RadioGroup>
                        </div>
                        {mode === 'exam' && (
                            <div className="pt-2 animate-in fade-in space-y-4">
                                <Label>Start Date & Time</Label>
                                <div className="flex flex-wrap gap-4">
                                    <Select onValueChange={setDay} value={day}>
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue placeholder="Day" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                                                <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                     <Select onValueChange={setMonth} value={month}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {months.map(m => (
                                                <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                     <Select onValueChange={setYear} value={year}>
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map(y => (
                                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        id="start-time"
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-[150px]"
                                    />
                                </div>
                            </div>
                        )}
                         <Button onClick={handleProceed} disabled={!isFormValid} className="w-full">Add Questions</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div>
            <Button variant="ghost" onClick={() => setFormSubmitted(false)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Details
            </Button>
            <PageHeader
                title={title || "Create New Worksheet"}
                description="Build your assignment by selecting questions from the bank."
            />
            <WorksheetBuilder availableQuestions={questions || []} />
        </div>
    );
}

export default function NewWorksheetPage() {
    return (
        <Suspense fallback={<div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <NewWorksheetPageContent />
        </Suspense>
    )
}
