'use client';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Loader2, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Class } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function NumericalManagementClassCard({ classItem }: { classItem: Class }) {
    const router = useRouter();
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-headline">{classItem.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>
                    {classItem.description || `Manage questions for ${classItem.name}.`}
                </CardDescription>
            </CardContent>
            <CardFooter>
                 <Button variant="secondary" className="w-full" onClick={() => router.push(`/questions/new`)}>
                    Manage Questions
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function NumericalManagementPage() {
    const { userProfile, isUserProfileLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();

    const classesCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'classes');
    }, [firestore]);

    const { data: classes, isLoading: areClassesLoading } = useCollection<Class>(classesCollectionRef);

    useEffect(() => {
        if (!isUserProfileLoading && userProfile?.role !== 'admin') {
            router.push('/dashboard');
        }
    }, [userProfile, isUserProfileLoading, router]);


    if (isUserProfileLoading || userProfile?.role !== 'admin') {
        return (
            <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div>
            <div className="flex justify-between items-center">
                <PageHeader
                    title="Numerical Management"
                    description="Manage numerical questions by class."
                />
                <Button onClick={() => router.push('/questions/new')}>
                    <PlusCircle className="mr-2" />
                    Add New Question
                </Button>
            </div>
            {areClassesLoading ? (
                 <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {classes?.map((c) => (
                        <NumericalManagementClassCard 
                            key={c.id} 
                            classItem={c}
                        />
                    ))}
                    {classes?.length === 0 && (
                        <div className="col-span-full text-center text-muted-foreground py-10">
                           No classes found. You can add classes in the 'Academics' section.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
