
'use client';
import { PageHeader } from "@/components/page-header";
import { WorksheetBuilder } from "@/components/worksheet-builder";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import type { Question } from "@/types";
import { collection } from "firebase/firestore";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function NewWorksheetPage() {
    const router = useRouter();
    const firestore = useFirestore();

    const questionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'questions') : null, [firestore]);
    const { data: questions, isLoading } = useCollection<Question>(questionsQuery);

    if (isLoading) {
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
            Back to Worksheets
        </Button>
        <PageHeader
            title="Create a New Worksheet"
            description="Build a custom assignment by selecting questions from the bank."
        />
        <WorksheetBuilder availableQuestions={questions || []} />
    </div>
  );
}
