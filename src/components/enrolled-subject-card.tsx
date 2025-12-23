'use client';

import type { Subject } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "./ui/button";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

export function EnrolledSubjectCard({ subject }: { subject: Subject }) {
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const description = subject.description || "No description available.";
    const shouldTruncate = description.length > 100;
    const displayedDescription = shouldTruncate && !isDescriptionExpanded ? `${description.substring(0, 100)}...` : description;

  return (
    <Card className="overflow-hidden flex flex-col transition-transform hover:scale-105 hover:shadow-lg duration-300 ease-in-out">
      <CardHeader>
        <CardTitle className="font-headline text-lg mb-1">{subject.title || subject.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">
            {displayedDescription}
            {shouldTruncate && (
                    <Button variant="link" className="p-0 pl-1 text-sm h-auto" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsDescriptionExpanded(!isDescriptionExpanded);}}>
                    {isDescriptionExpanded ? 'Read less' : 'Read more'}
                </Button>
            )}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full mt-2" asChild>
          <Link href={`/academics/${subject.classId}/${subject.id}`}>
            Continue to Subject <ArrowRight className="ml-2" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
