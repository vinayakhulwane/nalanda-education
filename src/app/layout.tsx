import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import { Inter, Space_Grotesk } from 'next/font/google';
import { cn } from '@/lib/utils';

const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const fontHeadline = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-headline',
});

export const metadata: Metadata = {
  title: 'Nalanda',
  description: 'The personalized platform for academic excellence.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("flex flex-col min-h-screen font-body antialiased", fontBody.variable, fontHeadline.variable)}>
        <FirebaseClientProvider>
          <main className="flex-1 pb-20 lg:pb-0">
            {children}
          </main>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
