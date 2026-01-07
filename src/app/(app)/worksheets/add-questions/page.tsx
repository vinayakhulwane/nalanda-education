'use client';
import { PageHeader } from "@/components/page-header";
import { WorksheetRandomBuilder } from "@/components/worksheet-random-builder";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import type { Question, Subject, Worksheet, Unit, Category, EconomySettings } from "@/types"; 
import { collection, query, where, doc, addDoc, serverTimestamp, updateDoc, increment, getDoc, writeBatch } from "firebase/firestore"; 
import { Loader2, ArrowLeft, Wand2, PenTool } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorksheetManualBuilder from "@/components/worksheet-manual-builder";
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
        if (unitIds.length === 0) return null; 
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
            
            // --- Cost Calculation ---
            if (finalWorksheetType === 'practice') {
                const settingsSnap = await getDoc(doc(firestore, 'settings', 'economy'));
                const latestSettings = settingsSnap.exists() ? (settingsSnap.data() as EconomySettings) : undefined;

                const cost = calculateWorksheetCost(selectedQuestions, latestSettings);
                
                const canAfford = (userProfile.coins ?? 0) >= cost.coins && 
                                  (userProfile.gold ?? 0) >= cost.gold && 
                                  (userProfile.diamonds ?? 0) >= cost.diamonds &&
                                  ((userProfile.aiCredits ?? 0) >= (cost.aiCredits ?? 0));
                
                if (!canAfford) {
                    toast({
                        variant: 'destructive',
                        title: 'Insufficient Funds',
                        description: `You do not have enough currency to create this worksheet.`
                    });
                    setIsCreating(false);
                    return;
                }
                
                const userRef = doc(firestore, 'users', user.uid);
                const batch = writeBatch(firestore);
                const transactionDescription = `Practice Fee: ${title}`;

                if (cost.coins > 0) {
                    batch.update(userRef, { 'coins': increment(-cost.coins) });
                    batch.set(doc(collection(firestore, 'transactions')), { userId: user.uid, type: 'spent', description: transactionDescription, amount: cost.coins, currency: 'coin', createdAt: serverTimestamp() });
                }
                if (cost.gold > 0) {
                    batch.update(userRef, { 'gold': increment(-cost.gold) });
                    batch.set(doc(collection(firestore, 'transactions')), { userId: user.uid, type: 'spent', description: transactionDescription, amount: cost.gold, currency: 'gold', createdAt: serverTimestamp() });
                }
                if (cost.diamonds > 0) {
                    batch.update(userRef, { 'diamonds': increment(-cost.diamonds) });
                    batch.set(doc(collection(firestore, 'transactions')), { userId: user.uid, type: 'spent', description: transactionDescription, amount: cost.diamonds, currency: 'diamond', createdAt: serverTimestamp() });
                }
                if (cost.aiCredits && cost.aiCredits > 0) {
                    batch.update(userRef, { 'aiCredits': increment(-cost.aiCredits) });
                    batch.set(doc(collection(firestore, 'transactions')), { userId: user.uid, type: 'spent', description: transactionDescription, amount: cost.aiCredits, currency: 'aiCredits', createdAt: serverTimestamp() });
                }
                
                await batch.commit();
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
    
    // Add Question with AI Limit Logic
    const addQuestion = (question: Question, source: 'manual' | 'random') => {
        // 1. Prevent Duplicates
        if (selectedQuestions.find(q => q.id === question.id)) {
            return;
        }

        // 2. TRAFFIC CONTROL: Limit to 1 AI Question per Worksheet
        if (question.gradingMode === 'ai') {
            const hasAiQuestion = selectedQuestions.some(q => q.gradingMode === 'ai');
            
            if (hasAiQuestion) {
                toast({
                    variant: "destructive",
                    title: "AI Limit Reached",
                    description: "You can only add 1 AI-graded question per worksheet.",
                });
                return; // Stop execution, do not add question
            }
        }

        // 3. Add to Cart if checks pass
        setSelectedQuestions([...selectedQuestions, { ...question, source }]);
    };

    const removeQuestion = (questionId: string) => {
        setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
    };


    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 h-[calc(100vh-4rem)] w-full items-center justify-center bg-slate-50/50 dark:bg-slate-950/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Loading worksheet builder...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50/30 dark:bg-slate-950/30 pb-20">
             <div className="container max-w-7xl mx-auto px-4 py-6">
                <Button variant="ghost" onClick={() => router.push(backUrl)} className="mb-6 hover:bg-slate-100 dark:hover:bg-slate-800 -ml-2">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Setup
                </Button>
                
                <div className="mb-8 space-y-2">
                    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                        Builder Mode
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
                        {title || "Untitled Worksheet"}
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl">
                        {subject?.name ? `Curating content for ${subject.name}.` : 'Select questions below.'} Choose a method to begin.
                    </p>
                </div>

                <Tabs defaultValue="random" className="w-full space-y-8">
                    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 border-b">
                        <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                            <TabsTrigger value="random" className="rounded-full px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all">
                                <Wand2 className="mr-2 h-4 w-4" /> Random Builder
                            </TabsTrigger>
                            <TabsTrigger value="manual" className="rounded-full px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all">
                                <PenTool className="mr-2 h-4 w-4" /> Manual Selection
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <TabsContent value="random" className="mt-0">
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
                         <TabsContent value="manual" className="mt-0">
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
                    </div>
                </Tabs>
            </div>
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
