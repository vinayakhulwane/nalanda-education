'use client';

import { useMemo, Suspense } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, where, documentId, arrayUnion, updateDoc, doc } from "firebase/firestore";
import type { Subject, Class } from "@/types";
import { Loader2, BookOpenCheck, ChevronRight, UserCheck, PlusCircle, Settings, Trash, Edit, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useRouter, useParams } from "next/navigation";
import SyllabusEditor from "@/components/academics/syllabus-editor";
import Leaderboard from "@/components/academics/leaderboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorksheetList } from "@/components/academics/worksheet-list";
import PracticeZone from "@/components/academics/practice-zone";

function SubjectWorkspacePage() {
    const { classId, subjectId } = useParams() as { classId: string, subjectId: string };
    const { user, userProfile, isUserProfileLoading } = useUser();
    const firestore = useFirestore();
    const [isEnrolling, setIsEnrolling] = useState(false);
    
    // Fetch subject and class details
    const subjectDocRef = useMemoFirebase(() => (firestore && subjectId ? doc(firestore, 'subjects', subjectId) : null), [firestore, subjectId]);
    const { data: subject, isLoading: subjectLoading } = useDoc<Subject>(subjectDocRef);

    const classDocRef = useMemoFirebase(() => (firestore && classId ? doc(firestore, 'classes', classId) : null), [firestore, classId]);
    const { data: classInfo, isLoading: classLoading } = useDoc<Class>(classDocRef);
    
    const router = useRouter();
    
    // Determine user role and enrollment status
    const isEnrolled = useMemo(() => userProfile?.enrollments?.includes(subjectId) || false, [userProfile, subjectId]);
    const userIsEditor = useMemo(() => userProfile?.role === 'admin' || userProfile?.role === 'teacher', [userProfile]);

    const handleEnroll = async () => {
        if (!user || !firestore) return;
        setIsEnrolling(true);
        try {
            const userRef = doc(firestore, 'users', user.uid);
            await updateDoc(userRef, {
                enrollments: arrayUnion(subjectId)
            });
            // The UI should update automatically due to the useUser hook
        } catch (error) {
            console.error("Enrollment failed:", error);
        } finally {
            setIsEnrolling(false);
        }
    };
    
    if (isUserProfileLoading || subjectLoading || classLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!subject) {
        return <div>Subject not found</div>;
    }
    
    const defaultTab = userIsEditor ? 'syllabus' : 'assignments';

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="flex justify-between items-start mb-6 gap-4">
                <div>
                    <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-2 text-muted-foreground">
                        <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
                        Back to Subjects
                    </Button>
                    <PageHeader
                        title={subject.name}
                        description={classInfo?.name}
                    />
                </div>
                {!userIsEditor && !isEnrolled && (
                    <Button onClick={handleEnroll} disabled={isEnrolling} className="gap-2 shrink-0">
                        {isEnrolling ? <Loader2 className="animate-spin" /> : <UserCheck />}
                        Enroll Now
                    </Button>
                )}
            </div>

            <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:inline-flex md:w-auto rounded-full p-1 bg-slate-100 dark:bg-slate-800 h-10">
                    {userIsEditor ? (
                        <>
                            <TabsTrigger value="syllabus" className="rounded-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all h-8">Syllabus</TabsTrigger>
                            <TabsTrigger value="assignments" className="rounded-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all h-8">Assignments</TabsTrigger>
                            <TabsTrigger value="leaderboard" className="rounded-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all h-8">Leaderboard</TabsTrigger>
                        </>
                    ) : (
                        <>
                             <TabsTrigger value="assignments" className="rounded-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all h-8 px-4">Assignments</TabsTrigger>
                             <TabsTrigger value="practice" className="rounded-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all h-8 px-4">Practice Zone</TabsTrigger>
                        </>
                    )}
                </TabsList>
                
                <div className="mt-6">
                    {userIsEditor ? (
                        <>
                            <TabsContent value="syllabus">
                                <SyllabusEditor subjectId={subjectId} subjectName={subject.name} />
                            </TabsContent>
                            <TabsContent value="assignments">
                                <WorksheetList subjectId={subjectId} isEnrolled={isEnrolled} userIsEditor={userIsEditor} />
                            </TabsContent>
                            <TabsContent value="leaderboard" className="mt-0">
                                <Leaderboard subjectId={subjectId} />
                            </TabsContent>
                        </>
                    ) : (
                        <>
                             <TabsContent value="assignments">
                               <WorksheetList subjectId={subjectId} isEnrolled={isEnrolled} userIsEditor={userIsEditor} />
                            </TabsContent>
                            <TabsContent value="practice">
                                <PracticeZone classId={classId} subjectId={subjectId} />
                            </TabsContent>
                        </>
                    )}
                </div>
            </Tabs>
        </div>
    );
}

export default function SubjectPageWithSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <SubjectWorkspacePage />
        </Suspense>
    );
}
