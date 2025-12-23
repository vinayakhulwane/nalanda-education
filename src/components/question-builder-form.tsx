'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { BookPlus } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  subject: z.string().min(3, 'Subject is required.'),
  topic: z.string().min(3, 'Topic is required.'),
  content: z.string().min(10, 'Problem content is too short.'),
  rubric: z.object({
    problemUnderstanding: z.boolean().default(false),
    formulaSelection: z.boolean().default(false),
    calculationAccuracy: z.boolean().default(false),
    finalAnswer: z.boolean().default(false),
  }).refine(data => Object.values(data).some(v => v), {
      message: "At least one rubric criterion must be selected.",
      path: ["problemUnderstanding"] // show error on first item
  }),
});

export function QuestionBuilderForm() {
    const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      subject: '',
      topic: '',
      content: '',
      rubric: {
        problemUnderstanding: true,
        formulaSelection: true,
        calculationAccuracy: true,
        finalAnswer: true,
      },
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    toast({
        title: "Question Created!",
        description: "The new question has been added to the bank.",
    })
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
            <h3 className="text-lg font-medium font-headline">1. Metadata</h3>
            <div className="grid md:grid-cols-3 gap-4">
                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Question Title</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Solving Quadratic Equations" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Algebra I" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Quadratics" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
        </div>
        
        <div className="space-y-4">
            <h3 className="text-lg font-medium font-headline">2. Content</h3>
             <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Problem Statement</FormLabel>
                    <FormControl>
                        <Textarea rows={5} placeholder="Enter the full text of the math problem here..." {...field} />
                    </FormControl>
                     <FormDescription>
                        Use markdown for formatting if needed.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <div className="space-y-4">
            <h3 className="text-lg font-medium font-headline">3. AI Grading Rubric</h3>
            <FormDescription>
                Select the criteria the AI will use to grade student responses.
            </FormDescription>
            <div className="grid md:grid-cols-2 gap-4 pt-2">
                <FormField
                    control={form.control}
                    name="rubric.problemUnderstanding"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>Problem Understanding</FormLabel>
                            <FormDescription>Did the student correctly interpret the question?</FormDescription>
                        </div>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="rubric.formulaSelection"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>Formula Selection</FormLabel>
                            <FormDescription>Did the student select and apply the correct formula/method?</FormDescription>
                        </div>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="rubric.calculationAccuracy"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>Calculation Accuracy</FormLabel>
                            <FormDescription>Were the student's calculations arithmetically correct?</FormDescription>
                        </div>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="rubric.finalAnswer"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>Final Answer</FormLabel>
                            <FormDescription>Was the final answer correct and properly formatted?</FormDescription>
                        </div>
                        </FormItem>
                    )}
                />
            </div>
            {form.formState.errors.rubric && <FormMessage>{form.formState.errors.rubric.message}</FormMessage>}
        </div>

        <Button type="submit">
            <BookPlus className="mr-2 h-4 w-4" />
            Create Question
        </Button>
      </form>
    </Form>
  );
}
