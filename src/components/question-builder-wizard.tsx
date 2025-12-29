import React, { useState, useEffect } from 'react';

// 1. Define the Shape of your Question Data (Fixes the 'any' type issues)
interface Question {
  id: string;
  name: string;
  mainQuestionText: string;
  classId: string;
  subjectId: string;
  unitId: string;
  categoryId: string;
  solutionSteps: any[]; 
  // Add other fields as needed
}

// Initial empty state
const initialQuestionState: Question = {
  id: '',
  name: '',
  mainQuestionText: '',
  classId: '',
  subjectId: '',
  unitId: '',
  categoryId: '',
  solutionSteps: []
};

export function QuestionBuilderWizard() {
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  
  // Explicitly type the state to <Question> so 'prev' is never 'any'
  const [question, setQuestion] = useState<Question>(initialQuestionState);

  // "Staging Area" for uploaded JSON. 
  // We store the file data here first, then apply it piece-by-piece.
  const [pendingData, setPendingData] = useState<Question | null>(null);

  // Mocking your dropdown options (You likely fetch these from an API)
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // ---------------------------------------------------------------------------
  // FILE UPLOAD HANDLER (Fixes Syntax Error + TS Error)
  // ---------------------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        
        // 1. Safe Parse
        const jsonData = JSON.parse(content);

        // 2. Validate it has the minimum required fields
        if (!jsonData.mainQuestionText) throw new Error("Invalid JSON structure");

        // 3. IMMEDIATE UPDATE: Text & Basic Info
        // We update non-dependent fields immediately so the user sees progress.
        // We explicitly type 'prev' as Question to fix your TS error.
        setQuestion((prev: Question) => ({
          ...prev,
          name: jsonData.name,
          mainQuestionText: jsonData.mainQuestionText,
          solutionSteps: jsonData.solutionSteps,
          status: jsonData.status || 'draft',
          // Note: We do NOT set classId/subjectId yet. 
          // We let the Waterfall Effect handle those.
        }));

        // 4. QUEUE UPDATES: Dependent Fields (Class, Subject, etc.)
        // Store the full data in the "staging" state to trigger the waterfall.
        setPendingData(jsonData);

      } catch (error) {
        console.error("Error parsing JSON:", error);
        alert("Failed to upload file. Please ensure it is valid JSON without hidden line breaks.");
      }
    };
    reader.readAsText(file);
  };

  // ---------------------------------------------------------------------------
  // WATERFALL EFFECTS (The "Race Condition" Fix)
  // ---------------------------------------------------------------------------

  // STEP 1: Sync Class ID
  // When pendingData arrives, set the Class ID first.
  useEffect(() => {
    if (pendingData && pendingData.classId) {
      // Type 'prev' safely here as well
      setQuestion((prev: Question) => ({ ...prev, classId: pendingData.classId }));
      // This change in 'question.classId' will trigger your existing 
      // API calls to fetch 'subjects'.
    }
  }, [pendingData]);

  // STEP 2: Sync Subject ID
  // Wait until 'subjects' are actually loaded AND match the pending class
  useEffect(() => {
    if (pendingData && pendingData.subjectId && subjects.length > 0) {
      // Set Subject ID only after options exist
      setQuestion((prev: Question) => ({ ...prev, subjectId: pendingData.subjectId }));
    }
  }, [pendingData, subjects]); // dependent on 'subjects' loading

  // STEP 3: Sync Unit ID
  // Wait until 'units' are loaded
  useEffect(() => {
    if (pendingData && pendingData.unitId && units.length > 0) {
      setQuestion((prev: Question) => ({ ...prev, unitId: pendingData.unitId }));
    }
  }, [pendingData, units]);

  // STEP 4: Cleanup
  // Once everything is synced, clear the pending data to stop effects
  useEffect(() => {
    if (
      pendingData &&
      question.classId === pendingData.classId &&
      question.subjectId === pendingData.subjectId &&
      question.unitId === pendingData.unitId
    ) {
      console.log("Hydration Complete.");
      setPendingData(null);
    }
  }, [question, pendingData]);


  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="p-4">
      {/* File Upload Input */}
      <div className="mb-4">
        <label className="block mb-2 font-bold">Upload Question JSON</label>
        <input 
          type="file" 
          accept=".json" 
          onChange={handleFileUpload}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
        />
      </div>

      {/* Main Question Text Editor (Mock) */}
      <div className="mb-4">
         <h3>Main Question Text</h3>
         <div dangerouslySetInnerHTML={{ __html: question.mainQuestionText || '<p>No content</p>' }} />
      </div>

      {/* Dropdowns (Mock - Your existing Select logic goes here) */}
      <div className="grid grid-cols-2 gap-4">
        <select value={question.classId} disabled>
             <option>Class ID: {question.classId || 'Waiting...'}</option>
        </select>
        <select value={question.subjectId} disabled>
             <option>Subject ID: {question.subjectId || 'Waiting...'}</option>
        </select>
      </div>
    </div>
  );
}