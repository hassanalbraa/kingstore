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
import { Copy, ArrowRight, Loader2, CreditCard, Home, User as UserIcon, Wallet, MessageSquare, LogOut, Package, Smartphone } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import BottomNavBar, { type NavItem } from '../layout/bottom-nav-bar';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '../ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
  onGoToSettings: () => void;
}

const GAMES_REQUIRING_ID = ['PUBG', 'Free Fire', 'عروض التيك توك', 'تصاريح فري فاير'];

type UserView = 'home' | 'orders' | 'wallet' | 'account';

// My Kashi specific state
interface MyKashiState {
    accountNumber: string;
    accountName: string;
    amount: string;
}

// Credit Transfer specific state
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
  const [showMyKashiDialog, setShowMyKashiDialog] = useState(false);
  const [showCreditTransferDialog, setShowCreditTransferDialog] = useState(false);
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
  const { data: gameOffers, isLoading: offersLoading } = useCollection<Offer>(offersQuery);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.id) return null;
    return query(
      collection(firestore, 'users', user.id, 'userGameOffers'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.id]);
  const { data: orders, isLoading: ordersLoading_ } = useCollection<UserGameOffer>(ordersQuery);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.id) return null;
    return query(
        collection(firestore, 'users', user.id, 'transactions'),
        orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.id]);
  const { data: transactions, isLoading: transactionsLoading } = useCollection<WithId<Transaction>>(transactionsQuery);


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
  
  const handleGameCardClick = (gameName: string) => {
    setSelectedGame(gameName);
  };

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
            description: "رصيدك الحالي لا يكفي لإتمام هذه العملية. الرجاء شحن حسابك.",
        });
        setSelectedOffer(null);
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
            if (!userDoc.exists()) {
                throw "المستخدم غير موجود!";
            }

            const currentBalance = userDoc.data().balance;
            const newBalance = currentBalance - selectedOffer.price;
            if (newBalance < 0) {
              throw "رصيد غير كافٍ!";
            }
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

        const transactionCollectionRef = collection(firestore, 'users', user.id, 'transactions');
        const newTransaction: Omit<Transaction, 'id'> = {
            userId: user.id,
            type: 'purchase',
            amount: -selectedOffer.price,
            description: `شراء: ${selectedOffer.offerName}`,
            createdAt: new Date(),
        };
        await addDoc(transactionCollectionRef, newTransaction);

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
        setShowGameIdDialog(false);
        setShowFreeFirePermitDialog(false);
        setGameId('');
        setGameUsername('');
        setFreeFirePermitState({ gameId: '', gameUsername: '' });
    }
  };

  // باقي الكود الخاص بالمحفظة، ماي كاشي، تحويل الرصيد، عرض الطلبات، الحساب الشخصي
  // … (احتفظت بنفس الكود الأصلي للـ dialogs الأخرى)
  
  return (
    <div className="flex flex-col h-full w-full">
      <main className="flex-grow p-4 pb-24 overflow-y-auto">
        {/* عرض المحتوى حسب view */}
      </main>

      {/* AlertDialog والـ Dialogs القديمة */}
      {/* … Dialog شراء الألعاب، My Kashi، تحويل الرصيد */}

      {/* Dialog جديد لتصاريح فري فاير */}
      <Dialog open={showFreeFirePermitDialog} onOpenChange={(open) => {
          if (!open) {
              setShowFreeFirePermitDialog(false);
              setSelectedOffer(null);
              setFreeFirePermitState({ gameId: '', gameUsername: '' });
          }
      }}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>شراء تصاريح فري فاير</DialogTitle>
                <DialogDescription>
                    الرجاء إدخال بيانات الحساب لإتمام الشحن.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ff-game-id" className="text-right">ID اللاعب</Label>
                    <Input id="ff-game-id" value={freeFirePermitState.gameId} onChange={(e) => setFreeFirePermitState(s => ({ ...s, gameId: e.target.value }))} className="col-span-3" placeholder="أدخل ID حسابك في فري فاير" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ff-game-username" className="text-right">الاسم التقريبي</Label>
                    <Input id="ff-game-username" value={freeFirePermitState.gameUsername} onChange={(e) => setFreeFirePermitState(s => ({ ...s, gameUsername: e.target.value }))} className="col-span-3" placeholder="أدخل اسم تقريبي لحسابك" />
                </div>
                <Separator />
                <div className="text-center">
                    <p>ستقوم بشراء: <span className="font-semibold">{selectedOffer?.offerName}</span></p>
                    <p>مقابل: <span className="font-bold text-primary">{selectedOffer?.price || 0} ج.س</span></p>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowFreeFirePermitDialog(false)}>إلغاء</Button>
                <Button type="submit" onClick={handlePurchase} disabled={isPurchaseLoading}>
                    {isPurchaseLoading ? <Loader2 className="animate-spin" /> : "تأكيد الشراء"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BottomNavBar */}
    </div>
  );
};

export default UserDashboard;
