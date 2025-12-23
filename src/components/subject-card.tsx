
'use client';

import { useState } from 'react';
import type { Subject } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Edit, MoreVertical, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

type SubjectCardProps = {
  subject: Subject;
  classId: string;
};

export function SubjectCard({ subject, classId }: SubjectCardProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editedName, setEditedName] = useState(subject.name);
  const [editedDescription, setEditedDescription] = useState(subject.description);

  const shouldTruncate = subject.description.length > 100;
  const displayedDescription = shouldTruncate && !isDescriptionExpanded ? `${subject.description.substring(0, 100)}...` : subject.description;

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
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle className="text-lg font-headline">{subject.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-600">
                <Trash className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                {displayedDescription}
                {shouldTruncate && (
                    <Button variant="link" className="p-0 pl-1 text-sm h-auto" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                        {isDescriptionExpanded ? 'Read less' : 'Read more'}
                    </Button>
                )}
            </p>
        </CardContent>
        <CardFooter>
          <Button variant="secondary" className="w-full" onClick={() => router.push(`/academics/${classId}/${subject.id}`)}>
            Manage Syllabus
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Edit Subject</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-name" className="text-right">Name</Label>
                      <Input id="edit-name" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-description" className="text-right">Description</Label>
                        <Textarea id="edit-description" value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} className="col-span-3" />
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
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Deleting subject '{subject.name}' will permanently remove all associated units and categories. This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSubject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
