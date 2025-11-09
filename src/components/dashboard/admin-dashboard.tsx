
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { User, Offer, UserGameOffer, WithId, Transaction } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useUser, useDoc } from '@/firebase';
import { collection, doc, getDocs, query, where, runTransaction, updateDoc, collectionGroup, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Save, XCircle, Loader2, PlusCircle, Copy, Database, Gift, Search, ArrowRight, CheckCircle, RefreshCw, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { seedGameOffers } from '@/lib/seed';
import { Combobox } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import BottomNavBar, { type NavItem } from '../layout/bottom-nav-bar';

interface AdminDashboardProps {
  onLogout: () => void;
}

type FundingStep = 'search' | 'confirm' | 'success';

interface FundingSuccessInfo {
    username: string;
    amount: number;
}

type AdminView = 'orders' | 'users' | 'fund' | 'offers';

const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const { toast } = useToast();
  const [view, setView] = useState<AdminView>('orders');


  const currentUserDocRef = useMemoFirebase(() => {
    if (firestore && authUser) {
        return doc(firestore, 'users', authUser.uid);
    }
    return null;
  }, [firestore, authUser]);
  const { data: currentUser, isLoading: isCurrentUserLoading } = useDoc<User>(currentUserDocRef);
  
  const isCurrentUserAdmin = useMemo(() => currentUser?.role === 'admin', [currentUser]);

  const usersQuery = useMemoFirebase(() => {
    if (firestore && isCurrentUserAdmin) {
        return collection(firestore, 'users');
    }
    return null;
  }, [firestore, isCurrentUserAdmin]);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);
  const displayUsers = useMemo(() => users?.filter(u => u.role === 'user'), [users]);


  const offersQuery = useMemoFirebase(() => {
    if (firestore && isCurrentUserAdmin) {
        return collection(firestore, 'gameOffers');
    }
    return null;
  }, [firestore, isCurrentUserAdmin]);
  const { data: offers, isLoading: offersLoading, error: offersError } = useCollection<Offer>(offersQuery);

  
  const [pendingOrders, setPendingOrders] = useState<WithId<UserGameOffer>[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    const fetchPendingOrders = async () => {
      if (!firestore || !isCurrentUserAdmin) {
        return;
      }
      setOrdersLoading(true);
      try {
        const q = query(collectionGroup(firestore, 'userGameOffers'), where('status', '==', 'pending'));
        const querySnapshot = await getDocs(q);
        const allPendingOrders: WithId<UserGameOffer>[] = [];

        querySnapshot.forEach((doc) => {
            allPendingOrders.push({ id: doc.id, ...(doc.data() as UserGameOffer) });
        });
        
        allPendingOrders.sort((a, b) => {
            const dateA = a.createdAt as any;
            const dateB = b.createdAt as any;
            return dateB.seconds - dateA.seconds;
        });

        setPendingOrders(allPendingOrders);
      } catch (error) {
        console.error("Error fetching pending orders:", error);
        toast({
          variant: "destructive",
          title: "خطأ في جلب الطلبات",
          description: "حدث خطأ أثناء محاولة جلب الطلبات المعلقة.",
        });
      } finally {
        setOrdersLoading(false);
      }
    };

    if (isCurrentUserAdmin) {
      fetchPendingOrders();
    } else {
      setOrdersLoading(false);
    }
  }, [firestore, isCurrentUserAdmin, toast]);


  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);


  // --- Funding State ---
  const [fundingStep, setFundingStep] = useState<FundingStep>('search');
  const [targetWalletId, setTargetWalletId] = useState('');
  const [amountToAdd, setAmountToAdd] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [successInfo, setSuccessInfo] = useState<FundingSuccessInfo | null>(null);
  // ---------------------

  const [isSeeding, setIsSeeding] = useState(false);

  // New state for adding offers
  const [newGameName, setNewGameName] = useState('');
  const [newOfferName, setNewOfferName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [isAddingOffer, setIsAddingOffer] = useState(false);

  const gameNames = useMemo(() => {
    if (!offers) return [];
    const uniqueNames = [...new Set(offers.map(offer => offer.gameName))];
    return uniqueNames.map(name => ({ value: name, label: name }));
  }, [offers]);


  const handleSeedData = async () => {
    if (!firestore) return;
    setIsSeeding(true);
    const result = await seedGameOffers(firestore);
    if (result.success) {
      toast({ title: 'نجاح', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: result.message });
    }
    setIsSeeding(false);
  };

  const handleAddNewOffer = async () => {
    if (!newGameName || !newOfferName || !newPrice) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء ملء جميع الحقول المطلوبة.' });
      return;
    }
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال سعر صحيح.' });
      return;
    }

    if (!firestore) return;

    setIsAddingOffer(true);
    try {
        const offersCollection = collection(firestore, 'gameOffers');
        await addDocumentNonBlocking(offersCollection, {
            gameName: newGameName,
            offerName: newOfferName,
            price: Math.round(price),
            unit: newUnit,
        });

        toast({ title: 'نجاح', description: 'تمت إضافة العرض الجديد بنجاح!' });
        // Reset form
        setNewGameName('');
        setNewOfferName('');
        setNewPrice('');
        setNewUnit('');
    } catch (error) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لم نتمكن من إضافة العرض.' });
    } finally {
        setIsAddingOffer(false);
    }
  };

  const handleSearchUser = async () => {
    if (!targetWalletId) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال رقم المحفظة.' });
      return;
    }
    
    setIsProcessing(true);
    try {
        if (!firestore) throw new Error("Firestore is not available");
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where("walletId", "==", targetWalletId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            setFoundUser(null);
            throw new Error("رقم المحفظة غير موجود!");
        }

        const userDoc = querySnapshot.docs[0];
        setFoundUser({ id: userDoc.id, ...userDoc.data() } as User);
        setFundingStep('confirm');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'فشل البحث', description: error.message || 'حدث خطأ أثناء البحث عن المستخدم.' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleConfirmFunding = async () => {
    if (!foundUser || !amountToAdd) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'بيانات المستخدم أو المبلغ غير مكتملة.' });
        return;
    }
    
    const amount = parseFloat(amountToAdd);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صحيح.' });
      return;
    }
    
    setIsProcessing(true);
    try {
      if (!firestore) throw new Error("Firestore is not available");
      const userRef = doc(firestore, 'users', foundUser.id);
      
      await runTransaction(firestore, async (transaction) => {
        const freshUserDoc = await transaction.get(userRef);
        if (!freshUserDoc.exists()) {
          throw new Error("المستخدم غير موجود!");
        }
        const currentBalance = freshUserDoc.data().balance || 0;
        const newBalance = currentBalance + amount;
        transaction.update(userRef, { balance: newBalance });
      });

      // Create a transaction record
      const transactionCollectionRef = collection(firestore, 'users', foundUser.id, 'transactions');
      const newTransaction: Omit<Transaction, 'id'> = {
        userId: foundUser.id,
        type: 'top-up',
        amount: amount,
        description: `شحن من الأدمن`,
        createdAt: new Date(),
      };
      await addDoc(transactionCollectionRef, newTransaction);
      
      setSuccessInfo({ username: foundUser.username, amount: amount });
      setFundingStep('success');

    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'فشل الشحن', description: error.message || 'حدث خطأ أثناء شحن المحفظة.' });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const resetFundingFlow = () => {
    setFundingStep('search');
    setTargetWalletId('');
    setAmountToAdd('');
    setFoundUser(null);
    setSuccessInfo(null);
  };
  
  const handleCopyWalletId = (walletId: string) => {
    navigator.clipboard.writeText(walletId);
    toast({title: "تم النسخ!", description: "تم نسخ رقم المحفظة."})
  }

  const handleEditOffer = (offer: any) => {
    setEditingOfferId(offer.id);
    setTempPrice(offer.price.toString());
  };

  const handleSaveOffer = (offerId: string) => {
    if(!firestore) return;
    const newPriceValue = parseFloat(tempPrice);
    if (isNaN(newPriceValue) || newPriceValue < 0) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال سعر صحيح.' });
      return;
    }
    const offerDocRef = doc(firestore, 'gameOffers', offerId);
    updateDoc(offerDocRef, { price: Math.round(newPriceValue) });
    setEditingOfferId(null);
    toast({ title: 'نجاح', description: 'تم تحديث سعر العرض.' });
  };
  
 const handleCompleteOrder = async (order: UserGameOffer) => {
    if (!firestore) return;
    setUpdatingOrderId(order.id);
    try {
        const orderRef = doc(firestore, 'users', order.userId, 'userGameOffers', order.id);
        await updateDoc(orderRef, { status: 'completed' });
        toast({ title: "تم!", description: "تم تحديث حالة الطلب إلى مكتمل." });
        setPendingOrders(prev => prev.filter(p => p.id !== order.id));
    } catch (error) {
        console.error("Error completing order: ", error);
        toast({ variant: "destructive", title: "خطأ", description: "فشل تحديث حالة الطلب." });
    } finally {
        setUpdatingOrderId(null);
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

const renderOrdersContent = () => {
    if (ordersLoading) {
        return (
         <div className="flex justify-center items-center p-10">
           <Loader2 className="h-12 w-12 animate-spin text-primary" />
           <p className="mr-4">جاري تحميل الطلبات الجديدة...</p>
         </div>
       );
    }

    if (!pendingOrders || pendingOrders.length === 0) {
        return (
            <div className="rounded-lg border mt-4 p-4 text-center">
             <h3 className="text-lg font-semibold">لا توجد طلبات جديدة</h3>
             <p className="text-muted-foreground mt-2">
               لا توجد طلبات قيد التنفيذ في الوقت الحالي.
             </p>
           </div>
         )
    }

    return (
       <div className="rounded-lg border mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المستخدم</TableHead>
              <TableHead>العرض</TableHead>
              <TableHead>معلومات إضافية</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {pendingOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.username}</TableCell>
                  <TableCell>{order.offerName} ({order.gameName})</TableCell>
                  <TableCell>
                    {order.gameId && <p className="text-xs">ID: <span className="font-mono">{order.gameId}</span></p>}
                    {order.gameUsername && <p className="text-xs">الاسم: {order.gameUsername}</p>}
                  </TableCell>
                  <TableCell className="text-center">{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-center">
                    <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => handleCompleteOrder(order)}
                        disabled={updatingOrderId === order.id}
                        aria-label="إكمال الطلب"
                        className="h-8 w-8"
                    >
                        {updatingOrderId === order.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    )
};


  const renderFundWalletContent = () => {
    switch (fundingStep) {
        case 'success':
            return (
                <div className="text-center p-6 flex flex-col items-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                    <h3 className="text-xl font-bold">تمت العملية بنجاح</h3>
                    <p className="text-muted-foreground mt-2">
                        تم شحن محفظة <span className="font-semibold text-primary">{successInfo?.username}</span> بمبلغ <span className="font-semibold text-primary">{successInfo?.amount || 0} ج.س</span>.
                    </p>
                    <Button onClick={resetFundingFlow} className="mt-6 w-full max-w-sm">
                        <RefreshCw />
                        إجراء عملية شحن جديدة
                    </Button>
                </div>
            );
        case 'confirm':
            return (
                <div className="space-y-4">
                    <Button variant="ghost" onClick={() => setFundingStep('search')} className="mb-2">
                        <ArrowRight className="ml-2" />
                        الرجوع للبحث
                    </Button>
                    <div className="p-4 bg-secondary rounded-lg text-center">
                        <p className="text-sm text-secondary-foreground">سيتم شحن محفظة المستخدم:</p>
                        <h4 className="text-xl font-bold text-primary">{foundUser?.username}</h4>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">المبلغ</Label>
                        <Input 
                            id="amount"
                            type="number"
                            placeholder="أدخل المبلغ المراد شحنه"
                            value={amountToAdd}
                            onChange={(e) => setAmountToAdd(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleConfirmFunding} disabled={isProcessing} className="w-full">
                        {isProcessing ? <Loader2 className="animate-spin"/> : <PlusCircle />}
                        تأكيد الشحن
                    </Button>
                </div>
            );
        case 'search':
        default:
            return (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">شحن رصيد محفظة</h3>
                    <div className="space-y-2">
                        <Label htmlFor="walletId">رقم المحفظة</Label>
                        <Input 
                            id="walletId"
                            type="text"
                            placeholder="أدخل رقم محفظة المستخدم المكون من 7 أرقام"
                            value={targetWalletId}
                            onChange={(e) => setTargetWalletId(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleSearchUser} disabled={isProcessing || !isCurrentUserAdmin} className="w-full">
                        {isProcessing ? <Loader2 className="animate-spin"/> : <Search />}
                        بحث عن المستخدم
                    </Button>
                </div>
            );
    }
};

 const renderUsersContent = () => (
    <div className="rounded-lg border mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم المستخدم</TableHead>
            <TableHead>رقم المحفظة</TableHead>
            <TableHead>الرصيد</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usersLoading ? (
            <TableRow><TableCell colSpan={3} className="text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
          ) : (
            displayUsers?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                     <span className="font-mono text-sm">{user.walletId}</span>
                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyWalletId(user.walletId)}>
                        <Copy className="h-4 w-4"/>
                     </Button>
                  </div>
                </TableCell>
                <TableCell>
                  {`${user.balance} ج.س`}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderOffersContent = () => (
    <div className="space-y-6 mt-4">
      <div className="p-4 border rounded-lg space-y-4">
        <h3 className="text-lg font-semibold">إضافة عرض جديد</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>اسم اللعبة</Label>
                <Combobox
                  items={gameNames}
                  value={newGameName}
                  onChange={setNewGameName}
                  placeholder="اختر أو اكتب اسم اللعبة..."
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="new-offer-name">اسم العرض</Label>
                <Input id="new-offer-name" value={newOfferName} onChange={(e) => setNewOfferName(e.target.value)} placeholder="مثال: 60 شدة" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="new-price">السعر</Label>
                <Input id="new-price" type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="مثال: 3500" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="new-unit">الوحدة</Label>
                <Input id="new-unit" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="مثال: شدة أو 💎" />
            </div>
        </div>
        <Button onClick={handleAddNewOffer} disabled={isAddingOffer} className="w-full">
            {isAddingOffer ? <Loader2 className="animate-spin" /> : <Gift />}
            إضافة العرض
        </Button>
      </div>

      <div className="p-4 border rounded-lg">
         <Button onClick={handleSeedData} disabled={isSeeding}>
            {isSeeding ? <Loader2 className="animate-spin"/> : <Database />}
            إضافة العروض الأولية
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          اضغط هنا لإضافة قائمة العروض المبدئية إلى قاعدة البيانات. هذه العملية تتم مرة واحدة فقط.
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اللعبة</TableHead>
              <TableHead>العرض</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead className="text-left">تعديل</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offersLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
            ) : offersError ? (
               <TableRow><TableCell colSpan={4} className="text-center text-red-500">حدث خطأ أثناء تحميل العروض</TableCell></TableRow>
            ) : (
              offers?.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell className="font-medium">{offer.gameName}</TableCell>
                  <TableCell>{offer.offerName}</TableCell>
                  <TableCell>
                    {editingOfferId === offer.id ? (
                      <Input
                        type="number"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(e.target.value)}
                        className="h-8 max-w-[100px]"
                      />
                    ) : (
                      `${offer.price} ج.س`
                    )}
                  </TableCell>
                  <TableCell className="text-left">
                    {editingOfferId === offer.id ? (
                      <div className="flex gap-1">
                        <Button size="icon" className="h-8 w-8" onClick={() => handleSaveOffer(offer.id)}><Save className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditingOfferId(null)}><XCircle className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditOffer(offer)}><Edit className="h-4 w-4" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )


  if (isCurrentUserLoading) {
    return (
      <div className="flex-grow flex justify-center items-center p-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isCurrentUserAdmin && !isCurrentUserLoading) {
    return (
       <main className="flex-grow flex items-center justify-center p-4">
          <div className="text-center p-10">
            <h3 className="text-xl font-bold text-destructive">وصول مرفوض</h3>
            <p className="text-muted-foreground mt-2">ليس لديك صلاحيات الأدمن للوصول لهذه الصفحة.</p>
             <Button onClick={onLogout} className="mt-4">
                تسجيل الخروج
            </Button>
          </div>
       </main>
    );
  }

  const navItems: NavItem[] = [
    { id: 'orders', label: 'الطلبات', icon: 'Package' },
    { id: 'users', label: 'المستخدمين', icon: 'Users' },
    { id: 'fund', label: 'شحن', icon: 'Wallet' },
    { id: 'offers', label: 'العروض', icon: 'Gift' },
    { id: 'logout', label: 'خروج', icon: 'LogOut', onClick: onLogout },
  ];

  const renderCurrentView = () => {
    switch (view) {
        case 'orders': return renderOrdersContent();
        case 'users': return renderUsersContent();
        case 'fund': return renderFundWalletContent();
        case 'offers': return renderOffersContent();
        default: return renderOrdersContent();
    }
  }

  return (
     <div className="flex flex-col h-full w-full">
      <main className="flex-grow p-4 pb-24 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">لوحة تحكم الأدمن</h2>
        {renderCurrentView()}
      </main>
      <BottomNavBar<AdminView> items={navItems} activeView={view} setView={setView} />
    </div>
  );
};

export default AdminDashboard;
    

    