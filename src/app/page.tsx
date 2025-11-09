"use client";

import { useState } from 'react';
import { User as FirebaseAuthUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { useAuth, useUser, useFirestore, useMemoFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';

import { Card } from '@/components/ui/card';
import AppHeader from '@/components/layout/header';
import LoginForm from '@/components/auth/login-form';
import RegisterForm from '@/components/auth/register-form';
import UserDashboard from '@/components/dashboard/user-dashboard';
import AdminDashboard from '@/components/dashboard/admin-dashboard';
import SettingsPage from '@/components/dashboard/settings-page';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, updatePassword } from 'firebase/auth';

type View = 'login' | 'register' | 'user_dashboard' | 'admin_dashboard' | 'settings';

export default function Home() {
  const [view, setView] = useState<View>('login');
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user: firebaseUser, isUserLoading } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !firebaseUser) return null;
    return doc(firestore, 'users', firebaseUser.uid);
  }, [firestore, firebaseUser]);

  const { data: currentUser, isLoading: isUserDocLoading } = useDoc<User>(userDocRef);

  const handleLogin = (email: string, password: string): boolean => {
    initiateEmailSignIn(auth, email, password);
    // We don't return true/false anymore as auth is async
    return true; 
  };
  
  const handleRegister = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      // First, create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const authUser = userCredential.user;

      // Then, create user profile in Firestore
      const newUser: User = {
        id: authUser.uid,
        username,
        email,
        balance: 0,
        role: 'user', // Default role
      };

      // Use non-blocking write
      const userDoc = doc(firestore, "users", authUser.uid);
      setDoc(userDoc, newUser).catch(error => {
        console.error("Error writing user document: ", error);
        // Here you could emit a global error
      });
      
      toast({ title: 'نجاح', description: 'تم إنشاء حسابك بنجاح! يمكنك الآن تسجيل الدخول.' });
      setView('login');
      return true;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({ variant: "destructive", title: "خطأ", description: "هذا البريد الإلكتروني مستخدم بالفعل." });
      } else {
        toast({ variant: "destructive", title: "خطأ في التسجيل", description: "حدث خطأ غير متوقع أثناء إنشاء حسابك. يرجى المحاولة مرة أخرى." });
      }
      return false;
    }
  };

  const handleChangePassword = async (newPassword: string) => {
    if (!auth.currentUser) {
        toast({ variant: "destructive", title: "خطأ", description: "يجب عليك تسجيل الدخول أولاً." });
        return;
    }
    try {
        await updatePassword(auth.currentUser, newPassword);
        toast({ title: 'نجاح', description: 'تم تغيير كلمة المرور بنجاح!' });
        handleBackToDashboard();
    } catch (error) {
        toast({ variant: "destructive", title: "خطأ", description: "فشل تغيير كلمة المرور. قد تحتاج إلى تسجيل الدخول مرة أخرى." });
    }
  };

  const handleLogout = () => {
    auth.signOut();
    setView('login');
  };

  const handleGoToSettings = () => {
    setView('settings');
  };
  
  const handleSwitchView = (newView: View) => {
    setView(newView);
  }

  const handleBackToDashboard = () => {
    if (currentUser?.role === 'admin') {
      setView('admin_dashboard');
    } else {
      setView('user_dashboard');
    }
  };

  const renderView = () => {
    if (isUserLoading || (firebaseUser && isUserDocLoading)) {
      return <div className="flex justify-center items-center p-10"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    if (firebaseUser && currentUser) {
       if (view === 'settings') {
         return <SettingsPage onBack={handleBackToDashboard} onChangePassword={handleChangePassword}/>;
       }
       if (currentUser.role === 'admin') {
         return <AdminDashboard onLogout={handleLogout} />
       }
       return <UserDashboard user={currentUser} onLogout={handleLogout} onGoToSettings={handleGoToSettings} />;
    }

    // If no user, show login or register
    switch (view) {
      case 'register':
        return <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => handleSwitchView('login')} />;
      case 'login':
      default:
        return <LoginForm onLogin={handleLogin} onSwitchToRegister={() => handleSwitchView('register')} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden min-h-[300px]">
          {renderView()}
        </Card>
      </main>
    </div>
  );
}
