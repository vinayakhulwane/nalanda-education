'use client';
import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { Loader2, BookPlus, ArrowLeft } from 'lucide-react';
import { QuestionBankTable } from '@/components/question-bank/question-bank-table';
import { QuestionBankFilters } from '@/components/question-bank/question-bank-filters';
import type { Class, Subject, Unit, Category, Question } from '@/types';

function QuestionBankPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();

  const classId = searchParams.get('classId');
  const subjectId = searchParams.get('subjectId');

  // Filter States
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Data Fetching
  const subjectDocRef = useMemoFirebase(() => (firestore && subjectId ? doc(firestore, 'subjects', subjectId) : null), [firestore, subjectId]);
  const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);

  const questionsQuery = useMemoFirebase(() => (firestore && subjectId ? query(collection(firestore, 'questions'), where('subjectId', '==', subjectId)) : null), [firestore, subjectId]);
  const { data: questions, isLoading: areQuestionsLoading } = useCollection<Question>(questionsQuery);
  
  const unitsQuery = useMemoFirebase(() => (firestore && subjectId ? query(collection(firestore, 'units'), where('subjectId', '==', subjectId)) : null), [firestore, subjectId]);
  const { data: units, isLoading: areUnitsLoading } = useCollection<Unit>(unitsQuery);

  const categoriesQuery = useMemoFirebase(() => {
      if (!firestore || !units || units.length === 0) return null;
      const unitIds = units.map(u => u.id);
      if(unitFilter !== 'all') {
        if (!unitIds.includes(unitFilter)) return null; // A single unit is selected that has no categories.
        return query(collection(firestore, 'categories'), where('unitId', '==', unitFilter));
      }
      if (unitIds.length === 0) return null;
      return query(collection(firestore, 'categories'), where('unitId', 'in', unitIds));
  }, [firestore, units, unitFilter]);
  const { data: categories, isLoading: areCategoriesLoading } = useCollection<Category>(categoriesQuery);


  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter(q => {
      const searchMatch = searchFilter === '' || q.name.toLowerCase().includes(searchFilter.toLowerCase());
      const unitMatch = unitFilter === 'all' || q.unitId === unitFilter;
      const categoryMatch = categoryFilter === 'all' || q.categoryId === categoryFilter;
      const statusMatch = statusFilter === 'all' || q.status === statusFilter;
      const currencyMatch = currencyFilter === 'all' || q.currencyType === currencyFilter;
      return searchMatch && unitMatch && categoryMatch && statusMatch && currencyMatch;
    });
  }, [questions, searchFilter, unitFilter, categoryFilter, statusFilter, currencyFilter]);
  
  const resetFilters = (filterToReset: string) => {
    switch (filterToReset) {
      case 'unit': setUnitFilter('all'); setCategoryFilter('all'); break;
      case 'category': setCategoryFilter('all'); break;
      case 'status': setStatusFilter('all'); break;
      case 'currency': setCurrencyFilter('all'); break;
      default:
        setUnitFilter('all');
        setCategoryFilter('all');
        setStatusFilter('all');
        setCurrencyFilter('all');
        setSearchFilter('');
    }
  }


  const isLoading = isSubjectLoading || areQuestionsLoading || areUnitsLoading || areCategoriesLoading;
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!subject) {
      return (
        <div>
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
            <PageHeader title="Question Bank" description="Could not load subject details." />
        </div>
      )
  }

  return (
    <div>
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>
      <div className="flex justify-between items-center mb-4">
        <PageHeader title={`Question Bank - ${subject?.name}`} description="Manage your numerical questions for this subject." className="mb-0" />
        <Button onClick={() => router.push(`/questions/new?classId=${classId}&subjectId=${subjectId}`)}>
          <BookPlus className="mr-2" />
          Create New Numerical
        </Button>
      </div>

      <QuestionBankFilters
        units={units || []}
        categories={categories || []}
        filters={{ unit: unitFilter, category: categoryFilter, status: statusFilter, currency: currencyFilter, search: searchFilter }}
        setFilters={{ setUnit: setUnitFilter, setCategory: setCategoryFilter, setStatus: setStatusFilter, setCurrency: setCurrencyFilter, setSearch: setSearchFilter }}
        resetFilters={resetFilters}
        resultCount={filteredQuestions.length}
      />
      
      <QuestionBankTable questions={filteredQuestions} units={units || []} categories={categories || []} />
    </div>
  );
}

export default function QuestionBankPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <QuestionBankPageContent />
        </Suspense>
    )
}
