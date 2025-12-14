"use client";

import { useState, useMemo, useEffect } from 'react';
import type { User, Offer, UserGameOffer, Transaction, WithId } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, runTransaction, doc, query, orderBy, where, addDoc } from 'firebase/firestore';
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

// قائمة الألعاب التي تتطلب إدخال ID
// ملاحظة: 'تصاريح-فري-فاير' مدمجة هنا
const GAMES_REQUIRING_ID = ['PUBG', 'Free Fire', 'عروض التيك توك', 'تصاريح-فري-فاير'];

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

// 🆕 حالة تصاريح-فري-فاير
interface FreeFirePermitState {
    gameId: string;
    gameUsername: string;
}


const UserDashboard = ({ user, onLogout, onGoToSettings }: UserDashboardProps) => {
  const { toast } = useToast();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false);
  const [showGameIdDialog, setShowGameIdDialog] = useState(false);
  const [showMyKashiDialog, setShowMyKashiDialog] = useState(false);
  const [showCreditTransferDialog, setShowCreditTransferDialog] = useState(false);
  
  // 🆕 حالة الدايلوق المخصص لتصاريح-فري-فاير
  const [showFreeFirePermitDialog, setShowFreeFirePermitDialog] = useState(false);
  const [freeFirePermitState, setFreeFirePermitState] = useState<FreeFirePermitState>({ gameId: '', gameUsername: '' });
  
  const [gameId, setGameId] = useState('');
  const [gameUsername, setGameUsername] = useState('');
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

  // 🔄 تعديل دالة اختيار العرض
  const handleSelectOffer = (offer: Offer) => {
    setSelectedOffer(offer);
    
    // 🆕 فتح الدايلوق المخصص لـ 'تصاريح-فري-فاير'
    if (offer.gameName === 'تصاريح-فري-فاير') {
        setShowFreeFirePermitDialog(true);
    } 
    // المنطق العام للألعاب التي تتطلب ID
    else if (GAMES_REQUIRING_ID.includes(offer.gameName)) {
      setShowGameIdDialog(true);
    }
  };
  
  // 🔄 تعديل دالة الشراء لدمج بيانات 'تصاريح-فري-فاير'
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
    
    // 🆕 تحديد مصدر بيانات ID اللاعب
    let finalGameId = gameId;
    let finalGameUsername = gameUsername;
    
    if (selectedOffer.gameName === 'تصاريح-فري-فاير') {
        finalGameId = freeFirePermitState.gameId;
        finalGameUsername = freeFirePermitState.gameUsername;
    }
    
    // التحقق من البيانات المطلوبة قبل المتابعة
    if (GAMES_REQUIRING_ID.includes(selectedOffer.gameName) && (!finalGameId || !finalGameUsername)) {
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
            
            // 🆕 استخدام البيانات الموحدة
            ...(GAMES_REQUIRING_ID.includes(selectedOffer.gameName) && {
                gameId: finalGameId,
                gameUsername: finalGameUsername
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
        // 🆕 إغلاق الدايلوق المخصص وتصفير حالته
        setShowFreeFirePermitDialog(false); 
        setFreeFirePermitState({ gameId: '', gameUsername: '' }); 
        
        setGameId('');
        setGameUsername('');
    }
  };

  const handleMyKashiTopup = async () => {
    if (!firestore || !user) return;

    const amount = parseFloat(myKashiState.amount);
    if (isNaN(amount) || amount <= 0) {
        toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال مبلغ صحيح." });
        return;
    }
    if (!myKashiState.accountNumber || !myKashiState.accountName) {
        toast({ variant: "destructive", title: "بيانات ناقصة", description: "الرجاء إدخال رقم واسم الحساب." });
        return;
    }
     if (user.balance < amount) {
        toast({
            variant: "destructive",
            title: "رصيد غير كافٍ",
            description: `رصيدك الحالي (${user.balance} ج.س) لا يكفي لإتمام هذه العملية.`,
        });
        return;
    }

    setIsPurchaseLoading(true);

    try {
        const userRef = doc(firestore, 'users', user.id);

        // Deduct balance
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw "المستخدم غير موجود!";
            
            const currentBalance = userDoc.data().balance;
            const newBalance = currentBalance - amount;
            if (newBalance < 0) throw "رصيد غير كافٍ!";
            
            transaction.update(userRef, { balance: newBalance });
        });

        // Create a UserGameOffer for admin processing
        const ordersCollectionRef = collection(firestore, 'users', user.id, 'userGameOffers');
        const newOrderData: Omit<UserGameOffer, 'id'> = {
            userId: user.id,
            username: user.username,
            walletId: user.walletId,
            gameOfferId: 'my-kashi-topup',
            gameName: 'تغذية ماي كاشي',
            offerName: `طلب تحويل ${amount} ج.س`,
            price: amount,
            amount: amount,
            status: "pending",
            createdAt: new Date(),
            gameId: myKashiState.accountNumber, // Storing account number in gameId
            gameUsername: myKashiState.accountName, // Storing account name in gameUsername
        };
        await addDoc(ordersCollectionRef, newOrderData);

        // Create a financial transaction record
        const transactionCollectionRef = collection(firestore, 'users', user.id, 'transactions');
        const newTransaction: Omit<Transaction, 'id'> = {
            userId: user.id,
            type: 'purchase',
            amount: -amount,
            description: `تحويل ماي كاشي: ${amount} ج.س`,
            createdAt: new Date(),
        };
        await addDoc(transactionCollectionRef, newTransaction);

        toast({
            title: "تم استلام طلبك بنجاح!",
            description: `سيتم تحويل مبلغ ${amount} ج.س قريباً.`,
        });

    } catch (error: any) {
        console.error("My Kashi Top-up Error: ", error);
        toast({
            variant: "destructive",
            title: "فشل الطلب",
            description: error.toString() || "حدث خطأ أثناء محاولة إرسال الطلب.",
        });
    } finally {
        setIsPurchaseLoading(false);
        setShowMyKashiDialog(false);
        setMyKashiState({ accountNumber: '', accountName: '', amount: '' });
    }
  };

  const handleCreditTransfer = async () => {
    if (!firestore || !user) return;
    
    const { provider, phoneNumber, amount: amountStr } = creditTransferState;
    const amount = parseFloat(amountStr);

    // Validation
    if (isNaN(amount) || amount <= 0) {
        toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال مبلغ صحيح." });
        return;
    }
    if (user.balance < amount) {
        toast({ variant: "destructive", title: "رصيد غير كافٍ", description: `رصيدك (${user.balance} ج.س) لا يكفي لإتمام هذه العملية.` });
        return;
    }
     if (!phoneNumber) {
        toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال رقم الهاتف." });
        return;
    }
    if ((provider === 'Zain' || provider === 'MTN') && !phoneNumber.startsWith('09')) {
        toast({ variant: "destructive", title: "رقم هاتف غير صحيح", description: `رقم ${provider} يجب أن يبدأ بـ 09.` });
        return;
    }
     if (provider === 'Sudani' && !phoneNumber.startsWith('01')) {
        toast({ variant: "destructive", title: "رقم هاتف غير صحيح", description: "رقم سوداني يجب أن يبدأ بـ 01." });
        return;
    }


    setIsPurchaseLoading(true);
    try {
        const userRef = doc(firestore, 'users', user.id);

        // Deduct balance
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw "المستخدم غير موجود!";
            const currentBalance = userDoc.data().balance;
            const newBalance = currentBalance - amount;
            if (newBalance < 0) throw "رصيد غير كافٍ!";
            transaction.update(userRef, { balance: newBalance });
        });

        // Create an order for the admin
        const ordersCollectionRef = collection(firestore, 'users', user.id, 'userGameOffers');
        const newOrderData: Omit<UserGameOffer, 'id'> = {
            userId: user.id,
            username: user.username,
            walletId: user.walletId,
            gameOfferId: 'credit-transfer',
            gameName: 'تحويل رصيد',
            offerName: `تحويل ${provider} ${amount} ج.س`,
            price: amount,
            amount: amount,
            status: "pending",
            createdAt: new Date(),
            gameId: phoneNumber, // Use gameId to store phone number
        };
        await addDoc(ordersCollectionRef, newOrderData);

        // Create a financial transaction record
        const transactionCollectionRef = collection(firestore, 'users', user.id, 'transactions');
        const newTransaction: Omit<Transaction, 'id'> = {
            userId: user.id,
            type: 'purchase',
            amount: -amount,
            description: `تحويل رصيد ${provider}: ${amount} ج.س`,
            createdAt: new Date(),
        };
        await addDoc(transactionCollectionRef, newTransaction);

        toast({
            title: "تم استلام طلبك بنجاح!",
            description: `سيتم تحويل مبلغ ${amount} ج.س إلى الرقم ${phoneNumber} قريباً.`,
        });

    } catch (error: any) {
        console.error("Credit Transfer Error: ", error);
        toast({ variant: "destructive", title: "فشل الطلب", description: error.toString() || "حدث خطأ أثناء محاولة إرسال الطلب." });
    } finally {
        setIsPurchaseLoading(false);
        setShowCreditTransferDialog(false);
        setCreditTransferState({ provider: 'Zain', phoneNumber: '', amount: '' });
    }
  };


  const getStatusBadge = (status: 'pending' | 'completed' | 'failed') => {
      switch (status) {
          case 'pending':
              return <Badge variant="secondary">قيد التنفيذ</Badge>;
          case 'completed':
              return <Badge>مكتمل</Badge>;
          case 'failed':
              return <Badge variant="destructive">فشل</Badge>;
          default:
              return <Badge variant="outline">غير معروف</Badge>;
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
        <h3 className="text-xl font-semibold mb-4 text-center">اختر خدمة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {gameNames.map((gameName) => (
            <GameCard 
                key={gameName} 
                gameName={gameName} 
                onClick={() => handleGameCardClick(gameName)} 
            />
            ))}
             <Card 
                onClick={() => setShowCreditTransferDialog(true)}
                className="bg-secondary border-2 border-transparent hover:border-primary transition-all duration-300 cursor-pointer group overflow-hidden"
            >
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                    <Smartphone className="h-12 w-12 text-primary mb-4 transition-transform group-hover:scale-110" />
                    <h3 className="text-lg font-bold text-secondary-foreground">تحويل رصيد</h3>
                </CardContent>
            </Card>
             <Card 
                onClick={() => setShowMyKashiDialog(true)}
                className="bg-secondary border-2 border-transparent hover:border-primary transition-all duration-300 cursor-pointer group overflow-hidden"
            >
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                    <CreditCard className="h-12 w-12 text-primary mb-4 transition-transform group-hover:scale-110" />
                    <h3 className="text-lg font-bold text-secondary-foreground">تغذية ماي كاشي</h3>
                </CardContent>
            </Card>
        </div>
      </div>
    );
  };
  
  const renderOrdersContent = () => {
    if (ordersLoading_) {
       return (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mr-4">جاري تحميل طلباتك...</p>
        </div>
      );
    }

    return (
       <div className="rounded-lg border mt-4">
        <h3 className="text-xl font-semibold my-4 text-center">طلباتي</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الطلب</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders && orders.length > 0 ? (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.offerName}</TableCell>
                  <TableCell>
                    {order.price} ج.س
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(order.status)}
                  </TableCell>
                  <TableCell>
                    {order.createdAt ? format(new Date((order.createdAt as any).seconds * 1000), 'dd/MM/yy hh:mm a') : 'N/A'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">ليس لديك أي طلبات سابقة.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    )
  };

  const renderWalletContent = () => {
    if (transactionsLoading) {
      return (
       <div className="flex justify-center items-center p-10">
         <Loader2 className="h-12 w-12 animate-spin text-primary" />
         <p className="mr-4">جاري تحميل المعاملات...</p>
       </div>
     );
   }

   return (
    <div className="p-4">
      <h3 className="text-xl font-semibold mb-4 text-center">المحفظة</h3>
      <div className="p-4 bg-secondary rounded-lg text-center mb-4">
        <p className="text-sm text-secondary-foreground">رصيدك الحالي</p>
        <p className="font-bold text-2xl text-primary">{user.balance} ج.س</p>
         <div className="flex items-center justify-center gap-2 mt-2">
              <p className="text-xs text-muted-foreground">رقم المحفظة:</p>
              <span className="font-mono text-xs">{user.walletId}</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleCopyWalletId(user.walletId)}>
                  <Copy className="h-3 w-3"/>
              </Button>
         </div>
      </div>

       <div className="rounded-lg border mt-4">
       <Table>
         <TableHeader>
           <TableRow>
             <TableHead>الوصف</TableHead>
             <TableHead>المبلغ</TableHead>
             <TableHead>التاريخ</TableHead>
           </TableRow>
         </TableHeader>
         <TableBody>
           {transactions && transactions.length > 0 ? (
             transactions.map((tx) => (
               <TableRow key={tx.id}>
                 <TableCell className="font-medium">{tx.description}</TableCell>
                 <TableCell 
                     className={cn("font-bold", tx.amount > 0 ? 'text-green-500' : 'text-red-500')}
                 >
                   {tx.amount > 0 ? `+${tx.amount}` : tx.amount} ج.س
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
    </div>
  );
  }

  const renderAccountContent = () => {
    return (
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-4 text-center">ملفي الشخصي</h3>
        <div className="space-y-4">
           <div>
            <p className="text-muted-foreground">اسم المستخدم</p>
            <p className="font-bold text-lg">{user.username}</p>
          </div>
           <div>
            <p className="text-muted-foreground">البريد الإلكتروني</p>
            <p className="font-bold text-lg">{user.email}</p>
          </div>
           <Separator />
           <Button variant="outline" onClick={onGoToSettings} className="w-full">إعدادات الحساب (تغيير كلمة المرور)</Button>
           <Button asChild className="w-full" variant="outline">
            <a href="https://wa.me/+249924737300" target="_blank" rel="noopener noreferrer">
                <MessageSquare className="ml-2"/>
                الدعم الفني عبر واتساب
            </a>
          </Button>
           <Button asChild className="w-full" variant="outline">
            <a href="https://www.facebook.com/profile.php?id=61580352356187" target="_blank" rel="noopener noreferrer">
                <MessageSquare className="ml-2"/>
                الدعم الفني عبر فيسبوك
            </a>
          </Button>
           <Button onClick={onLogout} className="w-full">تسجيل الخروج</Button>
        </div>
      </div>
    );
  };
  

  const navItems: NavItem[] = [
    { id: 'wallet', label: 'المحفظة', icon: 'Wallet' },
    { id: 'orders', label: 'طلباتي', icon: 'Package' },
    { id: 'home', label: 'الرئيسية', icon: 'Home', isCentral: true },
    { id: 'account', label: 'حسابي', icon: 'User' },
    { id: 'logout', label: 'خروج', icon: 'LogOut', onClick: onLogout },
  ];
  
  const renderCurrentView = () => {
    switch (view) {
        case 'home': return renderHomeContent();
        case 'orders': return renderOrdersContent();
        case 'wallet': return renderWalletContent();
        case 'account': return renderAccountContent();
        default: return renderHomeContent();
    }
  }


  return (
    <div className="flex flex-col h-full w-full">
      <main className="flex-grow p-4 pb-24 overflow-y-auto">
        {renderCurrentView()}
      </main>

      {/* Dialogs */}
      {/* 1. دايلوق تأكيد الشراء العادي (الذي لا يتطلب ID) */}
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
      
      {/* 2. دايلوق ID اللاعب العام (لـ PUBG، Free Fire الأساسي، إلخ) */}
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
                    <Input id="game-username" value={gameUsername} onChange={(e) => setGameUsername(e.target.value)} className="col-span-3" placeholder="البريد الإلكتروني" />
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
      
      {/* 🆕 3. الدايلوق المخصص لـ 'تصاريح-فري-فاير' */}
      <Dialog open={showFreeFirePermitDialog} onOpenChange={(open) => {
          if (!open) {
              setShowFreeFirePermitDialog(false);
              setFreeFirePermitState({ gameId: '', gameUsername: '' });
              setSelectedOffer(null);
          }
      }}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle>تأكيد شراء تصاريح-فري-فاير</DialogTitle>
                  <DialogDescription>
                      الرجاء إدخال بيانات حسابك لإتمام عملية الشحن.
                  </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                  <div className="flex flex-col space-y-2">
                      <Label htmlFor="ff-game-id">ID اللاعب</Label>
                      <Input 
                          id="ff-game-id" 
                          value={freeFirePermitState.gameId} 
                          onChange={(e) => setFreeFirePermitState(s => ({ ...s, gameId: e.target.value }))} 
                          placeholder="أدخل ID حسابك في فري فاير" 
                      />
                  </div>

                  <div className="flex flex-col space-y-2">
                      <Label htmlFor="ff-game-username">الاسم التقريبي</Label>
                      <Input 
                          id="ff-game-username" 
                          value={freeFirePermitState.gameUsername} 
                          onChange={(e) => setFreeFirePermitState(s => ({ ...s, gameUsername: e.target.value }))} 
                          placeholder="أدخل اسم تقريبي لحسابك" 
                      />
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
      
      {/* 4. دايلوق تغذية ماي كاشي */}
      <Dialog open={showMyKashiDialog} onOpenChange={(open) => {
          if (!open) {
              setShowMyKashiDialog(false);
              setMyKashiState({ accountNumber: '', accountName: '', amount: '' });
          }
      }}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>طلب تغذية ماي كاشي</DialogTitle>
                <DialogDescription>
                    أدخل تفاصيل الحساب والمبلغ المطلوب. سيتم خصم المبلغ من محفظتك.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="kashi-account-number" className="text-right">رقم الحساب</Label>
                    <Input id="kashi-account-number" value={myKashiState.accountNumber} onChange={(e) => setMyKashiState(s => ({...s, accountNumber: e.target.value}))} className="col-span-3" placeholder="رقم حساب ماي كاشي" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="kashi-account-name" className="text-right">اسم الحساب</Label>
                    <Input id="kashi-account-name" value={myKashiState.accountName} onChange={(e) => setMyKashiState(s => ({...s, accountName: e.target.value}))} className="col-span-3" placeholder="اسم صاحب الحساب" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="kashi-amount" className="text-right">المبلغ (ج.س)</Label>
                    <Input id="kashi-amount" type="number" value={myKashiState.amount} onChange={(e) => setMyKashiState(s => ({...s, amount: e.target.value}))} className="col-span-3" placeholder="المبلغ المراد تحويله" />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowMyKashiDialog(false)}>إلغاء</Button>
                <Button type="submit" onClick={handleMyKashiTopup} disabled={isPurchaseLoading}>
                    {isPurchaseLoading ? <Loader2 className="animate-spin" /> : "تأكيد وإرسال الطلب"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. دايلوق تحويل رصيد */}
       <Dialog open={showCreditTransferDialog} onOpenChange={(open) => {
          if (!open) {
              setShowCreditTransferDialog(false);
              setCreditTransferState({ provider: 'Zain', phoneNumber: '', amount: '' });
          }
      }}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>طلب تحويل رصيد</DialogTitle>
                <DialogDescription>
                    اختر الشبكة وأدخل الرقم والمبلغ. سيتم خصم المبلغ من محفظتك.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label>اختر الشبكة</Label>
                    <RadioGroup 
                        defaultValue="Zain" 
                        className="flex gap-4"
                        value={creditTransferState.provider}
                        onValueChange={(value: NetworkProvider) => setCreditTransferState(s => ({...s, provider: value}))}
                    >
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="Zain" id="Zain" />
                            <Label htmlFor="Zain">زين</Label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="Sudani" id="Sudani" />
                            <Label htmlFor="Sudani">سوداني</Label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="MTN" id="MTN" />
                            <Label htmlFor="MTN">MTN</Label>
                        </div>
                    </RadioGroup>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone-number">رقم الهاتف</Label>
                    <Input id="phone-number" type="tel" value={creditTransferState.phoneNumber} onChange={(e) => setCreditTransferState(s => ({...s, phoneNumber: e.target.value}))} placeholder="يبدأ بـ 09 أو 01" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="credit-amount">المبلغ (ج.س)</Label>
                    <Input id="credit-amount" type="number" value={creditTransferState.amount} onChange={(e) => setCreditTransferState(s => ({...s, amount: e.target.value}))} placeholder="المبلغ المراد تحويله" />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreditTransferDialog(false)}>إلغاء</Button>
                <Button type="submit" onClick={handleCreditTransfer} disabled={isPurchaseLoading}>
                    {isPurchaseLoading ? <Loader2 className="animate-spin" /> : "تأكيد وإرسال الطلب"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>


      <BottomNavBar<UserView> items={navItems} activeView={view} setView={setView} />
    </div>
  );
};

export default UserDashboard;
