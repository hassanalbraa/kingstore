

"use client";

import { useState, useMemo } from 'react';
import type { User, Offer, UserGameOffer } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, runTransaction, doc, query, orderBy, where, addDoc } from 'firebase/firestore';
import { CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import OfferCard from './offer-card';
import GameCard from './game-card';
import { Settings, LogOut, Copy, ArrowRight, Loader2, ListOrdered, ShoppingCart } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
  onGoToSettings: () => void;
}

// Games that require extra user input (ID, username)
const GAMES_REQUIRING_ID = ['PUBG', 'Free Fire', 'عروض التيك توك'];

const UserDashboard = ({ user, onLogout, onGoToSettings }: UserDashboardProps) => {
  const { toast } = useToast();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false);
  const [showGameIdDialog, setShowGameIdDialog] = useState(false);
  const [gameId, setGameId] = useState('');
  const [gameUsername, setGameUsername] = useState('');
  
  const firestore = useFirestore();
  
  const offersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'gameOffers') : null, [firestore]);
  const { data: gameOffers, isLoading: offersLoading } = useCollection<Offer>(offersQuery);

  const myOrdersQuery = useMemoFirebase(() => 
    firestore && user 
    ? query(
        collection(firestore, 'userGameOffers'),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc')
      )
    : null
  , [firestore, user]);
  const { data: myOrders, isLoading: ordersLoading } = useCollection<UserGameOffer>(myOrdersQuery);


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
    } else {
      // For other games, show the simple confirmation dialog
      // This part remains unchanged, just setSelectedOffer will trigger the existing AlertDialog
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
    
    // For games requiring ID, check if fields are filled
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

        const newPurchaseData = {
            userId: user.id,
            username: user.username,
            walletId: user.walletId,
            gameOfferId: selectedOffer.id,
            gameName: selectedOffer.gameName,
            offerName: selectedOffer.offerName,
            price: selectedOffer.price,
            status: "pending" as const,
            createdAt: new Date(),
            ...(GAMES_REQUIRING_ID.includes(selectedOffer.gameName) && {
                gameId: gameId,
                gameUsername: gameUsername
            })
        };

        await addDoc(collection(firestore, "userGameOffers"), newPurchaseData);


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


  const renderOffersContent = () => {
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
              <OfferCard key={offer.id} offer={offer} onClick={() => handleSelectOffer(offer)} />
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

  const renderOrdersContent = () => {
    if (ordersLoading) {
       return (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mr-4">جاري تحميل طلباتك...</p>
        </div>
      );
    }

    return (
       <div className="rounded-lg border mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العرض</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myOrders && myOrders.length > 0 ? (
              myOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.offerName}</TableCell>
                  <TableCell>{Math.round(order.price)} ج.س</TableCell>
                  <TableCell>
                    {order.createdAt ? format(new Date((order.createdAt as any).seconds * 1000), 'dd/MM/yyyy hh:mm a') : 'N/A'}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
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
  }

  return (
    <>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">أهلاً بك، {user.username}</h2>
            <p className="text-muted-foreground">رصيدك الحالي: <span className="font-bold text-primary">{Math.round(user.balance)} ج.س</span></p>
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
      <CardContent className="pt-6">
         <Tabs defaultValue="offers" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="offers"><ShoppingCart className="ml-1"/> العروض</TabsTrigger>
              <TabsTrigger value="orders"><ListOrdered className="ml-1" /> طلباتي</TabsTrigger>
            </TabsList>
            <TabsContent value="offers">
              {renderOffersContent()}
            </TabsContent>
            <TabsContent value="orders">
              {renderOrdersContent()}
            </TabsContent>
          </Tabs>
      </CardContent>

       {/* Confirmation Dialog for games NOT requiring ID */}
      <AlertDialog open={!!selectedOffer && !GAMES_REQUIRING_ID.includes(selectedOffer.gameName)} onOpenChange={(open) => !open && setSelectedOffer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد عملية الشراء</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من أنك تريد شراء "{selectedOffer?.offerName}" مقابل <span className="font-bold text-primary">{Math.round(selectedOffer?.price || 0)} ج.س</span>؟
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

      {/* Custom Dialog for games REQUIRING ID */}
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
                    <p>مقابل: <span className="font-bold text-primary">{Math.round(selectedOffer?.price || 0)} ج.س</span></p>
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
    </>
  );
};

export default UserDashboard;
