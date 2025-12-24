'use client';
import type { SubQuestion } from '@/types';
import { CheckCircle, XCircle, ChevronRight } from 'lucide-react';

interface CompletedSubQuestionSummaryProps {
    subQuestion: SubQuestion;
    answer: any;
    isCorrect?: boolean;
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

const truncate = (text: string, length = 60) => {
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
                return (answer as string[]).map(id => optionMap.get(id)).join(', ');
            }
            return optionMap.get(answer) || 'N/A';
        default:
            return 'N/A';
    }
}


export function CompletedSubQuestionSummary({ subQuestion, answer, isCorrect, index }: CompletedSubQuestionSummaryProps) {
    const questionText = truncate(getPlainText(subQuestion.questionText));
    const answerText = truncate(getAnswerText(subQuestion, answer), 40);

    return (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-card text-sm text-muted-foreground runner-summary-card">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted">
                {isCorrect ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-destructive" />}
            </div>
            <div className="flex-shrink-0 font-medium">{index + 1}.</div>
            <div className="flex-grow truncate" title={getPlainText(subQuestion.questionText)}>{questionText}</div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <ChevronRight className="h-4 w-4" />
                <span className="font-semibold text-card-foreground truncate" title={getAnswerText(subQuestion, answer)}>{answerText}</span>
            </div>
             <div className="flex-shrink-0 font-semibold w-16 text-right">
                {isCorrect ? `${subQuestion.marks}/${subQuestion.marks}` : `0/${subQuestion.marks}`}
            </div>
        </div>
    )
}
