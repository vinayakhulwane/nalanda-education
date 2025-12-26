'use client';
import { PageHeader } from "@/components/page-header";
import { WorksheetRandomBuilder } from "@/components/worksheet-random-builder";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import type { Question, Subject, Worksheet, Unit, Category, EconomySettings } from "@/types"; 
import { collection, query, where, doc, addDoc, serverTimestamp, updateDoc, increment, getDoc } from "firebase/firestore"; // ✅ Added getDoc
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorksheetManualBuilder } from "@/components/worksheet-manual-builder";
import { calculateWorksheetCost } from "@/lib/wallet";

// Add a source property to track where the question came from
type QuestionWithSource = Question & { source?: 'manual' | 'random' };

function AddQuestionsPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const { user, userProfile } = useUser();
    const { toast } = useToast();

    // Details from previous page
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const title = searchParams.get('title');
    const unitId = searchParams.get('unitId');
    const mode = searchParams.get('mode') as 'practice' | 'exam';
    const examDate = searchParams.get('examDate');
    const startTime = searchParams.get('startTime');

    const [selectedQuestions, setSelectedQuestions] = useState<QuestionWithSource[]>([]);
    const [isCreating, setIsCreating] = useState(false);

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
        return query(collection(firestore, 'categories'), where('unitId', 'in', unitIds.slice(0, 30)));
    }, [firestore, allUnits]);
    const { data: allCategories, isLoading: areCategoriesLoading } = useCollection<Category>(allCategoriesQuery);
    
    const backUrl = subjectId && classId ? `/worksheets/new?classId=${classId}&subjectId=${subjectId}` : '/worksheets';
    const isLoading = isSubjectLoading || areQuestionsLoading || areUnitsLoading || areCategoriesLoading;

    const handleCreateWorksheet = async (worksheetTypeParam: 'classroom' | 'sample' | 'practice') => {
        if (!user || !userProfile || !firestore || !classId || !subjectId || !title) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Missing required information to create worksheet.'
            });
            return;
        }

        setIsCreating(true);

        try {
            const isEditor = userProfile.role === 'admin' || userProfile.role === 'teacher';
            const finalWorksheetType = isEditor ? worksheetTypeParam : 'practice';
            
            // --- Cost Calculation (Fixed: Fetch Fresh Settings) ---
            if (finalWorksheetType === 'practice') {
                // 1. Fetch the absolute latest settings from DB right now
                // This prevents "undefined" or stale data from React state
                const settingsSnap = await getDoc(doc(firestore, 'settings', 'economy'));
                const latestSettings = settingsSnap.exists() ? (settingsSnap.data() as EconomySettings) : undefined;

                // 2. Calculate using these fresh settings
                const cost = calculateWorksheetCost(selectedQuestions, latestSettings);
                
                // 3. Check Balance
                const canAfford = (userProfile.coins ?? 0) >= cost.coins && 
                                  (userProfile.gold ?? 0) >= cost.gold && 
                                  (userProfile.diamonds ?? 0) >= cost.diamonds;
                
                if (!canAfford) {
                    toast({
                        variant: 'destructive',
                        title: 'Insufficient Funds',
                        description: `You do not have enough currency to create this worksheet.`
                    });
                    setIsCreating(false);
                    return;
                }
                
                // 4. Atomic Wallet Deduction
                const userRef = doc(firestore, 'users', user.uid);
                const updatePayload: Record<string, any> = {};
                const transactionLogs: Promise<any>[] = [];
                const transactionDescription = `Practice Fee: ${title}`;

                if (cost.coins > 0) {
                    updatePayload['coins'] = increment(-cost.coins);
                    transactionLogs.push(addDoc(collection(firestore, 'transactions'), {
                        userId: user.uid,
                        type: 'spent',
                        description: transactionDescription,
                        amount: cost.coins,
                        currency: 'coin',
                        createdAt: serverTimestamp()
                    }));
                }
                if (cost.gold > 0) {
                    updatePayload['gold'] = increment(-cost.gold);
                    transactionLogs.push(addDoc(collection(firestore, 'transactions'), {
                        userId: user.uid,
                        type: 'spent',
                        description: transactionDescription,
                        amount: cost.gold,
                        currency: 'gold',
                        createdAt: serverTimestamp()
                    }));
                }
                if (cost.diamonds > 0) {
                    updatePayload['diamonds'] = increment(-cost.diamonds);
                    transactionLogs.push(addDoc(collection(firestore, 'transactions'), {
                        userId: user.uid,
                        type: 'spent',
                        description: transactionDescription,
                        amount: cost.diamonds,
                        currency: 'diamond',
                        createdAt: serverTimestamp()
                    }));
                }

                if (Object.keys(updatePayload).length > 0) {
                    await updateDoc(userRef, updatePayload);
                    await Promise.all(transactionLogs);
                }
            }
            
            const newWorksheet: Omit<Worksheet, 'id'> = {
                title,
                classId,
                subjectId,
                mode,
                worksheetType: finalWorksheetType,
                questions: selectedQuestions.map(q => q.id),
                authorId: user.uid,
                status: 'draft',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            if (unitId) {
                newWorksheet.unitId = unitId;
            }

            if (mode === 'exam' && examDate) {
                const date = new Date(examDate);
                if (startTime) {
                    const [hours, minutes] = startTime.split(':');
                    date.setHours(parseInt(hours), parseInt(minutes));
                }
                newWorksheet.startTime = date;
            }

            await addDoc(collection(firestore, 'worksheets'), newWorksheet);
            toast({
                title: 'Worksheet Created',
                description: `"${title}" has been saved.`
            });
            
            if (finalWorksheetType === 'practice' && classId && subjectId) {
                    router.push(`/academics/${classId}/${subjectId}`);
            } else if (classId && subjectId) {
                router.push(`/worksheets/saved?classId=${classId}&subjectId=${subjectId}`);
            } else {
                    router.push(`/dashboard`);
            }

        } catch (error) {
            console.error('Error creating worksheet:', error);
            toast({
                variant: 'destructive',
                title: 'Failed to create worksheet',
                description: 'An error occurred while saving the worksheet.'
            });
        } finally {
            setIsCreating(false);
        }
    };
    
    const addQuestion = (question: Question, source: 'manual' | 'random') => {
        if (!selectedQuestions.find(q => q.id === question.id)) {
            setSelectedQuestions([...selectedQuestions, { ...question, source }]);
        }
    };

    const removeQuestion = (questionId: string) => {
        setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
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
                        removeQuestion={removeQuestion}
                    />
                </TabsContent>
                 <TabsContent value="manual">
                    <WorksheetManualBuilder
                        availableQuestions={questions || []}
                        selectedQuestions={selectedQuestions}
                        addQuestion={addQuestion}
                        units={allUnits || []}
                        categories={allCategories || []}
                        removeQuestion={removeQuestion}
                        onCreateWorksheet={handleCreateWorksheet}
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