'use client';

import { WalletBalances } from "@/components/wallet/wallet-balances";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CurrencySwap } from "@/components/wallet/currency-swap";
import { TransactionHistory } from "@/components/wallet/transaction-history";
import { SurpriseCoupon } from "@/components/wallet/surprise-coupon";
import { cn } from "@/lib/utils";

export default function WalletPage() {
  const { userProfile, isUserProfileLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserProfileLoading && userProfile?.role !== 'student') {
      router.push('/dashboard');
    }
  }, [userProfile, isUserProfileLoading, router]);

  if (isUserProfileLoading || !userProfile) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (userProfile.role !== 'student') {
    return null;
  }

  return (
    // 1. overflow-x-hidden: Prevents the entire page from scrolling horizontally
    // 2. w-full: Ensures container doesn't exceed screen width
    <div className="min-h-screen bg-transparent pb-20 w-full overflow-x-hidden">
      
      {/* Zoom Effect Request:
         Used 'scale-95' on mobile (md:scale-100) to simulate the "zoom out" effect.
         This shrinks the UI slightly (5%) on phones to fit more content.
         'origin-top' keeps it anchored to the top.
      */}
      <div className="scale-95 origin-top md:scale-100 transition-transform">
        
        {/* Header - Added px-6 to match CoursesPage alignment exactly */}
        <div className="py-8 px-6">
           <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-slate-900 dark:text-white">
              My Wallet
           </h1>
           <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
              View your balances, exchange currencies, and see your transaction history.
           </p>
        </div>

        {/* Content Section */}
        <div className="space-y-8">
          
          {/* WalletBalances Wrapper:
             Added 'overflow-x-auto' so if the cards are too wide, 
             user can swipe THEM instead of the whole page breaking.
             Added 'px-6' padding here to align with header.
          */}
          <div className="w-full overflow-x-auto no-scrollbar px-6">
             {/* This inner div ensures cards have enough room to render before scrolling triggers */}
             <div className="min-w-min"> 
                <WalletBalances userProfile={userProfile} />
             </div>
          </div>

          {/* Tabs Wrapper - Added px-6 to align with header */}
          <div className="w-full max-w-full overflow-hidden px-6">
            <Tabs defaultValue="coupon" className="w-full">
              
              <TabsList className={cn(
                  "flex w-full overflow-x-auto no-scrollbar gap-2 bg-transparent p-0 h-auto mb-6",
                  "md:grid md:grid-cols-3 md:gap-0 md:bg-muted/80 md:p-1 md:rounded-xl"
              )}>
                {['coupon', 'swap', 'history'].map((val) => (
                   <TabsTrigger 
                     key={val}
                     value={val} 
                     className={cn(
                       "whitespace-nowrap transition-all duration-200",
                       "rounded-full border bg-background px-4 py-2.5 text-xs font-medium shadow-sm min-w-[130px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary",
                       "md:rounded-md md:border-none md:bg-transparent md:px-3 md:py-1.5 md:text-sm md:shadow-none md:min-w-0 md:data-[state=active]:bg-background md:data-[state=active]:text-foreground md:data-[state=active]:shadow-sm"
                     )}
                   >
                     {val === 'coupon' && "Surprise Coupon"}
                     {val === 'swap' && "Currency Swap"}
                     {val === 'history' && "History"}
                   </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="coupon">
                <SurpriseCoupon userProfile={userProfile} />
              </TabsContent>

              <TabsContent value="swap">
                <CurrencySwap userProfile={userProfile} />
              </TabsContent>

              <TabsContent value="history">
                <TransactionHistory />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}