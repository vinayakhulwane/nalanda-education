'use client';
import { PageHeader } from "@/components/page-header";
import { useDoc, useFirestore, useMemoFirebase, useCollection, useUser } from "@/firebase";
import type { Subject, Unit } from "@/types";
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
    const { userProfile } = useUser();

    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    
    // Form State
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
    
    useEffect(() => {
        if (day && month && year) {
            // JS months are 0-indexed, so subtract 1
            const newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            setExamDate(newDate);
        } else {
            setExamDate(undefined);
        }
    }, [day, month, year]);
    
    const userIsEditor = userProfile?.role === 'admin' || userProfile?.role === 'teacher';

    const backUrl = useMemo(() => {
        if (!classId || !subjectId) return '/worksheets'; // Fallback
        if (userIsEditor) {
            return `/worksheets/${classId}/${subjectId}`;
        }
        // For students, go back to the academics page
        return `/academics/${classId}/${subjectId}`;
    }, [classId, subjectId, userIsEditor]);

    const isFormValid = useMemo(() => {
        if (!title) return false;
        if (mode === 'exam') {
            return !!examDate;
        }
        return true;
    }, [title, mode, examDate]);
    
    const handleProceed = () => {
        const queryParams = new URLSearchParams({
            classId: classId || '',
            subjectId: subjectId || '',
            title,
            unitId,
            mode,
        });

        if (mode === 'exam' && examDate) {
            queryParams.append('examDate', examDate.toISOString());
            queryParams.append('startTime', startTime);
        }
        
        router.push(`/worksheets/add-questions?${queryParams.toString()}`);
    }

    const isLoading = areUnitsLoading || isSubjectLoading;

    // Date logic
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-indexed
    const currentDay = today.getDate();

    const years = Array.from({ length: 10 }, (_, i) => currentYear + i);
    
    const availableMonths = useMemo(() => {
        const allMonths = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
        if (parseInt(year) === currentYear) {
            return allMonths.slice(currentMonth - 1);
        }
        return allMonths;
    }, [year, currentYear, currentMonth]);

    const daysInMonth = useMemo(() => {
        if (!month || !year) return 31;
        return new Date(parseInt(year), parseInt(month), 0).getDate();
    }, [month, year]);

    const availableDays = useMemo(() => {
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        if (parseInt(year) === currentYear && parseInt(month) === currentMonth) {
            return days.filter(d => d >= currentDay);
        }
        return days;
    }, [daysInMonth, year, month, currentYear, currentMonth, currentDay]);


    const handleYearChange = (newYear: string) => {
        setYear(newYear);
        setMonth('');
        setDay('');
    }

    const handleMonthChange = (newMonth: string) => {
        setMonth(newMonth);
        setDay('');
    }


    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

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
                            {userIsEditor && (
                                <Label htmlFor="exam" className="flex items-center space-x-2 border rounded-md p-3 flex-1 cursor-pointer hover:bg-muted/50 data-[state=checked]:border-primary">
                                    <RadioGroupItem value="exam" id="exam" />
                                    <span>Exam Mode</span>
                                </Label>
                            )}
                        </RadioGroup>
                    </div>
                    {mode === 'exam' && userIsEditor && (
                        <div className="pt-2 animate-in fade-in space-y-4">
                            <Label>Start Date & Time</Label>
                            <div className="flex flex-wrap gap-4">
                                <Select onValueChange={handleYearChange} value={year}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => (
                                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                    <Select onValueChange={handleMonthChange} value={month} disabled={!year}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableMonths.map(m => (
                                            <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                    <Select onValueChange={setDay} value={day} disabled={!month}>
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue placeholder="Day" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableDays.map(d => (
                                            <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
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

export default function NewWorksheetPage() {
    return (
        <Suspense fallback={<div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <NewWorksheetPageContent />
        </Suspense>
    )
}
