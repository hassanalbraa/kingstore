"use client";

import type { User } from '@/lib/types';
import { gameOffers } from '@/lib/data';
import { CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import OfferCard from './offer-card';
import { Settings, LogOut } from 'lucide-react';

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
  onGoToSettings: () => void;
}

const UserDashboard = ({ user, onLogout, onGoToSettings }: UserDashboardProps) => {
  return (
    <>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">أهلاً بك، {user.username}</h2>
            <p className="text-muted-foreground">رصيدك الحالي: <span className="font-bold text-primary">${user.balance.toFixed(2)}</span></p>
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
        <h3 className="text-xl font-semibold mb-4">العروض المتاحة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {gameOffers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      </CardContent>
    </>
  );
};

export default UserDashboard;
