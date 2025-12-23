'use client';
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";

export function StrengthsWeaknessesCard() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<{ strengths: string; weaknesses: string; suggestions: string} | null>(null);

  const handleAnalyze = () => {
    setLoading(true);
    // In a real app, you would call the GenAI flow here.
    // e.g., analyzeStudentStrengthsAndWeaknesses({ studentName: 'Alex', performanceData: '...' })
    setTimeout(() => {
      setAnalysis({
        strengths: "Excellent understanding of algebraic concepts and problem-solving in geometry. Consistently high scores in these areas.",
        weaknesses: "Struggles with differential calculus, particularly with rates of change and optimization problems. Some gaps in statistical analysis.",
        suggestions: "Review key calculus theorems and practice more optimization problems. Focus on understanding probability distributions in statistics."
      });
      setLoading(false);
    }, 2000);
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Lightbulb className="text-yellow-500" />
            Academic Health
        </CardTitle>
        <CardDescription>
          Get an AI-powered analysis of your strengths and weaknesses.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {analysis ? (
            <div className="space-y-4 text-sm">
                <div>
                    <h4 className="font-semibold mb-1">Strengths</h4>
                    <p className="text-muted-foreground">{analysis.strengths}</p>
                </div>
                 <div>
                    <h4 className="font-semibold mb-1">Weaknesses</h4>
                    <p className="text-muted-foreground">{analysis.weaknesses}</p>
                </div>
                 <div>
                    <h4 className="font-semibold mb-1">Suggestions</h4>
                    <p className="text-muted-foreground">{analysis.suggestions}</p>
                </div>
            </div>
        ) : (
             <div className="text-center text-muted-foreground py-8">
                Click the button below to generate your analysis.
            </div>
        )}
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleAnalyze} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {analysis ? "Re-analyze Performance" : "Analyze My Performance"}
        </Button>
      </CardFooter>
    </Card>
  );
}
