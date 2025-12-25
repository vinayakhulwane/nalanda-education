'use client';
import { PageHeader } from "@/components/page-header";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Class } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

function WorksheetClassCard({ classItem }: { classItem: Class }) {
    const router = useRouter();
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const description = classItem.description || `Manage worksheets for ${classItem.name}.`;
    const shouldTruncate = description.length > 100;
    const displayedDescription = shouldTruncate && !isDescriptionExpanded ? `${description.substring(0, 100)}...` : description;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-headline">{classItem.name}</CardTitle>
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
                 <Button variant="secondary" className="w-full" onClick={() => router.push(`/worksheets/${classItem.id}`)}>
                    Select Class
                </Button>
            </CardFooter>
        </Card>
    );
}


export default function WorksheetsPage() {
    const firestore = useFirestore();

    const classesCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'classes');
    }, [firestore]);

    const { data: classes, isLoading: areClassesLoading } = useCollection<Class>(classesCollectionRef);

    return (
        <div>
            <PageHeader
                title="Worksheet Generator"
                description="Select a class to begin creating or managing worksheets."
            />
             {areClassesLoading ? (
                 <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {classes?.map((c) => (
                        <WorksheetClassCard 
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
