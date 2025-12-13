"use client";

import { useState, useMemo } from 'react';
import type { User, Offer, UserGameOffer, Transaction, WithId } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, runTransaction, doc, query, orderBy, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import OfferCard from './offer-card';
import GameCard from './game-card';
import { Copy, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
  onGoToSettings: () => void;
}

const GAMES_REQUIRING_ID = ['PUBG', 'Free Fire', 'عروض التيك توك', 'تصاريح فري فاير'];

type UserView = 'home' | 'orders' | 'wallet' | 'account';

interface MyKashiState {
    accountNumber: string;
    accountName: string;
    amount: string;
}

type NetworkProvider = "Zain" | "Sudani" | "MTN";
interface CreditTransferState {
    provider: NetworkProvider;
    phoneNumber: string;
    amount: string;
}

const UserDashboard = ({ user, onLogout, onGoToSettings }: UserDashboardProps) => {
  const { toast } = useToast();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false);
  const [showGameIdDialog, setShowGameIdDialog] = useState(false);
  const [showFreeFirePermitDialog, setShowFreeFirePermitDialog] = useState(false);
  const [gameId, setGameId] = useState('');
  const [gameUsername, setGameUsername] = useState('');
  const [freeFirePermitState, setFreeFirePermitState] = useState({ gameId: '', gameUsername: '' });
  const [myKashiState, setMyKashiState] = useState<MyKashiState>({ accountNumber: '', accountName: '', amount: '' });
  const [creditTransferState, setCreditTransferState] = useState<CreditTransferState>({ provider: 'Zain', phoneNumber: '', amount: '' });
  const [view, setView] = useState<UserView>('home');

  const firestore = useFirestore();

  const offersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'gameOffers'), orderBy('order'));
  }, [firestore]);
  const { data: gameOffers } = useCollection<Offer>(offersQuery);

  const groupedOffers = useMemo(() => {
    if (!gameOffers) return {};
    return gameOffers.reduce((acc, offer) => {
      const gameName = offer.gameName;
      if (!acc[gameName]) acc[gameName] = [];
      acc[gameName].push(offer);
      return acc;
    }, {} as Record<string, Offer[]>);
  }, [gameOffers]);

  const gameNames = useMemo(() => Object.keys(groupedOffers), [groupedOffers]);

  const handleSelectOffer = (offer: Offer) => {
    setSelectedOffer(offer);
    if (GAMES_REQUIRING_ID.includes(offer.gameName)) {
        if (offer.gameName === 'تصاريح فري فاير') {
            setShowFreeFirePermitDialog(true);
        } else {
            setShowGameIdDialog(true);
        }
    }
  };

  const handlePurchase = async () => {
    if (!firestore || !user || !selectedOffer) return;

    if (user.balance < selectedOffer.price) {
        toast({
            variant: "destructive",
            title: "رصيد غير كافٍ",
            description: "رصيدك الحالي لا يكفي لإتمام هذه العملية.",
        });
        return;
    }

    if (GAMES_REQUIRING_ID.includes(selectedOffer.gameName)) {
       if ((selectedOffer.gameName === 'تصاريح فري فاير' && (!freeFirePermitState.gameId || !freeFirePermitState.gameUsername))
           || (selectedOffer.gameName !== 'تصاريح فري فاير' && (!gameId || !gameUsername))) {
           toast({
                variant: "destructive",
                title: "بيانات ناقصة",
                description: "الرجاء إدخال ID اللاعب واسم الحساب.",
            });
            return;
       }
    }

    setIsPurchaseLoading(true);

    try {
        const userRef = doc(firestore, 'users', user.id);

        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw "المستخدم غير موجود!";
            const currentBalance = userDoc.data().balance;
            const newBalance = currentBalance - selectedOffer.price;
            if (newBalance < 0) throw "رصيد غير كافٍ!";
            transaction.update(userRef, { balance: newBalance });
        });

        const ordersCollectionRef = collection(firestore, 'users', user.id, 'userGameOffers');
        const newPurchaseData: Omit<UserGameOffer, 'id'> = {
            userId: user.id,
            username: user.username,
            walletId: user.walletId,
            gameOfferId: selectedOffer.id,
            gameName: selectedOffer.gameName,
            offerName: selectedOffer.offerName,
            price: selectedOffer.price,
            status: "pending",
            createdAt: new Date(),
            ...(GAMES_REQUIRING_ID.includes(selectedOffer.gameName) && (selectedOffer.gameName === 'تصاريح فري فاير' ? {
                gameId: freeFirePermitState.gameId,
                gameUsername: freeFirePermitState.gameUsername
            } : {
                gameId: gameId,
                gameUsername: gameUsername
            }))
        };
        await addDoc(ordersCollectionRef, newPurchaseData);

        toast({
            title: "تمت عملية الشراء بنجاح!",
            description: `لقد اشتريت ${selectedOffer.offerName}.`,
        });

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "فشل الشراء",
            description: error.toString() || "حدث خطأ أثناء الشراء.",
        });
    } finally {
        setIsPurchaseLoading(false);
        setSelectedOffer(null);
        setShowGameIdDialog(false);
        setShowFreeFirePermitDialog(false);
        setGameId('');
        setGameUsername('');
        setFreeFirePermitState({ gameId: '', gameUsername: '' });
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <main className="flex-grow p-4 pb-24 overflow-y-auto">
        {gameNames.map(game => (
          <div key={game} className="mb-4">
            <h2 className="text-xl font-semibold mb-2">{game}</h2>
            <div className="flex gap-2 overflow-x-auto">
              {groupedOffers[game].map(offer => (
                <OfferCard key={offer.id} offer={offer} onClick={() => handleSelectOffer(offer)} />
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Dialog لتصاريح فري فاير */}
      <Dialog open={showFreeFirePermitDialog} onOpenChange={(open) => {
          if (!open) {
              setShowFreeFirePermitDialog(false);
              setSelectedOffer(null);
              setFreeFirePermitState({ gameId: '', gameUsername: '' });
          }
      }}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>تصاريح فري فاير</DialogTitle>
                <DialogDescription>أدخل ID اللاعب واسم الحساب التقريبي</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ff-game-id" className="text-right">ID اللاعب</Label>
                    <Input id="ff-game-id" value={freeFirePermitState.gameId} onChange={(e) => setFreeFirePermitState(s => ({ ...s, gameId: e.target.value }))} className="col-span-3" placeholder="أدخل ID حسابك" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ff-game-username" className="text-right">الاسم التقريبي</Label>
                    <Input id="ff-game-username" value={freeFirePermitState.gameUsername} onChange={(e) => setFreeFirePermitState(s => ({ ...s, gameUsername: e.target.value }))} className="col-span-3" placeholder="أدخل اسم تقريبي" />
                </div>
                <Separator />
                <div className="text-center">
                    <p>شراء: <span className="font-semibold">{selectedOffer?.offerName}</span></p>
                    <p>السعر: <span className="font-bold">{selectedOffer?.price || 0} ج.س</span></p>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setShowFreeFirePermitDialog(false)}>إلغاء</Button>
                <Button onClick={handlePurchase} disabled={isPurchaseLoading}>{isPurchaseLoading ? <Loader2 className="animate-spin" /> : "تأكيد الشراء"}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDashboard;
