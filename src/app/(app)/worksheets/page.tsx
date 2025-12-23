import { PageHeader } from "@/components/page-header";
import { WorksheetBuilder } from "@/components/worksheet-builder";
import { mockQuestions } from "@/lib/data";

export default function WorksheetsPage() {
  return (
    <div>
      <PageHeader
        title="Worksheet Generator"
        description="Build custom assignments by selecting questions from the bank."
      />
      <WorksheetBuilder availableQuestions={mockQuestions} />
    </div>
  );
}
