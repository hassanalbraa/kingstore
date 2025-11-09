"use client";

import { useState, type FormEvent } from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus } from 'lucide-react';

interface RegisterFormProps {
  onRegister: (username: string, email: string, password: string) => boolean;
  onSwitchToLogin: () => void;
}

const RegisterForm = ({ onRegister, onSwitchToLogin }: RegisterFormProps) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onRegister(username, email, password);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">إنشاء حساب جديد</CardTitle>
        <CardDescription>املأ البيانات التالية للانضمام إلينا</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">اسم المستخدم</Label>
            <Input
              id="username"
              required
              placeholder="اختر اسم مستخدم فريد"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="أدخل بريدك الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              required
              placeholder="اختر كلمة مرور قوية"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <UserPlus />}
            إنشاء الحساب
          </Button>
          <Button variant="link" type="button" onClick={onSwitchToLogin}>
            لديك حساب بالفعل؟ تسجيل الدخول
          </Button>
        </CardFooter>
      </form>
    </>
  );
};

export default RegisterForm;
