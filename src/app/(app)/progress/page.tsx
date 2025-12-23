import { PageHeader } from "@/components/page-header";
import { ProgressChart } from "@/components/progress-chart";
import { StrengthsWeaknessesCard } from "@/components/strengths-weaknesses-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProgressPage() {
  return (
    <div>
      <PageHeader
        title="My Progress"
        description="Track your performance and discover areas for improvement."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Performance Over Time</CardTitle>
                <CardDescription>Your average scores across all subjects for the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
                <ProgressChart />
            </CardContent>
        </Card>
        <StrengthsWeaknessesCard />
      </div>
    </div>
  );
}
