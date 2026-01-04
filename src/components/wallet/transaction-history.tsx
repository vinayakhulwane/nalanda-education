'use client';

import { useState } from "react";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, ArrowUpRight, ArrowDownLeft, Sparkles, Coins, Crown, Gem, BrainCircuit, Calendar, Wallet, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { CurrencyType, Transaction } from "@/types";

const currencyIcons: Record<CurrencyType, React.ElementType> = {
  spark: Sparkles,
  coin: Coins,
  gold: Crown,
  diamond: Gem,
  aiCredits: BrainCircuit,
};

export function TransactionHistory() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.uid]);

  const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Added w-full and overflow-hidden to Card to prevent any root expansion */}
      <Card className="max-w-6xl mx-auto border-none shadow-none md:border md:shadow-sm w-full overflow-hidden">
        <CardHeader className="px-4 md:px-6">
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>A record of your recent currency activity.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 md:p-6 w-full">
          {transactions?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No transactions found yet.
            </div>
          ) : (
            <>
              {/* --- VIEW 1: MOBILE LIST (Grid Layout for Perfect Truncation) --- */}
              <div className="block md:hidden w-full">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions?.map((tx) => {
                    const isEarned = tx.type === 'earned';
                    const date = tx.createdAt ? format(tx.createdAt.toDate(), 'dd MMM, p') : '...';

                    return (
                      <div 
                        key={tx.id} 
                        onClick={() => setSelectedTx(tx)}
                        // Grid Layout: Auto width for arrow, 1fr (remaining space) for text
                        // This strictly forces the text column to fit within the screen width
                        className="grid grid-cols-[auto_1fr] gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer active:scale-[0.98] w-full"
                      >
                        {/* 1. Arrow Column */}
                        <div className="pt-0.5">
                          {isEarned ? (
                              <ArrowDownLeft className="h-5 w-5 text-green-600 dark:text-green-400 stroke-[3]" />
                          ) : (
                              <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400 stroke-[3]" />
                          )}
                        </div>

                        {/* 2. Text Column */}
                        {/* 'min-w-0' is required even in grid to allow truncation inside the cell */}
                        <div className="min-w-0 flex flex-col justify-center">
                          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-tight truncate">
                            {tx.description}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {date}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* --- VIEW 2: DESKTOP TABLE (Unchanged) --- */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Amount</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.map((tx) => {
                      const Icon = currencyIcons[tx.currency];
                      const isEarned = tx.type === 'earned';
                      return (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <div className={cn("flex items-center gap-1 font-medium", isEarned ? "text-green-600" : "text-red-600")}>
                              {isEarned ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                              <span className="capitalize">{tx.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{tx.description}</TableCell>
                          <TableCell className="text-center">
                            <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted border font-bold", isEarned ? "text-green-600" : "text-red-600")}>
                              {Icon && <Icon className="h-4 w-4" />}
                              <span>{isEarned ? '+' : '-'}{tx.amount}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div>{tx.createdAt ? format(tx.createdAt.toDate(), 'dd MMM, yyyy') : '...'}</div>
                            <div className="text-xs text-muted-foreground">{tx.createdAt ? format(tx.createdAt.toDate(), 'p') : ''}</div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* --- MOBILE DETAILS MODAL --- */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="max-w-[85%] rounded-2xl p-0 overflow-hidden bg-white dark:bg-slate-950 border dark:border-slate-800">
           
           <DialogTitle className="sr-only">Transaction Details</DialogTitle>
           <DialogDescription className="sr-only">Details of the selected transaction</DialogDescription>

           {selectedTx && (
             <div className="flex flex-col">
                <div className={cn(
                    "h-24 w-full flex items-center justify-center",
                    selectedTx.type === 'earned' ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                )}>
                   {selectedTx.type === 'earned' ? (
                       <ArrowDownLeft className="h-10 w-10 text-green-600 dark:text-green-400" />
                   ) : (
                       <ArrowUpRight className="h-10 w-10 text-red-600 dark:text-red-400" />
                   )}
                </div>

                <div className="p-6 space-y-5">
                    <div className="text-center">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 leading-tight mb-1">{selectedTx.description}</h3>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{selectedTx.type}</p>
                    </div>

                    <div className="space-y-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2"><Wallet className="h-4 w-4"/> Amount</span>
                            <span className={cn("font-bold font-mono text-lg flex items-center gap-1", selectedTx.type === 'earned' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                {currencyIcons[selectedTx.currency] && (
                                    <div className="inline-block">
                                        {(() => {
                                            const Icon = currencyIcons[selectedTx.currency];
                                            return <Icon className="h-4 w-4" />;
                                        })()}
                                    </div>
                                )}
                                {selectedTx.type === 'earned' ? '+' : '-'}{selectedTx.amount}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2"><Calendar className="h-4 w-4"/> Date</span>
                            <span className="font-medium text-sm text-slate-700 dark:text-slate-200">
                                {selectedTx.createdAt ? format(selectedTx.createdAt.toDate(), 'dd MMM, yyyy') : '...'}
                            </span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2"><Clock className="h-4 w-4"/> Time</span>
                            <span className="font-medium text-sm text-slate-700 dark:text-slate-200">
                                {selectedTx.createdAt ? format(selectedTx.createdAt.toDate(), 'p') : '...'}
                            </span>
                        </div>
                    </div>
                </div>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </>
  );
}