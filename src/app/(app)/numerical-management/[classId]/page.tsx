'use client';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import { ArrowLeft, Loader2, BookPlus, Library } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import type { Subject, Class } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function NumericalManagementSubjectCard({ subject, classId }: { subject: Subject, classId: string }) {
    const router = useRouter();
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isDialogOpen, setDialogOpen] = useState(false);

    const description = subject.description || `Manage questions for ${subject.name}.`;
    const shouldTruncate = description.length > 100;
    const displayedDescription = shouldTruncate && !isDescriptionExpanded ? `${description.substring(0, 100)}...` : description;

    return (
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
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
                    <DialogTrigger asChild>
                        <Button variant="secondary" className="w-full">
                            Manage Questions
                        </Button>
                    </DialogTrigger>
                </CardFooter>
            </Card>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Questions for {subject.name}</DialogTitle>
                </DialogHeader>
                <div className="py-4 text-center text-muted-foreground">
                    What would you like to do?
                </div>
                <DialogFooter className="sm:justify-center gap-2">
                    <Button onClick={() => router.push(`/questions/new?classId=${classId}&subjectId=${subject.id}`)}>
                        <BookPlus className="mr-2"/>
                        Create New Question
                    </Button>
                    <Button variant="outline" onClick={() => router.push(`/questions/bank?classId=${classId}&subjectId=${subject.id}`)}>
                        <Library className="mr-2" />
                        Question Bank
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


function NumericalManagementSubjectsPageContent({ classId }: { classId: string }) {
    const router = useRouter();
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
            <Button variant="ghost" onClick={() => router.push('/numerical-management')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Classes
            </Button>
            <PageHeader
                title={`Subjects for ${currentClass?.name || 'Class'}`}
                description="Select a subject to manage its numerical questions."
            />
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {subjects?.map((s) => (
                    <NumericalManagementSubjectCard 
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


export default function NumericalManagementSubjectsPage({ params }: { params: { classId: string } }) {
    return <NumericalManagementSubjectsPageContent classId={params.classId} />;
}
