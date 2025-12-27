'use client';

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, X, Loader2, Sparkles, FileText } from "lucide-react";
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";

interface AIAnswerUploaderProps {
  questionId: string;
  onImageSelected: (file: File) => void;
  isGrading: boolean; // Loading state while AI thinks
  currentImage?: File | null;
}

export function AIAnswerUploader({ questionId, onImageSelected, isGrading, currentImage }: AIAnswerUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB Limit
        toast({ variant: 'destructive', title: 'File too large', description: 'Please upload an image smaller than 5MB.' });
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      onImageSelected(file);
    }
  };

  const clearImage = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    // We might want to pass 'null' back up, but for now just clear local preview
  };

  return (
    <div className="space-y-4">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        capture="environment" // Opens camera on mobile
        onChange={handleFileChange} 
      />

      {!preview && !currentImage ? (
        <div className="grid grid-cols-2 gap-4">
           {/* Option 1: Upload File */}
          <Card 
            className="border-dashed border-2 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-40">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Upload Image</p>
              <p className="text-xs text-muted-foreground mt-1">Select from gallery</p>
            </CardContent>
          </Card>

           {/* Option 2: Camera (Mobile Friendly) */}
           <Card 
            className="border-dashed border-2 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-40">
              <Camera className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Take Photo</p>
              <p className="text-xs text-muted-foreground mt-1">Capture notebook</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="relative rounded-lg border overflow-hidden bg-black/5">
            <div className="absolute top-2 right-2 z-10">
                <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full shadow-md" onClick={clearImage} disabled={isGrading}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
            
            <div className="relative h-64 w-full flex items-center justify-center">
                {/* Image Preview */}
                <img 
                    src={preview || (currentImage ? URL.createObjectURL(currentImage) : '')} 
                    alt="Answer Preview" 
                    className="object-contain max-h-full max-w-full"
                />
            </div>
            
            {isGrading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                    <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                    <h3 className="text-lg font-semibold animate-pulse">AI is Grading...</h3>
                    <p className="text-sm text-muted-foreground">Analyzing your handwriting and logic.</p>
                </div>
            )}
        </div>
      )}

      {!isGrading && preview && (
         <div className="flex items-start gap-3 p-3 bg-blue-50 text-blue-800 rounded-md text-sm border border-blue-200">
            <Sparkles className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
                <p className="font-semibold">Ready for AI Grading</p>
                <p className="text-xs opacity-90 mt-1">
                    The AI will read your solution step-by-step based on the rubric.
                </p>
            </div>
         </div>
      )}
    </div>
  );
}
