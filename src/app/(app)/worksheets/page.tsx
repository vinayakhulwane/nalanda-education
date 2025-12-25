'use client';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

export default function WorksheetsPage() {
  const router = useRouter();

  return (
    <div>
      <PageHeader
        title="Worksheet Generator"
        description="Build new assignments or manage your saved worksheets."
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
            <Button className="w-full" onClick={() => router.push('/worksheets/new')}>
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
              View, edit, or assign your previously created worksheets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push('/worksheets/saved')}>
                View Saved
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
