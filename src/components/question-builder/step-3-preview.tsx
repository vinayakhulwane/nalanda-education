'use client';
import type { Question } from "@/types";
import { QuestionRunner } from "../question-runner";

export function Step3Preview({ question }: { question: Partial<Question>}) {

    const tempOnAnswerSubmit = (subId: string, answer: any) => {
        console.log(`Preview Answer for ${subId}:`, answer);
    }
    const tempOnResultCalculated = (subId: string, isCorrect: boolean) => {
         console.log(`Preview Result for ${subId}:`, isCorrect);
    }

    if (!question || !question.solutionSteps || question.solutionSteps.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground text-center p-8">
                The solution steps have not been defined yet.
            </div>
        )
    }

    return (
        <div>
            <h3 className="text-xl font-bold mb-4">Live Preview</h3>
            <p className="text-muted-foreground mb-6">
                This is a fully interactive preview of how the question will appear to a student.
                All answer inputs and validation logic are active.
            </p>
            <QuestionRunner 
                question={question as Question}
                onAnswerSubmit={tempOnAnswerSubmit}
                onResultCalculated={tempOnResultCalculated}
                initialAnswers={{}}
            />
        </div>
    )
}