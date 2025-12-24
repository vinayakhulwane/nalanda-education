'use client';

import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

// Dynamically import react-quill-new to ensure it only runs in the browser
const ReactQuill = dynamic(() => import('react-quill-new'), { 
    ssr: false,
    loading: () => <div className="h-[340px] w-full animate-pulse bg-muted rounded-md" />
});

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
    return (
        <div className="bg-background">
             <ReactQuill 
                theme="snow" 
                value={value} 
                onChange={onChange}
                modules={modules}
                // Using a container class or CSS is preferred over inline styles for Quill
                className="h-[300px] mb-12"
            />
        </div>
    );
}
