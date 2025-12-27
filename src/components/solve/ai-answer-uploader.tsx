'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, X, Loader2, Sparkles, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface AIAnswerUploaderProps {
  questionId: string;
  onImageSelected: (file: File | null) => void;
  isGrading?: boolean;
  savedImage?: File | null; // Allow parent to pass back the saved file if resizing window
}

export function AIAnswerUploader({ questionId, onImageSelected, isGrading = false, savedImage }: AIAnswerUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Restore preview if parent has an image (e.g. navigating between questions)
  useEffect(() => {
    if (savedImage) {
      const objectUrl = URL.createObjectURL(savedImage);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [savedImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB Limit for good quality
        toast({ variant: 'destructive', title: 'File too large', description: 'Please upload an image smaller than 10MB.' });
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      onImageSelected(file);
    }
  };

  const clearImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onImageSelected(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        capture="environment" 
        onChange={handleFileChange} 
      />

      {!preview ? (
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className="border-dashed border-2 cursor-pointer hover:bg-muted/50 transition-all hover:border-primary/50 group"
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-40">
              <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-3">
                 <Upload className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Upload Solution</p>
              <p className="text-xs text-muted-foreground mt-1">From Gallery</p>
            </CardContent>
          </Card>

           <Card 
            className="border-dashed border-2 cursor-pointer hover:bg-muted/50 transition-all hover:border-primary/50 group"
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-40">
              <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-3">
                 <Camera className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Take Photo</p>
              <p className="text-xs text-muted-foreground mt-1">Open Camera</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="relative rounded-xl border bg-black/5 overflow-hidden group">
            <div className="absolute top-2 right-2 z-10 flex gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-sm bg-white/80 backdrop-blur">
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-transparent border-none shadow-none">
                        <img src={preview} alt="Full Preview" className="w-full h-auto rounded-md" />
                    </DialogContent>
                </Dialog>
                
                <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full shadow-sm" onClick={clearImage} disabled={isGrading}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
            
            <div className="relative h-64 w-full flex items-center justify-center bg-muted">
                <img 
                    src={preview} 
                    alt="Answer Preview" 
                    className="object-contain max-h-full max-w-full"
                />
            </div>
            
            {isGrading && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-20">
                    <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                    <h3 className="text-xl font-bold animate-pulse text-foreground">AI is Grading...</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                        Checking your steps, logic, and final answer against the rubric.
                    </p>
                </div>
            )}
        </div>
      )}

      {!isGrading && preview && (
         <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900 rounded-lg text-sm border border-blue-100 shadow-sm">
            <Sparkles className="h-5 w-5 mt-0.5 shrink-0 text-indigo-500" />
            <div>
                <p className="font-semibold text-indigo-700">Ready to Check</p>
                <p className="opacity-90 mt-1">
                    Your solution is ready. Click <b>"Check Answer"</b> below to let the AI analyze your work.
                </p>
            </div>
         </div>
      )}
    </div>
  );
}