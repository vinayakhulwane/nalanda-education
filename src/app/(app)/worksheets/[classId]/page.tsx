'use client';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import type { Subject, Class } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function WorksheetSubjectCard({ subject, classId }: { subject: Subject, classId: string }) {
    const router = useRouter();
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const description = subject.description || `Manage worksheets for ${subject.name}.`;
    const shouldTruncate = description.length > 100;
    const displayedDescription = shouldTruncate && !isDescriptionExpanded ? `${description.substring(0, 100)}...` : description;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-headline">{subject.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    {displayedDescription}
                    {shouldTruncate && (
                        <Button variant="link" className="p-0 pl-1 text-sm h-auto" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                            {isDescriptionExpanded ? 'Read less' : 'Read more'}
                        </Button>
                    )}
                </p>
            </CardContent>
            <CardFooter>
                <Button variant="secondary" className="w-full" onClick={() => router.push(`/worksheets/${classId}/${subject.id}`)}>
                    Select Subject
                </Button>
            </CardFooter>
        </Card>
    );
}


export default function WorksheetSubjectsPage() {
    const router = useRouter();
    const params = useParams();
    const classId = params.classId as string;
    const firestore = useFirestore();

    const classDocRef = useMemoFirebase(() => {
        if (!firestore || !classId) return null;
        return doc(firestore, 'classes', classId);
    }, [firestore, classId]);

    const { data: currentClass, isLoading: isClassLoading } = useDoc<Class>(classDocRef);
    
    const subjectsQueryRef = useMemoFirebase(() => {
        if (!firestore || !classId) return null;
        return query(collection(firestore, 'subjects'), where('classId', '==', classId));
    }, [firestore, classId]);

    const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsQueryRef);

    if (isClassLoading || areSubjectsLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div>
            <Button variant="ghost" onClick={() => router.push('/worksheets')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Classes
            </Button>
            <PageHeader
                title={`Subjects for ${currentClass?.name || 'Class'}`}
                description="Select a subject to create or manage worksheets."
            />
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {subjects?.map((s) => (
                    <WorksheetSubjectCard 
                        key={s.id} 
                        subject={s} 
                        classId={classId}
                    />
                ))}
                    {subjects?.length === 0 && (
                    <div className="col-span-full text-center text-muted-foreground py-10">
                        No subjects found for this class. You can add subjects in the 'Academics' section.
                    </div>
                )}
            </div>
        </div>
    )
}
