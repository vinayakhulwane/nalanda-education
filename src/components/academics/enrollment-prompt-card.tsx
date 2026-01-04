'use client';

import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";

export function EnrollmentPromptCard() {
  return (
    <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center p-6 text-center h-full min-h-[220px]">
      <div className="p-4 bg-white dark:bg-slate-800 rounded-full mb-4 shadow-sm">
        <Lock className="h-6 w-6 text-slate-400" />
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
        Unlock More Content
      </h3>
      <p className="text-sm text-muted-foreground max-w-[200px] leading-relaxed">
        Enroll in this subject to access all classroom assignments and track your progress.
      </p>
    </Card>
  );
}
