'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useUser, useMemoFirebase } from '@/firebase'; 
import { doc, setDoc } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Edit, Save, X, Info } from 'lucide-react';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";

const DEFAULT_CONTENT = `
  <h2>🎓 Welcome to Nalanda</h2>
  <p>Welcome to your personalized learning journey! Here is how you can Learn, Earn, and Grow.</p>
  
  <hr />

  <h3>🚀 How it Works</h3>
  <ol>
    <li><strong>Enroll:</strong> Join subjects from the Dashboard.</li>
    <li><strong>Learn:</strong> Read the syllabus and study materials.</li>
    <li><strong>Practice:</strong> Solve worksheets to test your knowledge.</li>
    <li><strong>Earn:</strong> Get rewarded for every correct step, not just the final answer.</li>
  </ol>

  <h3>💰 The Economy: Learn & Earn</h3>
  <p>We believe effort should be rewarded. Here is what the currencies mean:</p>
  <ul>
    <li><strong>✨ Spark:</strong> The energy of learning! You earn this by solving <strong>AI-Graded Questions</strong>. Sparks convert automatically into Coins.</li>
    <li><strong>🪙 Coins:</strong> Your standard currency. Use Coins to unlock new Practice Worksheets.</li>
    <li><strong>👑 Gold:</strong> A mark of excellence. Earned by maintaining <strong>Streaks</strong> or exchanging Coins.</li>
    <li><strong>💎 Diamonds:</strong> The rarest gem. Awarded only to top achievers on the Leaderboard.</li>
  </ul>
  
  <h3>🤖 AI Grading Explained</h3>
  <p>Our worksheets use advanced AI to grade your handwritten or typed answers. Unlike traditional tests, we give you <strong>partial credit</strong>. If you use the correct formula but make a small calculation error, you still earn marks for the steps you got right!</p>
  
  <hr />

  <h3>📞 Need Help?</h3>
  <p>If you face any issues with the platform, billing, or content, please contact us:</p>
  <ul>
    <li><strong>Email:</strong> support@nalanda.edu (Replace with actual email)</li>
    <li><strong>Admin:</strong> Contact your class teacher directly.</li>
  </ul>
`;

export default function AboutPage() {
    const { userProfile } = useUser();
    const firestore = useFirestore();
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Memoize doc ref to prevent "Maximum update depth" error
    const docRef = useMemoFirebase(
        () => firestore ? doc(firestore, 'settings', 'about') : null,
        [firestore]
    );
    
    const { data: settingsData, isLoading } = useDoc(docRef);

    const canEdit = userProfile?.role === 'admin' || userProfile?.role === 'teacher';

    useEffect(() => {
        if (settingsData && settingsData.content) {
            setContent(settingsData.content);
        } else if (!isLoading && !settingsData) {
            setContent(DEFAULT_CONTENT);
        }
    }, [settingsData, isLoading]);

    const handleSave = async () => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            await setDoc(doc(firestore, 'settings', 'about'), { content }, { merge: true });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Image 
                  src="/HD_Logo_TBG.png" 
                  alt="Nalanda Loading" 
                  width={128} 
                  height={128} 
                  className="animate-pulse-once"
                  priority
                />
            </div>
        );
    }

    return (
        // ✅ FIX: Added 'w-full' and responsive padding to ensure it fits in the container
        <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
            <div className="flex items-center justify-between mb-6">
                <PageHeader 
                    title="About Platform" 
                    description="Everything you need to know about learning, earning, and our economy." 
                />
                {canEdit && !isEditing && (
                    <Button onClick={() => setIsEditing(true)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Page
                    </Button>
                )}
            </div>

            {isEditing ? (
                <Card>
                    <CardContent className="pt-6 space-y-4">
                        <Alert className="bg-blue-50 text-blue-900 border-blue-200">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Admin Mode</AlertTitle>
                            <AlertDescription>You are editing the public "About" page. Changes will be visible to all students immediately upon saving.</AlertDescription>
                        </Alert>
                        
                        <div className="border rounded-md min-h-[400px]">
                            <RichTextEditor value={content} onChange={setContent} />
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                                <X className="mr-2 h-4 w-4" /> Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Changes
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        {/* ✅ FIX: Changed overflow-hidden to overflow-x-auto. 
                            This allows wide content (like tables) to scroll internally instead of breaking the page. */}
                        <div 
                            className="prose dark:prose-invert max-w-none w-full break-words overflow-x-auto"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
