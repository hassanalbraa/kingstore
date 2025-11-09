"use client";

import { useState, useMemo } from 'react';
import type { User, Offer } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, getDocs, query, where, runTransaction, updateDoc } from 'firebase/firestore';
import { CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LogOut, Edit, Save, XCircle, Loader2, PlusCircle, Copy, Database, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { seedGameOffers } from '@/lib/seed';
import { Combobox } from '@/components/ui/combobox';


interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);

  const offersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'gameOffers') : null, [firestore]);
  const { data: offers, isLoading: offersLoading, error: offersError } = useCollection<Offer>(offersQuery);

  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');

  const [targetWalletId, setTargetWalletId] = useState('');
  const [amountToAdd, setAmountToAdd] = useState('');
  const [isFunding, setIsFunding] = useState(false);
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
            price: price,
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


  const handleFundWallet = async () => {
    if (!targetWalletId || !amountToAdd) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال رقم المحفظة والمبلغ.' });
      return;
    }
    
    const amount = parseFloat(amountToAdd);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صحيح.' });
      return;
    }
    
    setIsFunding(true);
    try {
      if (!firestore) throw new Error("Firestore is not available");
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where("walletId", "==", targetWalletId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("رقم المحفظة غير موجود!");
      }

      const userDoc = querySnapshot.docs[0];
      const userRef = userDoc.ref;
      
      await runTransaction(firestore, async (transaction) => {
        const freshUserDoc = await transaction.get(userRef);
        if (!freshUserDoc.exists()) {
          throw new Error("المستخدم غير موجود!");
        }
        const currentBalance = freshUserDoc.data().balance || 0;
        const newBalance = currentBalance + amount;
        transaction.update(userRef, { balance: newBalance });
      });

      toast({ title: 'نجاح', description: `تم شحن محفظة ${targetWalletId} بمبلغ ${amount.toFixed(2)} ج.س` });
      setTargetWalletId('');
      setAmountToAdd('');
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'فشل الشحن', description: error.message || 'حدث خطأ أثناء شحن المحفظة.' });
    } finally {
      setIsFunding(false);
    }
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
    updateDoc(offerDocRef, { price: newPriceValue });
    setEditingOfferId(null);
    toast({ title: 'نجاح', description: 'تم تحديث سعر العرض.' });
  };

  return (
    <>
      <CardHeader>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">لوحة تحكم الأدمن</h2>
          <Button variant="ghost" size="icon" onClick={onLogout} aria-label="تسجيل الخروج">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">إدارة المستخدمين</TabsTrigger>
            <TabsTrigger value="fund">شحن المحافظ</TabsTrigger>
            <TabsTrigger value="offers">إدارة العروض</TabsTrigger>
          </TabsList>
          <TabsContent value="users">
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
                    users?.filter(u => u.role !== 'admin').map((user) => (
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
                          {`${user.balance.toFixed(2)} ج.س`}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="fund">
            <div className="mt-4 p-4 border rounded-lg space-y-4">
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
               <Button onClick={handleFundWallet} disabled={isFunding} className="w-full">
                 {isFunding ? <Loader2 className="animate-spin"/> : <PlusCircle />}
                 شحن الرصيد
               </Button>
            </div>
          </TabsContent>
          <TabsContent value="offers">
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
                              `${offer.price.toFixed(2)} ج.س`
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </>
  );
};

export default AdminDashboard;
