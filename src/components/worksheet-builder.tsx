'use client';
import type { Question } from '@/types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { PlusCircle, Trash2, FilePlus2, ShoppingCart } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

type WorksheetBuilderProps = {
  availableQuestions: Question[];
  selectedQuestions: Question[];
  setSelectedQuestions: (questions: Question[]) => void;
  onCreateWorksheet: () => void;
};

export function WorksheetBuilder({ availableQuestions, selectedQuestions, setSelectedQuestions, onCreateWorksheet }: WorksheetBuilderProps) {

  const addQuestion = (question: Question) => {
    if (!selectedQuestions.find(q => q.id === question.id)) {
      setSelectedQuestions([...selectedQuestions, question]);
    }
  };

  const removeQuestion = (questionId: string) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6 mt-4">
      <div className="lg:col-span-2">
        <h2 className="font-headline text-xl font-bold mb-4">Available Questions</h2>
        <ScrollArea className="h-[600px] pr-4">
        <div className="grid md:grid-cols-2 gap-4">
          {availableQuestions.map((q) => (
            <Card key={q.id}>
              <CardHeader>
                <CardTitle className="text-base">{q.name}</CardTitle>
                <CardDescription className="line-clamp-2" dangerouslySetInnerHTML={{ __html: q.mainQuestionText}} />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                    <Badge variant="secondary">{q.unitId}</Badge>
                    <Badge variant="outline">{q.categoryId}</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline" className="w-full" onClick={() => addQuestion(q)} disabled={!!selectedQuestions.find(sq => sq.id === q.id)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> 
                  {selectedQuestions.find(sq => sq.id === q.id) ? 'Added' : 'Add to Worksheet'}
                </Button>
              </CardFooter>
            </Card>
          ))}
            {availableQuestions.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-10">
                    No questions available for this subject/unit. Create some in the Numerical Management section.
                </div>
            )}
        </div>
        </ScrollArea>
      </div>
      <div>
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5"/>
                Worksheet Blueprint
            </CardTitle>
            <CardDescription>
              {selectedQuestions.length} question(s) added.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
                {selectedQuestions.length > 0 ? (
                    <div className="space-y-3">
                        {selectedQuestions.map((q, index) => (
                            <div key={q.id} className="flex items-center justify-between">
                                <span className="text-sm flex-grow pr-2">
                                    {index + 1}. {q.name}
                                </span>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeQuestion(q.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-sm text-muted-foreground py-16">
                        No questions added yet.
                    </div>
                )}
            </ScrollArea>
          </CardContent>
          <Separator />
          <CardFooter className="flex-col gap-2 pt-4">
            <Button className="w-full" disabled={selectedQuestions.length === 0} onClick={onCreateWorksheet}>
              <FilePlus2 className="mr-2 h-4 w-4" /> Create Assignment
            </Button>
            {selectedQuestions.length > 0 && 
                <Button variant="ghost" className="w-full" onClick={() => setSelectedQuestions([])}>
                    Clear all
                </Button>
            }
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
