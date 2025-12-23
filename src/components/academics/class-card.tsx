'use client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Edit, MoreVertical, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Class } from "@/types";

export function ClassCard({ classItem, onEdit, onDelete, isStudentView = false }: { classItem: Class, onEdit?: (c: Class) => void, onDelete?: (c: Class) => void, isStudentView?: boolean }) {
    const router = useRouter();
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const description = classItem.description || "";
    const shouldTruncate = description.length > 100;
    const displayedDescription = shouldTruncate && !isDescriptionExpanded ? `${description.substring(0, 100)}...` : description;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-headline">{classItem.name}</CardTitle>
                {!isStudentView && onEdit && onDelete && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(classItem)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(classItem)} className="text-red-600">
                                <Trash className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
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
                <Button variant="secondary" className="w-full" onClick={() => router.push(`/academics/${classItem.id}`)}>
                    {isStudentView ? 'View Subjects' : 'Manage Subjects'}
                </Button>
            </CardFooter>
        </Card>
    );
}
