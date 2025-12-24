'use client';
import { PageHeader } from "@/components/page-header";
import { QuestionBuilderWizard } from "@/components/question-builder-wizard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewQuestionPage() {
  const router = useRouter();

  return (
    <div>
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <PageHeader
        title="Question Builder"
        description="Create a new numerical problem with a custom grading rubric."
      />
      <QuestionBuilderWizard />
    </div>
  );
}
