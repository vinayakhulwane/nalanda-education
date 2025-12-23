'use client';
import type { User, Course, Class, Subject } from "@/types";
import { PageHeader } from "./page-header";
import { StatsCard } from "./stats-card";
import { BookOpen, Target, CheckCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { ClassCard } from "./academics/class-card";
import { SubjectCard } from "./subject-card";
import { Card, CardContent } from "./ui/card";

type StudentDashboardProps = {
    user: User | null;
}

function StudentAcademics() {
    const firestore = useFirestore();

    const classesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
    const { data: classes, isLoading: areClassesLoading } = useCollection<Class>(classesCollectionRef);

    const subjectsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
    const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsCollectionRef);

    const isLoading = areClassesLoading || areSubjectsLoading;

    return (
        <Tabs defaultValue="classes" className="mt-6">
            <TabsList>
                <TabsTrigger value="classes">All Classes</TabsTrigger>
                <TabsTrigger value="subjects">All Subjects</TabsTrigger>
            </TabsList>
            <TabsContent value="classes">
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
                        {classes?.map((c) => (
                            <ClassCard
                                key={c.id}
                                classItem={c}
                                isStudentView={true}
                            />
                        ))}
                         {classes?.length === 0 && (
                            <div className="col-span-full text-center text-muted-foreground py-10">
                                No classes available yet.
                            </div>
                        )}
                    </div>
                )}
            </TabsContent>
            <TabsContent value="subjects">
                 {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
                        {subjects?.map((s) => (
                            <SubjectCard 
                                key={s.id} 
                                subject={s} 
                                classId={s.classId} 
                                isStudentView={true}
                            />
                        ))}
                        {subjects?.length === 0 && (
                            <div className="col-span-full text-center text-muted-foreground py-10">
                                No subjects available yet.
                            </div>
                        )}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    )
}

export function StudentDashboard({ user }: StudentDashboardProps) {
    if (!user) {
        return null; // or a loading state
    }
    
    return (
        <div>
            <PageHeader
                title={`Welcome back, ${user.name.split(' ')[0]}!`}
                description="Here's a summary of your academic journey."
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                <StatsCard
                    title="Courses Enrolled"
                    value={user.enrollments?.length.toString() ?? '0'}
                    icon={BookOpen}
                    description="The number of courses you are currently taking."
                />
                <StatsCard
                    title="Overall Score"
                    value="N/A"
                    icon={Target}
                    description="Your average score will appear here."
                />
                <StatsCard
                    title="Worksheets Completed"
                    value="0"
                    icon={CheckCircle}
                    description="Keep up the great work!"
                />
            </div>
            
            <h2 className="font-headline text-2xl font-bold tracking-tight">Explore Academics</h2>
            <StudentAcademics />
        </div>
    )
}
