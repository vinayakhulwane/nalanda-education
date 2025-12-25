'use client';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";


function SavedWorksheetsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get('classId');
  const subjectId = searchParams.get('subjectId');

  const backUrl = subjectId && classId ? `/worksheets/${classId}/${subjectId}` : '/worksheets';

  return (
    <div>
        <Button variant="ghost" onClick={() => router.push(backUrl)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>
        <PageHeader
            title="Saved Worksheets"
            description="Manage your previously created assignments for this subject."
        />
        <Card>
            <CardContent className="pt-6">
                <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
                    <p className="text-muted-foreground">You have no saved worksheets yet.</p>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

export default function SavedWorksheetsPage() {
    return (
        <Suspense fallback={<div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <SavedWorksheetsPageContent />
        </Suspense>
    )
}
