import { PageHeader } from "@/components/page-header";
import { QuestionBuilderForm } from "@/components/question-builder-form";
import { Card, CardContent } from "@/components/ui/card";

export default function NewQuestionPage() {
  return (
    <div>
      <PageHeader
        title="Question Builder"
        description="Create a new numerical problem with a custom grading rubric."
      />
      <Card>
        <CardContent className="pt-6">
            <QuestionBuilderForm />
        </CardContent>
      </Card>
    </div>
  );
}
