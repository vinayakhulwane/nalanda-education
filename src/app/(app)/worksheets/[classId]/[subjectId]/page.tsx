
'use client';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus2, Save, ArrowLeft, CalendarIcon } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import type { Subject, Unit } from "@/types";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function CreateWorksheetModal({ subject, units, children }: { subject: Subject; units: Unit[]; children: React.ReactNode }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [unitId, setUnitId] = useState('');
    const [mode, setMode] = useState<'practice' | 'exam'>('practice');
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [startTime, setStartTime] = useState('09:00');

    const isFormValid = title && (mode === 'practice' || (mode === 'exam' && startDate));

    const handleProceed = () => {
        const params = new URLSearchParams();
        params.set('classId', subject.classId);
        params.set('subjectId', subject.id);
        params.set('title', title);
        params.set('unitId', unitId);
        params.set('mode', mode);
        if (mode === 'exam' && startDate) {
            const [hours, minutes] = startTime.split(':').map(Number);
            startDate.setHours(hours, minutes);
            params.set('startTime', startDate.toISOString());
        }
        router.push(`/worksheets/new?${params.toString()}`);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>New Worksheet for {subject.name}</DialogTitle>
                    <DialogDescription>Define the identity and rules for your new worksheet before adding questions.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Chapter 5 Review" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="unit">Unit</Label>
                        <Select onValueChange={setUnitId} value={unitId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a unit (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Worksheet Mode</Label>
                        <RadioGroup defaultValue="practice" onValueChange={(v) => setMode(v as 'practice' | 'exam')} className="flex gap-4">
                            <Label htmlFor="practice" className="flex items-center space-x-2 border rounded-md p-3 flex-1 cursor-pointer hover:bg-muted/50">
                                <RadioGroupItem value="practice" id="practice" />
                                <span>Practice Mode</span>
                            </Label>
                            <Label htmlFor="exam" className="flex items-center space-x-2 border rounded-md p-3 flex-1 cursor-pointer hover:bg-muted/50">
                                <RadioGroupItem value="exam" id="exam" />
                                <span>Exam Mode</span>
                            </Label>
                        </RadioGroup>
                    </div>
                    {mode === 'exam' && (
                        <div className="grid grid-cols-2 gap-4 pt-2 animate-in fade-in">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal rounded-xl border-muted-foreground/20 h-11",
                                                !startDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                            {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl animate-in zoom-in-95 duration-200" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={startDate}
                                            onSelect={setStartDate}
                                            initialFocus
                                            className="p-3"
                                            classNames={{
                                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
                                                day_today: "bg-accent text-accent-foreground rounded-full",
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="start-time">Start Time</Label>
                                <Input
                                    id="start-time"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleProceed} disabled={!isFormValid}>Add Questions</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function SubjectWorksheetPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;
  const subjectId = params.subjectId as string;
  const firestore = useFirestore();

  const subjectDocRef = useMemoFirebase(() => (firestore && subjectId ? doc(firestore, 'subjects', subjectId) : null), [firestore, subjectId]);
  const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);
  
  const unitsQueryRef = useMemoFirebase(() => firestore && subjectId ? query(collection(firestore, 'units'), where('subjectId', '==', subjectId)) : null, [firestore, subjectId]);
  const { data: units, isLoading: areUnitsLoading } = useCollection<Unit>(unitsQueryRef);

  if (isSubjectLoading || areUnitsLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const savedWorksheetsUrl = `/worksheets/saved?classId=${classId}&subjectId=${subjectId}`;

  if (!subject || !units) {
      return (
        <div>
            <Button variant="ghost" onClick={() => router.push(`/worksheets/${classId}`)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Subjects
            </Button>
            <PageHeader title="Error" description="Could not load subject details."/>
        </div>
      )
  }

  return (
    <div>
        <Button variant="ghost" onClick={() => router.push(`/worksheets/${classId}`)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Subjects
        </Button>
        <PageHeader
            title={`Worksheets for ${subject?.name || 'Subject'}`}
            description="Build new assignments or manage your saved worksheets for this subject."
        />
        <div className="grid md:grid-cols-2 gap-6 mt-8 max-w-4xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <FilePlus2 className="text-primary" />
                    Create New Worksheet
                    </CardTitle>
                    <CardDescription>
                    Build a custom assignment by selecting questions from the question bank.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CreateWorksheetModal subject={subject} units={units}>
                        <Button className="w-full">
                            Start Building
                        </Button>
                    </CreateWorksheetModal>
                </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <Save className="text-primary" />
                Saved Worksheets
                </CardTitle>
                <CardDescription>
                View, edit, or assign your previously created worksheets for this subject.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button className="w-full" onClick={() => router.push(savedWorksheetsUrl)}>
                    View Saved
                </Button>
            </CardContent>
            </Card>
      </div>
    </div>
  );
}
