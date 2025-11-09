
"use client";

import { useState, useMemo } from 'react';
import type { User, Offer, UserGameOffer } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, runTransaction, doc } from 'firebase/firestore';
import { CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import OfferCard from './offer-card';
import GameCard from './game-card';
import { Settings, LogOut, Copy, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
  onGoToSettings: () => void;
}

const UserDashboard = ({ user, onLogout, onGoToSettings }: UserDashboardProps) => {
  const { toast } = useToast();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false);
  const firestore = useFirestore();
  
  const offersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'gameOffers') : null, [firestore]);
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

  const gameNames = useMemo(() => Object.keys(groupedOffers), [groupedOffers]);

  const handleCopyWalletId = (walletId: string) => {
    navigator.clipboard.writeText(walletId);
    toast({title: "تم النسخ!", description: "تم نسخ رقم محفظتك."})
  }
  
  const handlePurchase = async () => {
    if (!firestore || !user || !selectedOffer) return;

    if (user.balance < selectedOffer.price) {
        toast({
            variant: "destructive",
            title: "رصيد غير كافٍ",
            description: "رصيدك الحالي لا يكفي لإتمام هذه العملية. الرجاء شحن حسابك.",
        });
        setSelectedOffer(null);
        return;
    }

    setIsPurchaseLoading(true);

    try {
        const userRef = doc(firestore, 'users', user.id);
        const userGameOfferRef = doc(collection(firestore, `users/${user.id}/userGameOffers`));

        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw "المستخدم غير موجود!";
            }

            const newBalance = userDoc.data().balance - selectedOffer.price;
            if (newBalance < 0) {
              throw "رصيد غير كافٍ!";
            }

            transaction.update(userRef, { balance: newBalance });

            const newPurchase: Omit<UserGameOffer, 'id'> = {
              userId: user.id,
              gameOfferId: selectedOffer.id,
              gameName: selectedOffer.gameName,
              offerName: selectedOffer.offerName,
              price: selectedOffer.price,
              status: "pending",
              createdAt: new Date(),
            }
            transaction.set(userGameOfferRef, newPurchase);
        });

        toast({
            title: "تمت عملية الشراء بنجاح!",
            description: `لقد اشتريت ${selectedOffer.offerName}. سيتم تنفيذ طلبك قريباً.`,
        });

    } catch (error: any) {
        console.error("Purchase Error: ", error);
        toast({
            variant: "destructive",
            title: "فشل الشراء",
            description: error.toString() || "حدث خطأ أثناء محاولة الشراء. الرجاء المحاولة مرة أخرى.",
        });
    } finally {
        setIsPurchaseLoading(false);
        setSelectedOffer(null);
    }
  };


  const renderContent = () => {
    if (offersLoading) {
      return (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mr-4">جاري تحميل العروض...</p>
        </div>
      );
    }

    // If a game is selected, show its offers
    if (selectedGame && groupedOffers[selectedGame]) {
      return (
        <div>
          <div className="flex items-center mb-4">
             <Button variant="ghost" size="icon" onClick={() => setSelectedGame(null)}>
                <ArrowRight className="h-5 w-5" />
             </Button>
             <h4 className="text-lg font-bold mr-2">{selectedGame}</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedOffers[selectedGame].map((offer) => (
              <OfferCard key={offer.id} offer={offer} onClick={() => setSelectedOffer(offer)} />
            ))}
          </div>
        </div>
      );
    }

    // Otherwise, show the list of games
    return (
      <div>
        <h3 className="text-xl font-semibold mb-4 text-center">اختر لعبة</h3>
        {gameNames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gameNames.map((gameName) => (
              <GameCard 
                key={gameName} 
                gameName={gameName} 
                onClick={() => setSelectedGame(gameName)} 
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">لا توجد عروض متاحة حاليًا. اطلب من الأدمن إضافة العروض.</p>
        )}
      </div>
    );
  };

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
        {renderContent()}
      </CardContent>

      <AlertDialog open={!!selectedOffer} onOpenChange={(open) => !open && setSelectedOffer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد عملية الشراء</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من أنك تريد شراء "{selectedOffer?.offerName}" مقابل <span className="font-bold text-primary">{selectedOffer?.price.toFixed(2)} ج.س</span>؟
              سيتم خصم المبلغ من رصيدك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurchase} disabled={isPurchaseLoading}>
              {isPurchaseLoading ? <Loader2 className="animate-spin" /> : "تأكيد الشراء"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserDashboard;

    