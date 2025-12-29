
'use client';
import { useState, useMemo, Suspense, useEffect } from 'react';
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

  // Helper to get initial state from sessionStorage
  const getInitialState = <T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading sessionStorage key “${key}”:`, error);
      return defaultValue;
    }
  };

  // Filter States - now initialized from sessionStorage
  const [unitFilter, setUnitFilter] = useState<string[]>(() => getInitialState('qb_unitFilter', []));
  const [categoryFilter, setCategoryFilter] = useState<string[]>(() => getInitialState('qb_categoryFilter', []));
  const [statusFilter, setStatusFilter] = useState<string[]>(() => getInitialState('qb_statusFilter', []));
  const [currencyFilter, setCurrencyFilter] = useState<string[]>(() => getInitialState('qb_currencyFilter', []));
  const [searchFilter, setSearchFilter] = useState<string>(() => getInitialState('qb_searchFilter', ''));

  // Effect to save filters to sessionStorage on change
  useEffect(() => {
    try {
      window.sessionStorage.setItem('qb_unitFilter', JSON.stringify(unitFilter));
      window.sessionStorage.setItem('qb_categoryFilter', JSON.stringify(categoryFilter));
      window.sessionStorage.setItem('qb_statusFilter', JSON.stringify(statusFilter));
      window.sessionStorage.setItem('qb_currencyFilter', JSON.stringify(currencyFilter));
      window.sessionStorage.setItem('qb_searchFilter', JSON.stringify(searchFilter));
    } catch (error) {
      console.warn('Error writing to sessionStorage:', error);
    }
  }, [unitFilter, categoryFilter, statusFilter, currencyFilter, searchFilter]);


  // Data Fetching
  const subjectDocRef = useMemoFirebase(() => (firestore && subjectId ? doc(firestore, 'subjects', subjectId) : null), [firestore, subjectId]);
  const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);

  const questionsQuery = useMemoFirebase(() => (firestore && subjectId ? query(collection(firestore, 'questions'), where('subjectId', '==', subjectId)) : null), [firestore, subjectId]);
  const { data: questions, isLoading: areQuestionsLoading } = useCollection<Question>(questionsQuery);
  
  const unitsQuery = useMemoFirebase(() => (firestore && subjectId ? query(collection(firestore, 'units'), where('subjectId', '==', subjectId)) : null), [firestore, subjectId]);
  const { data: units, isLoading: areUnitsLoading } = useCollection<Unit>(unitsQuery);

  const categoriesQuery = useMemoFirebase(() => {
      if (!firestore || !units || units.length === 0) return null;
      // Fetch all categories for the subject once, as filtering happens client-side.
      const unitIds = units.map(u => u.id);
      if (unitIds.length === 0) return null;
      return query(collection(firestore, 'categories'), where('unitId', 'in', unitIds.slice(0, 30)));
  }, [firestore, units]);
  const { data: categories, isLoading: areCategoriesLoading } = useCollection<Category>(categoriesQuery);


  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter(q => {
      const searchMatch = searchFilter === '' || q.name.toLowerCase().includes(searchFilter.toLowerCase());
      const unitMatch = unitFilter.length === 0 || unitFilter.includes(q.unitId);
      const categoryMatch = categoryFilter.length === 0 || categoryFilter.includes(q.categoryId);
      const statusMatch = statusFilter.length === 0 || statusFilter.includes(q.status);
      const currencyMatch = currencyFilter.length === 0 || currencyFilter.includes(q.currencyType);
      return searchMatch && unitMatch && categoryMatch && statusMatch && currencyMatch;
    });
  }, [questions, searchFilter, unitFilter, categoryFilter, statusFilter, currencyFilter]);
  
  // When unit filter changes, reset category filter
  useEffect(() => {
    setCategoryFilter([]);
  }, [unitFilter]);


  const resetFilters = (filterToReset?: string) => {
    switch (filterToReset) {
      case 'unit': setUnitFilter([]); setCategoryFilter([]); break;
      case 'category': setCategoryFilter([]); break;
      case 'status': setStatusFilter([]); break;
      case 'currency': setCurrencyFilter([]); break;
      case 'search': setSearchFilter(''); break;
      default:
        setUnitFilter([]);
        setCategoryFilter([]);
        setStatusFilter([]);
        setCurrencyFilter([]);
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
        questions={questions || []}
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
