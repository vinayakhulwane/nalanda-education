

'use client';
import { useState, useMemo } from 'react';
import type { Question, Unit, Category } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Edit, Trash, Sparkles, Coins, Gem, Eye, Crown } from "lucide-react";
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface QuestionBankTableProps {
  questions: Question[];
  units: Unit[];
  categories: Category[];
}

const currencyIcons: { [key: string]: React.ElementType } = {
  spark: Sparkles,
  coin: Coins,
  gold: Crown,
  diamond: Gem,
};

export function QuestionBankTable({ questions, units, categories }: QuestionBankTableProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const handleDeleteClick = (question: Question) => {
    setSelectedQuestion(question);
    setDeleteDialogOpen(true);
  };
  
  const handleViewClick = (question: Question) => {
    setSelectedQuestion(question);
    setIsViewModalOpen(true);
  }

  const confirmDelete = () => {
    if (selectedQuestion && firestore) {
      const questionRef = doc(firestore, 'questions', selectedQuestion.id);
      deleteDocumentNonBlocking(questionRef);
      setDeleteDialogOpen(false);
      setSelectedQuestion(null);
    }
  };

  const getUnitName = (id: string) => units.find(u => u.id === id)?.name || 'N/A';
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'N/A';

  const processedQuestionText = useMemo(() => {
    if (!selectedQuestion?.mainQuestionText) return '';
    return selectedQuestion.mainQuestionText.replace(/&nbsp;/g, ' ');
  }, [selectedQuestion]);

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.length > 0 ? (
              questions.map(q => {
                const CurrencyIcon = currencyIcons[q.currencyType];
                return (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{q.name}</span>
                        <Badge variant={q.status === 'published' ? 'default' : 'secondary'} className={q.status === 'published' ? 'bg-green-600' : 'bg-gray-500'}>
                          {q.status}
                        </Badge>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {CurrencyIcon && <CurrencyIcon className="h-4 w-4 text-muted-foreground" />}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{q.currencyType.charAt(0).toUpperCase() + q.currencyType.slice(1)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>{getUnitName(q.unitId)}</TableCell>
                    <TableCell>{getCategoryName(q.categoryId)}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleViewClick(q)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/questions/new?questionId=${q.id}`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(q)}>
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No questions found for the selected criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the question "{selectedQuestion?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{selectedQuestion?.name}</DialogTitle>
             <DialogDescription>
              Question Preview
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: processedQuestionText }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
