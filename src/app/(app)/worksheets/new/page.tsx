
'use client';
import { PageHeader } from "@/components/page-header";
import { WorksheetBuilder } from "@/components/worksheet-builder";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import type { Question } from "@/types";
import { collection, query, where } from "firebase/firestore";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from 'react';
import { Button } from "@/components/ui/button";


function NewWorksheetPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const firestore = useFirestore();

    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const unitId = searchParams.get('unitId');
    const title = searchParams.get('title');

    const questionsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let q = collection(firestore, 'questions');
        if (unitId) {
            return query(q, where('unitId', '==', unitId));
        }
        if (subjectId) {
            return query(q, where('subjectId', '==', subjectId));
        }
        return q;
    }, [firestore, subjectId, unitId]);
    
    const { data: questions, isLoading } = useCollection<Question>(questionsQuery);

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    const backUrl = subjectId && classId ? `/worksheets/${classId}/${subjectId}` : '/worksheets';

    return (
        <div>
            <Button variant="ghost" onClick={() => router.push(backUrl)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
            <PageHeader
                title={title || "Create New Worksheet"}
                description="Build your assignment by selecting questions from the bank."
            />
            <WorksheetBuilder availableQuestions={questions || []} />
        </div>
    );
}

export default function NewWorksheetPage() {
    return (
        <Suspense fallback={<div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <NewWorksheetPageContent />
        </Suspense>
    )
}
