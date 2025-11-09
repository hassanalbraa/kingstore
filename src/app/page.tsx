"use client";

import { useState } from 'react';
import type { User } from '@/lib/types';
import { users as mockUsers } from '@/lib/data';

import { Card } from '@/components/ui/card';
import AppHeader from '@/components/layout/header';
import LoginForm from '@/components/auth/login-form';
import UserDashboard from '@/components/dashboard/user-dashboard';
import AdminDashboard from '@/components/dashboard/admin-dashboard';
import SettingsPage from '@/components/dashboard/settings-page';
import { useToast } from '@/hooks/use-toast';

type View = 'login' | 'user_dashboard' | 'admin_dashboard' | 'settings';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('login');
  const { toast } = useToast();

  const handleLogin = (username: string, password: string): boolean => {
    const user = mockUsers.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      setCurrentUser(user);
      setView(user.role === 'admin' ? 'admin_dashboard' : 'user_dashboard');
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: `أهلاً بك، ${user.username}!`,
      });
      return true;
    } else {
      toast({
        variant: "destructive",
        title: "فشل تسجيل الدخول",
        description: "اسم المستخدم أو كلمة المرور غير صحيحة.",
      });
      return false;
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('login');
  };

  const handleGoToSettings = () => {
    setView('settings');
  };

  const handleBackToDashboard = () => {
    if (currentUser) {
      setView(currentUser.role === 'admin' ? 'admin_dashboard' : 'user_dashboard');
    }
  };

  const renderView = () => {
    switch (view) {
      case 'user_dashboard':
        return currentUser && <UserDashboard user={currentUser} onLogout={handleLogout} onGoToSettings={handleGoToSettings} />;
      case 'admin_dashboard':
        return <AdminDashboard onLogout={handleLogout} />;
      case 'settings':
        return <SettingsPage onBack={handleBackToDashboard} />;
      case 'login':
      default:
        return <LoginForm onLogin={handleLogin} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden">
          {renderView()}
        </Card>
      </main>
    </div>
  );
}
