"use client";

import { useState } from 'react';
import type { User, Offer } from '@/lib/types';
import { users as initialUsers, gameOffers as initialOffers } from '@/lib/data';
import { CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LogOut, Edit, Save, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const [users, setUsers] = useState<User[]>(initialUsers.filter(u => u.role !== 'admin'));
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [tempBalance, setTempBalance] = useState('');
  const [tempPrice, setTempPrice] = useState('');
  const { toast } = useToast();

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
    setUsers(users.map(u => u.id === userId ? { ...u, balance: newBalance } : u));
    setEditingUserId(null);
    toast({ title: 'نجاح', description: 'تم تحديث رصيد المستخدم.' });
  };

  const handleEditOffer = (offer: Offer) => {
    setEditingOfferId(offer.id);
    setTempPrice(offer.price.toString());
  };

  const handleSaveOffer = (offerId: string) => {
    const newPrice = parseFloat(tempPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال سعر صحيح.' });
      return;
    }
    setOffers(offers.map(o => o.id === offerId ? { ...o, price: newPrice } : o));
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
                  {users.map((user) => (
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
                  ))}
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
                  {offers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className="font-medium">{offer.name}</TableCell>
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
                  ))}
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
