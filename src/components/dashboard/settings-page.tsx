"use client";

import { useState } from 'react';
import { CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, KeyRound, Loader2 } from 'lucide-react';

interface SettingsPageProps {
  onBack: () => void;
  onChangePassword: (newPassword: string) => Promise<void>;
}

const SettingsPage = ({ onBack, onChangePassword }: SettingsPageProps) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'كلمتا المرور غير متطابقتين.' });
      return;
    }
    setIsLoading(true);
    await onChangePassword(newPassword);
    setIsLoading(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <>
      <CardHeader>
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={onBack} aria-label="رجوع">
              <ArrowRight className="h-6 w-6" />
            </Button>
          <CardTitle className="text-2xl font-bold">إعدادات الحساب</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
          <Input 
            id="new-password" 
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="أدخل كلمة المرور الجديدة"
            />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
          <Input 
            id="confirm-password" 
            type="password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="أعد إدخال كلمة المرور"
            />
        </div>
      </CardContent>
      <CardFooter className="flex-col sm:flex-row gap-2">
        <Button onClick={handleChangePassword} className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : <KeyRound className="ms-2 h-4 w-4" />}
          تغيير كلمة المرور
        </Button>
      </CardFooter>
    </>
  );
};

export default SettingsPage;
