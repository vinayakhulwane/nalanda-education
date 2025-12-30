'use client';

import { useState } from 'react';
import type { Subject } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Edit, MoreVertical, Trash, BookOpen, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { cn } from "@/lib/utils";

type SubjectCardProps = {
  subject: Subject;
  classId: string;
  isStudentView?: boolean;
};

export function SubjectCard({ subject, classId, isStudentView = false }: SubjectCardProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editedName, setEditedName] = useState(subject.name);
  const [editedDescription, setEditedDescription] = useState(subject.description);

  const description = subject.description || "";
  const shouldTruncate = description.length > 100;
  const displayedDescription = shouldTruncate && !isDescriptionExpanded ? `${description.substring(0, 100)}...` : description;

  const handleEditSubject = () => {
    if (!firestore) return;
    const subjectDocRef = doc(firestore, 'subjects', subject.id);
    updateDocumentNonBlocking(subjectDocRef, {
        name: editedName,
        description: editedDescription
    });
    setEditDialogOpen(false);
  }

  const handleDeleteSubject = () => {
    if (!firestore) return;
    const subjectDocRef = doc(firestore, 'subjects', subject.id);
    deleteDocumentNonBlocking(subjectDocRef);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Card className="group relative overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-slate-900 h-full flex flex-col">
        {/* Decorative Header Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
        
        <CardHeader className="flex flex-row items-start justify-between pb-2">
           <div className="space-y-2">
               <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <BookOpen className="h-4 w-4" />
               </div>
               <CardTitle className="text-lg font-bold line-clamp-1">{subject.name}</CardTitle>
           </div>
          
          {!isStudentView && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground -mr-2">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)} className="gap-2">
                  <Edit className="h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-600 gap-2 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20">
                  <Trash className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 min-h-[60px]">
            <p className="text-sm text-muted-foreground leading-relaxed">
                {displayedDescription || <span className="italic opacity-50">No description available.</span>}
                {shouldTruncate && (
                    <button 
                        className="ml-1 text-xs font-medium text-primary hover:underline focus:outline-none"
                        onClick={(e) => { e.stopPropagation(); setIsDescriptionExpanded(!isDescriptionExpanded); }}
                    >
                        {isDescriptionExpanded ? 'Show less' : 'Read more'}
                    </button>
                )}
            </p>
        </CardContent>

        <CardFooter className="pt-4 border-t bg-slate-50/50 dark:bg-slate-900/50">
          <Button 
            variant="ghost" 
            className="w-full justify-between group/btn hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all"
            onClick={() => router.push(`/academics/${classId}/${subject.id}`)}
          >
            <span className="font-medium text-slate-700 dark:text-slate-200">{isStudentView ? 'View Syllabus' : 'Manage Syllabus'}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Dialog (Unchanged Logic, just styling tweaks if needed) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle>Edit Subject</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                      <Label htmlFor="edit-name">Subject Name</Label>
                      <Input id="edit-name" value={editedName} onChange={(e) => setEditedName(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea id="edit-description" value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} rows={3} />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleEditSubject}>Save Changes</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will permanently remove <strong>{subject.name}</strong> and all its content.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSubject} className="bg-destructive hover:bg-destructive/90">
                      Delete Subject
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}