'use client';
import 'react-quill/dist/quill.snow.css';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

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
                style={{ height: '300px', marginBottom: '40px' }}
            />
        </div>
    );
}
