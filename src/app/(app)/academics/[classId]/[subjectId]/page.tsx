'use client';
import { useMemo, Suspense } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Subject, User as AppUser, Class, CustomTab } from '@/types';
import { useParams } from 'next/navigation';
import { Loader2, BookOpenCheck, LayoutGrid, FileText, BarChart3, Trophy, Lock } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import SyllabusEditor from '@/components/academics/syllabus-editor';
import Leaderboard from '@/components/academics/leaderboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorksheetList } from "@/components/academics/worksheet-list";
import PracticeZone from "@/components/academics/practice-zone";
import { UnlockContentCard } from '@/components/academics/unlock-content-card';
import { calculateWorksheetCost } from '@/lib/wallet';

function SubjectWorkspacePage() {
    const params = useParams();
    const classId = params.classId as string;
    const subjectId = params.subjectId as string;
    const firestore = useFirestore();
    const { user, userProfile } = useUser();
    const { toast } = useToast();

    // Data Fetching
    const subjectDocRef = useMemoFirebase(() => (firestore && subjectId ? doc(firestore, 'subjects', subjectId) : null), [firestore, subjectId]);
    const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);

    const classDocRef = useMemoFirebase(() => (firestore && classId ? doc(firestore, 'classes', classId) : null), [firestore, classId]);
    const { data: classData, isLoading: isClassLoading } = useDoc<Class>(classDocRef);
    
    // Derived state
    const isEnrolled = useMemo(() => userProfile?.enrollments?.includes(subjectId) ?? false, [userProfile, subjectId]);
    const userIsEditor = useMemo(() => userProfile?.role === 'admin' || userProfile?.role === 'teacher', [userProfile]);

    const handleEnrollment = async () => {
        if (!user || !firestore) return;
        const userRef = doc(firestore, 'users', user.uid);
        try {
            if (isEnrolled) {
                await updateDoc(userRef, { enrollments: arrayRemove(subjectId) });
                toast({ title: "Unenrolled", description: `You have left ${subject?.name}.` });
            } else {
                await updateDoc(userRef, { enrollments: arrayUnion(subjectId) });
                toast({ title: "Enrolled!", description: `Welcome to ${subject?.name}.` });
            }
        } catch (error) {
            console.error("Enrollment error:", error);
            toast({ variant: "destructive", title: "Update Failed", description: "Could not update enrollment." });
        }
    };
    
    const handleUnlockTab = async (tabId: string, cost: number, currency: any) => {
        if (!user || !firestore || !userProfile) return;
        
        const currencyField = currency === 'coin' ? 'coins' : currency;
        const currentBalance = (userProfile as any)[currencyField] || 0;

        if (currentBalance < cost) {
            toast({ variant: 'destructive', title: `Insufficient ${currency}`, description: `You need ${cost} ${currency} to unlock this.` });
            return;
        }

        const userRef = doc(firestore, 'users', user.uid);
        try {
            await updateDoc(userRef, {
                unlockedTabs: arrayUnion(`${subjectId}_${tabId}`),
                [currencyField]: (currentBalance - cost)
            });
            toast({ title: 'Content Unlocked!', description: 'You now have access to this tab.' });
        } catch (error) {
            console.error("Unlock error:", error);
            toast({ variant: 'destructive', title: 'Unlock Failed', description: 'Could not unlock content.' });
        }
    };


    if (isSubjectLoading || isClassLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading Subject...</p>
            </div>
        );
    }
    
    if (!subject) {
        return <div className="text-center py-10">Subject not found.</div>;
    }

    const defaultTab = userIsEditor ? 'syllabus' : 'assignments';
    const unlockedTabsSet = new Set(userProfile?.unlockedTabs || []);
    
    return (
        <div className="p-4 md:p-6 lg:p-8">
            <PageHeader title={subject.name} description={classData?.name || ''} />
            
            {!userIsEditor && (
                <Button onClick={handleEnrollment} className="mb-6">
                    {isEnrolled ? (
                        <>
                            <BookOpenCheck className="mr-2 h-4 w-4" />
                            Enrolled
                        </>
                    ) : (
                        "Enroll in Subject"
                    )}
                </Button>
            )}

            <Tabs defaultValue={defaultTab}>
                <TabsList className="grid grid-cols-2 md:inline-flex md:w-auto w-full md:grid-cols-5 h-auto md:h-10 p-1 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
                    <TabsTrigger value="assignments" className="rounded-full text-sm font-semibold h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950">Assignments</TabsTrigger>
                    {userProfile?.role === 'student' && <TabsTrigger value="practice" className="rounded-full text-sm font-semibold h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950">Practice Zone</TabsTrigger>}
                    <TabsTrigger value="syllabus" className="rounded-full text-sm font-semibold h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950">Syllabus</TabsTrigger>
                    {subject.customTabs?.map(tab => (
                       <TabsTrigger key={tab.id} value={tab.id} className="rounded-full text-sm font-semibold h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950" disabled={tab.hidden && !userIsEditor}>
                         {tab.cost && !unlockedTabsSet.has(`${subjectId}_${tab.id}`) && !userIsEditor ? <Lock className="mr-2 h-4 w-4" /> : null}
                         {tab.label}
                       </TabsTrigger>
                    ))}
                    <TabsTrigger value="leaderboard" className="rounded-full text-sm font-semibold h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950">Leaderboard</TabsTrigger>
                </TabsList>

                <div className="animate-in fade-in duration-500 pt-6">
                    <TabsContent value="assignments">
                      <WorksheetList subjectId={subjectId} isEnrolled={isEnrolled} userIsEditor={userIsEditor} />
                    </TabsContent>

                    <TabsContent value="practice">
                      <PracticeZone classId={classId} subjectId={subjectId} />
                    </TabsContent>
                    
                    <TabsContent value="syllabus">
                        <SyllabusEditor subjectId={subjectId} subjectName={subject.name}/>
                    </TabsContent>

                    {subject.customTabs?.map(tab => {
                        const isUnlocked = unlockedTabsSet.has(`${subjectId}_${tab.id}`) || userIsEditor;
                        return (
                            <TabsContent key={tab.id} value={tab.id}>
                                {isUnlocked ? (
                                    <div dangerouslySetInnerHTML={{ __html: tab.content }} />
                                ) : (
                                    <UnlockContentCard tab={tab} onUnlock={() => handleUnlockTab(tab.id, tab.cost!, tab.currency!)} />
                                )}
                            </TabsContent>
                        )
                    })}

                    <TabsContent value="leaderboard">
                        <Leaderboard subjectId={subjectId} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

// Wrap with Suspense for better UX with searchParams
export default function SubjectPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <SubjectWorkspacePage />
        </Suspense>
    );
}
