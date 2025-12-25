'use client';

import { useMemo } from "react";
import type { Worksheet, Question, CurrencyType } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { FileText, Sparkles, Coins, Crown, Gem, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, documentId } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";

interface WorksheetDisplayCardProps {
    worksheet: Worksheet;
    isPractice?: boolean;
    completedAttempts?: string[];
    view?: 'card' | 'list';
}

const currencyIcons: Record<CurrencyType, React.ElementType> = {
  spark: Sparkles,
  coin: Coins,
  gold: Crown,
  diamond: Gem,
};

const currencyColors: Record<CurrencyType, string> = {
  spark: 'text-gray-400',
  coin: 'text-yellow-500',
  gold: 'text-amber-500',
  diamond: 'text-blue-500',
};


export function WorksheetDisplayCard({ worksheet, isPractice = false, completedAttempts = [], view = 'card' }: WorksheetDisplayCardProps) {
    const router = useRouter();
    const firestore = useFirestore();

    const questionsQuery = useMemoFirebase(() => {
        if (!firestore || !worksheet.questions || worksheet.questions.length === 0) return null;
        // Firestore 'in' query limit is 30. For worksheets with more questions, this would need pagination.
        return query(collection(firestore, 'questions'), where(documentId(), 'in', worksheet.questions.slice(0, 30)));
    }, [firestore, worksheet.questions]);

    const { data: questions, isLoading } = useCollection<Question>(questionsQuery);
    
    const { totalMarks, primaryCurrency } = useMemo(() => {
        if (!questions) return { totalMarks: 0, primaryCurrency: 'spark' as CurrencyType };
        
        let totalMarks = 0;
        const currencyCounts: Partial<Record<CurrencyType, number>> = {};

        questions.forEach(q => {
            const questionMarks = q.solutionSteps?.reduce((stepSum, step) => 
                stepSum + step.subQuestions.reduce((subSum, sub) => subSum + sub.marks, 0), 0) || 0;
            totalMarks += questionMarks;
            
            currencyCounts[q.currencyType] = (currencyCounts[q.currencyType] || 0) + 1;
        });

        const primaryCurrency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as CurrencyType || 'spark';

        return { totalMarks, primaryCurrency };

    }, [questions]);
    
    const CurrencyIcon = currencyIcons[primaryCurrency];
    const currencyColor = currencyColors[primaryCurrency];

    const isCompleted = isPractice ? completedAttempts.includes(worksheet.id) : false;

    if (view === 'list') {
        return (
            <Card className="flex flex-col sm:flex-row items-center">
                <CardHeader className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-primary" />
                </CardHeader>
                <CardContent className="flex-grow pt-6">
                    <CardTitle className="text-base">{worksheet.title}</CardTitle>
                    {isLoading ? (
                         <Skeleton className="h-4 w-48 mt-2" />
                    ): (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap mt-1">
                            <span>{worksheet.questions.length} Questions</span>
                            <span className="text-muted-foreground/50">|</span>
                            <span>{totalMarks} Marks</span>
                            <span className="text-muted-foreground/50">|</span>
                             <span className={cn("flex items-center gap-1 capitalize", currencyColor)}>
                                <CurrencyIcon className="h-4 w-4" /> {primaryCurrency}
                            </span>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="pt-6 pr-6">
                     <Button 
                        variant="secondary"
                        onClick={() => router.push(`/solve/${worksheet.id}`)}
                    >
                        <BookOpen className="mr-2 h-4 w-4"/>
                        Review
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    // Default 'card' view
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="text-primary" />
                    <span className="truncate">{worksheet.title}</span>
                </CardTitle>
                <CardDescription>
                    <Badge variant={worksheet.worksheetType === 'sample' ? 'secondary' : worksheet.worksheetType === 'practice' ? 'outline' : 'default'} className="capitalize">
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        <span>{worksheet.questions.length} Questions</span>
                        <span className="text-muted-foreground/50">|</span>
                        <span>{totalMarks} Marks</span>
                        <span className="text-muted-foreground/50">|</span>
                        <span className={cn("flex items-center gap-1 capitalize", currencyColor)}>
                            <CurrencyIcon className="h-4 w-4" /> {primaryCurrency}
                        </span>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button 
                    className="w-full" 
                    onClick={() => router.push(`/solve/${worksheet.id}`)}
                    disabled={isCompleted}
                >
                    {isCompleted ? 'Completed' : 'Start'}
                </Button>
            </CardFooter>
        </Card>
    );
}
