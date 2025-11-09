"use client";

import type { User, Offer } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import OfferCard from './offer-card';
import { Settings, LogOut, Loader2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
  onGoToSettings: () => void;
}

const UserDashboard = ({ user, onLogout, onGoToSettings }: UserDashboardProps) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const offersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'gameOffers'), orderBy('gameName'), orderBy('price'));
  }, [firestore]);
  
  const { data: gameOffers, isLoading: offersLoading } = useCollection<Offer>(offersQuery);

  const groupedOffers = useMemo(() => {
    if (!gameOffers) return {};
    return gameOffers.reduce((acc, offer) => {
      const gameName = offer.gameName;
      if (!acc[gameName]) {
        acc[gameName] = [];
      }
      acc[gameName].push(offer);
      return acc;
    }, {} as Record<string, Offer[]>);
  }, [gameOffers]);


  const handleCopyWalletId = (walletId: string) => {
    navigator.clipboard.writeText(walletId);
    toast({title: "تم النسخ!", description: "تم نسخ رقم محفظتك."})
  }


  return (
    <>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">أهلاً بك، {user.username}</h2>
            <p className="text-muted-foreground">رصيدك الحالي: <span className="font-bold text-primary">{user.balance.toFixed(2)} ج.س</span></p>
             <div className="flex items-center gap-2 mt-2">
                <p className="text-sm text-muted-foreground">رقم محفظتك: <span className="font-mono text-xs">{user.walletId}</span></p>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyWalletId(user.walletId)}>
                    <Copy className="h-4 w-4"/>
                </Button>
             </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={onGoToSettings} aria-label="الإعدادات">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onLogout} aria-label="تسجيل الخروج">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6 space-y-8">
        <h3 className="text-xl font-semibold mb-4 text-center">العروض المتاحة</h3>
        {offersLoading ? (
          <div className="flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
        ) : Object.keys(groupedOffers).length === 0 ? (
          <p className="text-center text-muted-foreground">لا توجد عروض متاحة حاليًا. اطلب من الأدمن إضافة العروض.</p>
        ) : (
          Object.entries(groupedOffers).map(([gameName, offers]) => (
            <div key={gameName}>
              <h4 className="text-lg font-bold mb-3 border-b-2 border-primary pb-2">{gameName}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </>
  );
};

export default UserDashboard;
