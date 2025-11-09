"use client";

import { useState } from 'react';
import type { User } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LogOut, Edit, Save, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import OfferCard from './offer-card';

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

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [tempBalance, setTempBalance] = useState('');
  const [tempPrice, setTempPrice] = useState('');

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setTempBalance(user.balance.toString());
  };
  
  const handleSaveUser = (userId: string) => {
    const newBalance = parseFloat(tempBalance);
    if (isNaN(newBalance) || newBalance < 0) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال رصيد صحيح.' });
      return;
    }
    const userDocRef = doc(firestore, 'users', userId);
    updateDocumentNonBlocking(userDocRef, { balance: newBalance });
    setEditingUserId(null);
    toast({ title: 'نجاح', description: 'تم تحديث رصيد المستخدم.' });
  };

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">إدارة المستخدمين</TabsTrigger>
            <TabsTrigger value="offers">إدارة العروض</TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <div className="rounded-lg border mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المستخدم</TableHead>
                    <TableHead>الرصيد</TableHead>
                    <TableHead className="text-left">تعديل</TableHead>
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
                          {editingUserId === user.id ? (
                            <Input
                              type="number"
                              value={tempBalance}
                              onChange={(e) => setTempBalance(e.target.value)}
                              className="h-8 max-w-[100px]"
                            />
                          ) : (
                            `$${user.balance.toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell className="text-left">
                          {editingUserId === user.id ? (
                            <div className="flex gap-1">
                              <Button size="icon" className="h-8 w-8" onClick={() => handleSaveUser(user.id)}><Save className="h-4 w-4" /></Button>
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditingUserId(null)}><XCircle className="h-4 w-4" /></Button>
                            </div>
                          ) : (
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditUser(user)}><Edit className="h-4 w-4" /></Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
                            `$${offer.price.toFixed(2)}`
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
