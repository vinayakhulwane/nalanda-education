'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Lock } from "lucide-react";

export function EnrollmentPromptCard() {
  return (
    <Card className="flex flex-col bg-muted/50 border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="text-muted-foreground" />
          More Content Awaits
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">
          To attempt classroom assignments and unlock all features for this subject, please enroll.
        </p>
      </CardContent>
      <CardFooter>
        <Button className="w-full" disabled>
          Enroll to Unlock
        </Button>
      </CardFooter>
    </Card>
  );
}
