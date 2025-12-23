import type { Course } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import Link from "next/link";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function CourseCard({ course }: { course: Course }) {
  const placeholderImage = PlaceHolderImages.find(p => p.imageUrl === course.imageUrl);

  return (
    <Card className="overflow-hidden flex flex-col transition-transform hover:scale-105 hover:shadow-lg duration-300 ease-in-out">
      <CardHeader className="p-0">
        <Image
          src={course.imageUrl}
          alt={course.title}
          width={600}
          height={400}
          data-ai-hint={placeholderImage?.imageHint}
          className="aspect-video object-cover"
        />
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="font-headline text-lg mb-1">{course.title}</CardTitle>
        <CardDescription>{course.description}</CardDescription>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex-col items-start gap-2">
        <div className="w-full">
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{course.progress}%</span>
          </div>
          <Progress value={course.progress} aria-label={`${course.progress}% complete`} />
        </div>
        <Button className="w-full mt-2" asChild>
          <Link href="#">Continue</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
