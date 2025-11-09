
"use client";

import { useState, useEffect } from 'react';
import { User as FirebaseAuthUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { useAuth, useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';

import { Card } from '@/components/ui/card';
import AppHeader from '@/components/layout/header';
import LoginForm from '@/components/auth/login-form';
import RegisterForm from '@/components/auth/register-form';
import UserDashboard from '@/components/dashboard/user-dashboard';
import AdminDashboard from '@/components/dashboard/admin-dashboard';
import SettingsPage from '@/components/dashboard/settings-page';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, updatePassword, signInWithEmailAndPassword } from 'firebase/auth';

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

  // Simplified user document creation logic
  const createUserDocument = async (authUser: FirebaseAuthUser) => {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', authUser.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      return; // Document already exists
    }

    try {
      const walletId = Math.floor(1000000 + Math.random() * 9000000).toString();
      const userRole = authUser.email?.toLowerCase() === 'admin@king.store' ? 'admin' : 'user';

      const newUser: Omit<User, 'id'> = {
        walletId,
        username: authUser.displayName || authUser.email?.split('@')[0] || 'New User',
        email: authUser.email || '',
        balance: 0,
        role: userRole,
      };

      await setDoc(userRef, newUser);

      if (userRole === 'admin') {
        const adminRoleDocRef = doc(firestore, "roles_admin", authUser.uid);
        await setDoc(adminRoleDocRef, { email: authUser.email, createdAt: new Date() });
      }
      
      toast({ title: "مرحباً بك!", description: "تم إعداد ملفك الشخصي بنجاح." });

    } catch (error: any) {
      console.error("Error creating user document:", error);
      toast({
        variant: "destructive",
        title: "خطأ في إعداد الملف الشخصي",
        description: "لم نتمكن من إنشاء بيانات حسابك. الرجاء المحاولة مرة أخرى."
      });
    }
  };

  useEffect(() => {
    if (firebaseUser && !isUserDocLoading && !currentUser) {
      createUserDocument(firebaseUser);
    }
  }, [firebaseUser, currentUser, isUserDocLoading]);


  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    if (!auth) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "خدمات Firebase غير متاحة حاليًا."
        });
        return false;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The useEffect hook will handle user document creation on successful login
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: `أهلاً بك!`,
      });
      return true;
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "فشل تسجيل الدخول",
        description: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      });
      return false;
    }
  };
  
  const handleRegister = async (username: string, email: string, password: string): Promise<boolean> => {
    if (!auth) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "خدمات Firebase غير متاحة حاليًا."
        });
        return false;
    }
    
    try {
        // The onAuthStateChanged listener will automatically pick up the new user,
        // and the useEffect will trigger to create their document.
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: 'نجاح', description: 'تم إنشاء حسابك وتسجيل دخولك تلقائيًا!' });
        // The view will change automatically via the user state listener
        return true;

    } catch (error: any) {
        console.error("Registration Error:", error);
        
        let description = "حدث خطأ غير متوقع أثناء إنشاء الحساب.";
        if (error.code === 'auth/email-already-in-use') {
            description = "هذا البريد الإلكتروني مستخدم بالفعل. الرجاء استخدام بريد آخر.";
        } else if (error.code === 'auth/weak-password') {
            description = "كلمة المرور ضعيفة جدًا. يجب أن تتكون من 6 أحرف على الأقل.";
        }
        
        toast({ variant: "destructive", title: "خطأ في إنشاء الحساب", description });

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
    if(auth) auth.signOut();
    setView('login');
  };

  const handleGoToSettings = () => {
    setView('settings');
  };
  
  const handleSwitchView = (newView: View) => {
    setView(newView);
  }

  const handleBackToDashboard = () => {
    // Rely on the currentUser state to determine the correct dashboard
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

    // If no user, show login or register.
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
