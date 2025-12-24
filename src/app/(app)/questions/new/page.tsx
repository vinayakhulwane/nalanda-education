'use client';
import { PageHeader } from "@/components/page-header";
import { QuestionBuilderWizard } from "@/components/question-builder-wizard";

export default function NewQuestionPage() {
  return (
    <div>
      <PageHeader
        title="Question Builder"
        description="Create a new numerical problem with a custom grading rubric."
      />
      <QuestionBuilderWizard />
    </div>
  );
}
