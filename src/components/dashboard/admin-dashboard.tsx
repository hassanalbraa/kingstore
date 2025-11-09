"use client";

import { useState } from 'react';
import type { User } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, getDocs, query, where, runTransaction } from 'firebase/firestore';
import { CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LogOut, Edit, Save, XCircle, Loader2, PlusCircle, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);

  const offersQuery = useMemoFirebase(() => collection(firestore, 'game_offers'), [firestore]);
  const { data: offers, isLoading: offersLoading } = useCollection<any>(offersQuery);

  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');

  const [targetWalletId, setTargetWalletId] = useState('');
  const [amountToAdd, setAmountToAdd] = useState('');
  const [isFunding, setIsFunding] = useState(false);

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
    const newPrice = parseFloat(tempPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال سعر صحيح.' });
      return;
    }
    const offerDocRef = doc(firestore, 'game_offers', offerId);
    updateDocumentNonBlocking(offerDocRef, { price: newPrice });
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
                   type="number"
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
            <div className="rounded-lg border mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العرض</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead className="text-left">تعديل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offersLoading ? (
                    <TableRow><TableCell colSpan={3} className="text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                  ) : (
                    offers?.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell className="font-medium">{offer.gameName}</TableCell>
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </>
  );
};

export default AdminDashboard;
