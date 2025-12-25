'use client';
import { PageHeader } from "@/components/page-header";
import { WorksheetRandomBuilder } from "@/components/worksheet-random-builder";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import type { Question, Subject, Worksheet, Unit, Category } from "@/types";
import { collection, query, where, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorksheetManualBuilder } from "@/components/worksheet-manual-builder";

function AddQuestionsPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    // Details from previous page
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const title = searchParams.get('title');
    const unitId = searchParams.get('unitId');
    const mode = searchParams.get('mode') as 'practice' | 'exam';
    const examDate = searchParams.get('examDate');
    const startTime = searchParams.get('startTime');

    const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);

    const subjectDocRef = useMemoFirebase(() => (firestore && subjectId ? doc(firestore, 'subjects', subjectId) : null), [firestore, subjectId]);
    const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);

    const questionsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let q = query(collection(firestore, 'questions'), where('status', '==', 'published'));
        if (unitId) {
            return query(q, where('unitId', '==', unitId));
        }
        if (subjectId) {
            return query(q, where('subjectId', '==', subjectId));
        }
        return q;
    }, [firestore, subjectId, unitId]);
    
    const { data: questions, isLoading: areQuestionsLoading } = useCollection<Question>(questionsQuery);
    
    const allUnitsQuery = useMemoFirebase(() => (firestore && subjectId ? query(collection(firestore, 'units'), where('subjectId', '==', subjectId)) : null), [firestore, subjectId]);
    const { data: allUnits, isLoading: areUnitsLoading } = useCollection<Unit>(allUnitsQuery);

    const allCategoriesQuery = useMemoFirebase(() => {
        if (!firestore || !allUnits || allUnits.length === 0) return null;
        const unitIds = allUnits.map(u => u.id);
        // Firestore 'in' query limited to 30 items. This might need pagination for subjects with many units.
        return query(collection(firestore, 'categories'), where('unitId', 'in', unitIds.slice(0, 30)));
    }, [firestore, allUnits]);
    const { data: allCategories, isLoading: areCategoriesLoading } = useCollection<Category>(allCategoriesQuery);
    
    const backUrl = subjectId && classId ? `/worksheets/new?classId=${classId}&subjectId=${subjectId}` : '/worksheets';
    const isLoading = isSubjectLoading || areQuestionsLoading || areUnitsLoading || areCategoriesLoading;

    const handleCreateWorksheet = async () => {
        if (!user || !firestore || !classId || !subjectId || !title) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Missing required information to create worksheet.'
            });
            return;
        }

        const newWorksheet: Omit<Worksheet, 'id'> = {
            title,
            classId,
            subjectId,
            unitId: unitId || undefined,
            mode,
            questions: selectedQuestions.map(q => q.id),
            authorId: user.uid,
            status: 'draft', // Or 'published' depending on desired flow
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        if (mode === 'exam' && examDate) {
            const date = new Date(examDate);
            if (startTime) {
                const [hours, minutes] = startTime.split(':');
                date.setHours(parseInt(hours), parseInt(minutes));
            }
            newWorksheet.startTime = date;
        }

        try {
            await addDoc(collection(firestore, 'worksheets'), newWorksheet);
            toast({
                title: 'Worksheet Created',
                description: `"${title}" has been saved.`
            });
            router.push(`/worksheets/saved?classId=${classId}&subjectId=${subjectId}`);
        } catch (error) {
            console.error('Error creating worksheet:', error);
            toast({
                variant: 'destructive',
                title: 'Failed to create worksheet',
                description: 'An error occurred while saving the worksheet.'
            });
        }
    };
    
    const addQuestion = (question: Question) => {
        if (!selectedQuestions.find(q => q.id === question.id)) {
            setSelectedQuestions([...selectedQuestions, question]);
        }
    };


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
                Back to Details
            </Button>
            <PageHeader
                title={title || "Add Questions"}
                description={`Building worksheet for ${subject?.name || 'subject'}. Select questions for your assignment.`}
            />
            <Tabs defaultValue="random" className="w-full">
                <TabsList>
                    <TabsTrigger value="random">Random Worksheet</TabsTrigger>
                    <TabsTrigger value="manual">Manual Worksheet</TabsTrigger>
                </TabsList>
                <TabsContent value="random">
                     <WorksheetRandomBuilder 
                        availableQuestions={questions || []}
                        units={allUnits || []}
                        categories={allCategories || []}
                        selectedQuestions={selectedQuestions}
                        setSelectedQuestions={setSelectedQuestions}
                        onCreateWorksheet={handleCreateWorksheet}
                    />
                </TabsContent>
                 <TabsContent value="manual">
                    <WorksheetManualBuilder
                        availableQuestions={questions || []}
                        selectedQuestions={selectedQuestions}
                        addQuestion={addQuestion}
                        units={allUnits || []}
                        categories={allCategories || []}
                    />
                </TabsContent>
            </Tabs>

        </div>
    );
}


export default function AddQuestionsPage() {
    return (
        <Suspense fallback={<div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <AddQuestionsPageContent />
        </Suspense>
    )
}
