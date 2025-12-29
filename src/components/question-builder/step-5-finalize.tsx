'use client';
import type { Question, QuestionStatus } from '@/types';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

export function Step5Finalize({ question, setQuestion }: { question: Partial<Question>, setQuestion: (q: Partial<Question>) => void }) {
    return (
        <div className="space-y-6 max-w-lg mx-auto">
             <div className="text-center">
                <h2 className="text-2xl font-bold">Finalize & Publish</h2>
                <p className="text-muted-foreground">Set the final status for this question.</p>
            </div>
            <div className="space-y-2">
                <Label>Question Status</Label>
                <RadioGroup 
                    defaultValue={question.status || 'draft'} 
                    onValueChange={(v) => setQuestion({ ...question, status: v as QuestionStatus })}
                    className="flex gap-4"
                >
                    <Label htmlFor="draft" className="flex items-center space-x-2 border rounded-md p-3 flex-1 cursor-pointer hover:bg-muted/50 data-[state=checked]:border-primary">
                        <RadioGroupItem value="draft" id="draft" />
                        <span>Draft</span>
                    </Label>
                    <Label htmlFor="published" className="flex items-center space-x-2 border rounded-md p-3 flex-1 cursor-pointer hover:bg-muted/50 data-[state=checked]:border-primary">
                        <RadioGroupItem value="published" id="published" />
                        <span>Published</span>
                    </Label>
                </RadioGroup>
                 <p className="text-xs text-muted-foreground pt-2">
                    - <span className="font-semibold">Draft:</span> Saved but not visible to students in worksheets.
                    <br />
                    - <span className="font-semibold">Published:</span> Available for inclusion in worksheets.
                </p>
            </div>
        </div>
    )
}
