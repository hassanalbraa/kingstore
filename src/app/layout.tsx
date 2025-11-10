import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase';
import TawkTo from '@/components/TawkTo';

export const metadata: Metadata = {
  title: 'KING STORE',
  description: 'موقع عصري وجذاب لبيع الألعاب',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <div className="flex flex-col min-h-screen bg-background">
            {children}
          </div>
        </FirebaseClientProvider>
        <Toaster />
        <TawkTo propertyId="66c5222b9d7ed35917036329" widgetId="1i5s791nk" />
      </body>
    </html>
  );
}
