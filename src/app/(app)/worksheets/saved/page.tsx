'use client';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

export default function SavedWorksheetsPage() {
  const router = useRouter();

  return (
    <div>
        <Button variant="ghost" onClick={() => router.push('/worksheets')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Worksheets
        </Button>
        <PageHeader
            title="Saved Worksheets"
            description="Manage your previously created assignments."
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
