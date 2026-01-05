'use client';

import { useState, useEffect, useRef } from 'react';
import 'react-quill-new/dist/quill.snow.css';
import type ReactQuill from 'react-quill-new';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
}

const modules = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        ['link'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['clean']
    ],
};

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
    const [isClient, setIsClient] = useState(false);
    const QuillComponent = useRef<typeof ReactQuill | null>(null);

    useEffect(() => {
        setIsClient(true);
        import('react-quill-new').then((Quill) => {
            QuillComponent.current = Quill.default;
        });
    }, []);

    if (!isClient || !QuillComponent.current) {
        return <div className="h-[340px] w-full animate-pulse bg-muted rounded-md" />;
    }

    const TheQuill = QuillComponent.current;

    return (
        <div className="bg-background">
             <TheQuill
                theme="snow" 
                value={value} 
                onChange={onChange}
                modules={modules}
                className="h-[300px] mb-12"
            />
        </div>
    );
}
