'use client';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus2, Save, ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Subject, Class } from "@/types";
import { Loader2 } from "lucide-react";


export default function SubjectWorksheetPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;
  const subjectId = params.subjectId as string;
  const firestore = useFirestore();

  const subjectDocRef = useMemoFirebase(() => (firestore && subjectId ? doc(firestore, 'subjects', subjectId) : null), [firestore, subjectId]);
  const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);

  if (isSubjectLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const createWorksheetUrl = `/worksheets/new?classId=${classId}&subjectId=${subjectId}`;
  const savedWorksheetsUrl = `/worksheets/saved?classId=${classId}&subjectId=${subjectId}`;


  return (
    <div>
        <Button variant="ghost" onClick={() => router.push(`/worksheets/${classId}`)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Subjects
        </Button>
        <PageHeader
            title={`Worksheets for ${subject?.name || 'Subject'}`}
            description="Build new assignments or manage your saved worksheets for this subject."
        />
        <div className="grid md:grid-cols-2 gap-6 mt-8 max-w-4xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <FilePlus2 className="text-primary" />
                Create New Worksheet
                </CardTitle>
                <CardDescription>
                Build a custom assignment by selecting questions from the question bank.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button className="w-full" onClick={() => router.push(createWorksheetUrl)}>
                Start Building
                </Button>
            </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <Save className="text-primary" />
                Saved Worksheets
                </CardTitle>
                <CardDescription>
                View, edit, or assign your previously created worksheets for this subject.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button className="w-full" onClick={() => router.push(savedWorksheetsUrl)}>
                    View Saved
                </Button>
            </CardContent>
            </Card>
      </div>
    </div>
  );
}
