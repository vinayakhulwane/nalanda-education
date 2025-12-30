'use client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Edit, MoreVertical, Trash, GraduationCap, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Class } from "@/types";
import { cn } from "@/lib/utils";

export function ClassCard({ classItem, onEdit, onDelete, isStudentView = false }: { classItem: Class, onEdit?: (c: Class) => void, onDelete?: (c: Class) => void, isStudentView?: boolean }) {
    const router = useRouter();
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const description = classItem.description || "";
    const shouldTruncate = description.length > 100;
    const displayedDescription = shouldTruncate && !isDescriptionExpanded ? `${description.substring(0, 100)}...` : description;

    return (
        <Card className="group relative overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-slate-900 h-full flex flex-col min-h-[300px]">
            {/* Decorative Gradient Background */}
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-900/20 dark:to-purple-900/20" />
            
            {/* Floating Icon Decoration */}
            <div className="absolute top-4 right-4 p-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <GraduationCap className="h-5 w-5 text-primary" />
            </div>

            <CardHeader className="relative pt-8 pb-2">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 shadow-sm group-hover:scale-110 transition-transform duration-300">
                            <span className="font-bold text-lg">{classItem.name.charAt(0)}</span>
                        </div>
                        <CardTitle className="text-xl font-bold tracking-tight line-clamp-2">{classItem.name}</CardTitle>
                    </div>

                    {!isStudentView && onEdit && onDelete && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => onEdit(classItem)} className="gap-2">
                                    <Edit className="h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDelete(classItem)} className="text-red-600 gap-2 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20">
                                    <Trash className="h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardHeader>

            <CardContent className="relative pb-4 flex-1">
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {displayedDescription || <span className="italic opacity-50">No description provided.</span>}
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

            <CardFooter className="pt-2 pb-6 mt-auto">
                <Button 
                    className={cn(
                        "w-full group/btn justify-between",
                        isStudentView ? "bg-primary hover:bg-primary/90" : "bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100"
                    )}
                    onClick={() => router.push(`/academics/${classItem.id}`)}
                >
                    <span className="font-medium">{isStudentView ? 'View Subjects' : 'Manage Subjects'}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </Button>
            </CardFooter>
        </Card>
    );
}