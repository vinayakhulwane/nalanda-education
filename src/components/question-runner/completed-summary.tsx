'use client';
import type { SubQuestion } from '@/types';
import { ChevronRight, ChevronsUpDown } from 'lucide-react';

interface CompletedSubQuestionSummaryProps {
    subQuestion: SubQuestion & { stepTitle: string };
    answer: any;
    index: number;
}

const getPlainText = (html: string) => {
    if (!html) return 'No question text.';
    return html
        .replace(/<\/p>/gi, ' ')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>?/gm, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
}

const truncate = (text: string, length = 40) => {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

const getAnswerText = (subQuestion: SubQuestion, answer: any) => {
    if (answer === null || answer === undefined) return 'Not Answered';
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
    const questionText = truncate(getPlainText(subQuestion.questionText));
    const answerText = truncate(getAnswerText(subQuestion, answer), 40);

    return (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-card text-sm text-muted-foreground runner-summary-card w-full text-left hover:bg-muted/50 cursor-pointer">
            <div className="flex-shrink-0 font-medium">{index + 1}.</div>
            <div className="flex-grow truncate">
                <span className="font-semibold text-primary/80">{subQuestion.stepTitle}:</span> {questionText}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <ChevronRight className="h-4 w-4" />
                <span className="font-semibold text-card-foreground truncate" title={getAnswerText(subQuestion, answer)}>{answerText}</span>
            </div>
             <div className="flex-shrink-0 w-8 text-right">
                <ChevronsUpDown className="h-4 w-4 ml-auto" />
            </div>
        </div>
    )
}
