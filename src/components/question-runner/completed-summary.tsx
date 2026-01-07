'use client';
import type { SubQuestion } from '@/types';
import { ChevronsUpDown } from 'lucide-react';

interface CompletedSubQuestionSummaryProps {
    subQuestion: SubQuestion & { stepTitle: string };
    answer: any;
    index: number;
}

const getPlainText = (html: string) => {
    if (!html) return 'No question text.';
    // A simple approach to get plain text
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

const getAnswerText = (subQuestion: SubQuestion, answer: any) => {
    if (answer === null || answer === undefined || answer === '') return 'Not Answered';
    switch (subQuestion.answerType) {
        case 'numerical':
        case 'text':
            return answer.toString();
        case 'mcq':
            const optionMap = new Map(subQuestion.mcqAnswer?.options.map(o => [o.id, o.text]));
            if (subQuestion.mcqAnswer?.isMultiCorrect) {
                const answers = (answer as string[] || []);
                if (answers.length === 0) return 'Not Answered';
                return answers.map(id => optionMap.get(id)).join(', ');
            }
            return optionMap.get(answer) || 'N/A';
        default:
            return 'N/A';
    }
}


export function CompletedSubQuestionSummary({ subQuestion, answer, index }: CompletedSubQuestionSummaryProps) {
    const questionText = getPlainText(subQuestion.questionText);
    const answerText = getAnswerText(subQuestion, answer);

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 border rounded-lg bg-card text-sm text-muted-foreground runner-summary-card w-full text-left hover:bg-muted/50 cursor-pointer">
            <div className="font-medium">{index + 1}.</div>
            <div className="flex-grow min-w-0">
                <p className="break-words break-all whitespace-pre-wrap min-w-0">{questionText}</p>
            </div>
            <div className="flex items-center gap-2">
                <p className="font-semibold text-card-foreground break-words break-all whitespace-pre-wrap min-w-0">{answerText}</p>
            </div>
             <div className="flex-grow flex justify-end">
                <ChevronsUpDown className="h-4 w-4" />
            </div>
        </div>
    )
}
