'use client';

import { useMemo } from "react";
import type { Worksheet, Question } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, documentId } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";

interface WorksheetDisplayCardProps {
    worksheet: Worksheet;
    isPractice?: boolean;
    completedAttempts?: string[];
}

export function WorksheetDisplayCard({ worksheet, isPractice = false, completedAttempts = [] }: WorksheetDisplayCardProps) {
    const router = useRouter();
    const firestore = useFirestore();

    const questionsQuery = useMemoFirebase(() => {
        if (!firestore || !worksheet.questions || worksheet.questions.length === 0) return null;
        // Firestore 'in' query limit is 30. For worksheets with more questions, this would need pagination.
        return query(collection(firestore, 'questions'), where(documentId(), 'in', worksheet.questions.slice(0, 30)));
    }, [firestore, worksheet.questions]);

    const { data: questions, isLoading } = useCollection<Question>(questionsQuery);
    
    const totalMarks = useMemo(() => {
        if (!questions) return 0;
        return questions.reduce((total, q) => {
            const questionMarks = q.solutionSteps?.reduce((stepSum, step) => 
                stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
            return total + questionMarks;
        }, 0);
    }, [questions]);
    
    // For practice worksheets, a single attempt marks it as completed.
    // In a real app, this logic would be more robust, likely involving a separate 'attempts' collection.
    const isCompleted = isPractice ? completedAttempts.includes(worksheet.id) : false;

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="text-primary" />
                    <span className="truncate">{worksheet.title}</span>
                </CardTitle>
                <CardDescription>
                    <Badge variant={worksheet.worksheetType === 'sample' ? 'secondary' : 'default'} className="capitalize">
                        {worksheet.worksheetType}
                    </Badge>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground">
                        {worksheet.questions.length} Questions | {totalMarks} Marks
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button 
                    className="w-full" 
                    onClick={() => router.push(`/worksheets/preview/${worksheet.id}`)}
                    disabled={isCompleted}
                >
                    {isCompleted ? 'Completed' : 'Start'}
                </Button>
            </CardFooter>
        </Card>
    );
}
