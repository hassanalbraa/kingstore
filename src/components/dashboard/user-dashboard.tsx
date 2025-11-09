
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { User, Offer, UserGameOffer, Transaction } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, runTransaction, doc, query, orderBy, where, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import OfferCard from './offer-card';
import GameCard from './game-card';
import { Copy, ArrowRight, Loader2 } from 'lucide-react';
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


interface UserDashboardProps {
  user: User;
  onLogout: () => void;
  onGoToSettings: () => void;
}

const GAMES_REQUIRING_ID = ['PUBG', 'Free Fire', 'عروض التيك توك'];

type UserView = 'home' | 'transactions' | 'account' | 'support';

const UserDashboard = ({ user, onLogout, onGoToSettings }: UserDashboardProps) => {
  const { toast } = useToast();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false);
  const [showGameIdDialog, setShowGameIdDialog] = useState(false);
  const [gameId, setGameId] = useState('');
  const [gameUsername, setGameUsername] = useState('');
  const [view, setView] = useState<UserView>('home');
  
  const firestore = useFirestore();
  
  const offersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'gameOffers');
  }, [firestore]);
  const { data: gameOffers, isLoading: offersLoading } = useCollection<Offer>(offersQuery);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.id) return null;
    return query(
      collection(firestore, 'users', user.id, 'transactions'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.id]);
  
  const { data: transactions, isLoading: transactionsLoading } = useCollection<Transaction>(transactionsQuery);


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

  const handleSelectOffer = (offer: Offer) => {
    setSelectedOffer(offer);
    if (GAMES_REQUIRING_ID.includes(offer.gameName)) {
      setShowGameIdDialog(true);
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
    
    if (GAMES_REQUIRING_ID.includes(selectedOffer.gameName) && (!gameId || !gameUsername)) {
       toast({
            variant: "destructive",
            title: "بيانات ناقصة",
            description: "الرجاء إدخال ID اللاعب واسم الحساب.",
        });
        return;
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
        
        // Create an 'order' (UserGameOffer)
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
            ...(GAMES_REQUIRING_ID.includes(selectedOffer.gameName) && {
                gameId: gameId,
                gameUsername: gameUsername
            })
        };
        await addDoc(ordersCollectionRef, newPurchaseData);

        // Create a 'transaction'
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
        setGameId('');
        setGameUsername('');
    }
  };


  const renderHomeContent = () => {
    if (offersLoading) {
      return (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mr-4">جاري تحميل العروض...</p>
        </div>
      );
    }

    if (selectedGame && groupedOffers[selectedGame]) {
      return (
        <div>
          <div className="flex items-center mb-4">
             <Button variant="ghost" size="icon" onClick={() => setSelectedGame(null)}>
                <ArrowRight className="h-5 w-5" />
             </Button>
             <h4 className="text-lg font-bold mr-2">{selectedGame}</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {groupedOffers[selectedGame].map((offer) => (
              <OfferCard key={offer.id} offer={offer} onClick={() => handleSelectOffer(offer)} />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        <h3 className="text-xl font-semibold mb-4 text-center">اختر لعبة</h3>
        {gameNames.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
  
  const renderTransactionsContent = () => {
    if (transactionsLoading) {
       return (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mr-4">جاري تحميل معاملاتك...</p>
        </div>
      );
    }

    return (
       <div className="rounded-lg border mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التفاصيل</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions && transactions.length > 0 ? (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">{tx.description}</TableCell>
                  <TableCell className={cn(
                      "font-bold",
                      tx.amount < 0 ? 'text-red-500' : 'text-green-500'
                  )}>
                    {tx.amount > 0 ? '+' : ''}
                    {tx.amount} ج.س
                  </TableCell>
                  <TableCell>
                    {tx.createdAt ? format(new Date((tx.createdAt as any).seconds * 1000), 'dd/MM/yy hh:mm a') : 'N/A'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">ليس لديك أي معاملات سابقة.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    )
  };

  const renderAccountContent = () => {
    return (
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-4">ملفي الشخصي</h3>
        <div className="space-y-4">
           <div>
            <p className="text-muted-foreground">اسم المستخدم</p>
            <p className="font-bold text-lg">{user.username}</p>
          </div>
           <div>
            <p className="text-muted-foreground">البريد الإلكتروني</p>
            <p className="font-bold text-lg">{user.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">رصيدك الحالي</p>
            <p className="font-bold text-lg text-primary">{user.balance} ج.س</p>
          </div>
           <div className="flex items-center gap-2 mt-2">
                <p className="text-sm text-muted-foreground">رقم محفظتك:</p>
                <span className="font-mono text-sm">{user.walletId}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyWalletId(user.walletId)}>
                    <Copy className="h-4 w-4"/>
                </Button>
           </div>
           <Separator />
           <Button variant="outline" onClick={onGoToSettings} className="w-full">إعدادات الحساب (تغيير كلمة المرور)</Button>
           <Button onClick={onLogout} className="w-full">تسجيل الخروج</Button>
        </div>
      </div>
    );
  };
  
    const renderSupportContent = () => (
    <div className="p-4 text-center">
      <h3 className="text-xl font-semibold mb-4">الدعم الفني</h3>
      <p className="text-muted-foreground">
        للتواصل مع الدعم الفني، يمكنك استخدام القنوات التالية:
      </p>
       <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
        <Button asChild className="w-full sm:w-auto">
            <a href="https://wa.me/249123456789" target="_blank" rel="noopener noreferrer">
                تواصل عبر واتساب
            </a>
        </Button>
        <Button asChild variant="outline" className="w-full sm:w-auto">
            <a href="https://www.facebook.com/share/1EvuK3HxYj/" target="_blank" rel="noopener noreferrer">
                تواصل عبر فيسبوك
            </a>
        </Button>
       </div>
    </div>
  );

  const navItems: NavItem[] = [
    { id: 'account', label: 'حسابي', icon: 'User' },
    { id: 'support', label: 'الدعم', icon: 'MessageSquare' },
    { id: 'home', label: 'الرئيسية', icon: 'Home', isCentral: true },
    { id: 'transactions', label: 'المعاملات', icon: 'Wallet' },
    { id: 'logout', label: 'خروج', icon: 'LogOut', onClick: onLogout },
  ];

  const handleNav = (selectedView: UserView) => {
    if (selectedView === 'account') {
        onGoToSettings();
    } else {
        setView(selectedView);
    }
  }
  
  const renderCurrentView = () => {
    switch (view) {
        case 'home': return renderHomeContent();
        case 'transactions': return renderTransactionsContent();
        case 'account': return renderAccountContent();
        case 'support': return renderSupportContent();
        default: return renderHomeContent();
    }
  }


  return (
    <div className="flex flex-col h-full w-full">
      <main className="flex-grow p-4 pb-24 overflow-y-auto">
        {renderCurrentView()}
      </main>

      {/* Dialogs */}
      <AlertDialog open={!!selectedOffer && !GAMES_REQUIRING_ID.includes(selectedOffer.gameName)} onOpenChange={(open) => !open && setSelectedOffer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد عملية الشراء</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من أنك تريد شراء "{selectedOffer?.offerName}" مقابل <span className="font-bold text-primary">{selectedOffer?.price || 0} ج.س</span>؟
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

      <Dialog open={showGameIdDialog} onOpenChange={(open) => {
          if (!open) {
              setShowGameIdDialog(false);
              setSelectedOffer(null);
              setGameId('');
              setGameUsername('');
          }
      }}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>تأكيد الشراء لـ {selectedOffer?.gameName}</DialogTitle>
                <DialogDescription>
                    الرجاء إدخال بيانات حسابك في اللعبة لإتمام عملية الشحن.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="game-id" className="text-right">ID اللاعب</Label>
                    <Input id="game-id" value={gameId} onChange={(e) => setGameId(e.target.value)} className="col-span-3" placeholder="أدخل ID حسابك في اللعبة" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="game-username" className="text-right">الاسم التقريبي</Label>
                    <Input id="game-username" value={gameUsername} onChange={(e) => setGameUsername(e.target.value)} className="col-span-3" placeholder="أدخل اسم تقريبي لحسابك" />
                </div>
                <Separator />
                <div className="text-center">
                    <p>ستقوم بشراء: <span className="font-semibold">{selectedOffer?.offerName}</span></p>
                    <p>مقابل: <span className="font-bold text-primary">{selectedOffer?.price || 0} ج.س</span></p>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowGameIdDialog(false)}>إلغاء</Button>
                <Button type="submit" onClick={handlePurchase} disabled={isPurchaseLoading}>
                    {isPurchaseLoading ? <Loader2 className="animate-spin" /> : "تأكيد الشراء"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <BottomNavBar<UserView> items={navItems} activeView={view} setView={setView} />
    </div>
  );
};

export default UserDashboard;
