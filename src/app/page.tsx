
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

type AuthView = 'login' | 'register';
type AppView = 'user_dashboard' | 'admin_dashboard' | 'settings';

export default function Home() {
  const [authView, setAuthView] = useState<AuthView>('login');
  const [appView, setAppView] = useState<AppView | null>(null);

  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user: firebaseUser, isUserLoading } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !firebaseUser?.uid) return null;
    return doc(firestore, 'users', firebaseUser.uid);
  }, [firestore, firebaseUser?.uid]);

  const { data: currentUser, isLoading: isUserDocLoading } = useDoc<User>(userDocRef);

  const createUserDocument = async (authUser: FirebaseAuthUser) => {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', authUser.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) return;

    try {
      const walletId = Math.floor(1000000 + Math.random() * 9000000).toString();
      const userRole = authUser.email?.toLowerCase() === 'admin@king.store' ? 'admin' : 'user';

      const newUser: Omit<User, 'id'> = {
        walletId,
        username: authUser.email?.split('@')[0] || 'New User',
        email: authUser.email || '',
        balance: 0,
        role: userRole,
      };

      await setDoc(userRef, newUser);
      
      if (userRole === 'admin') {
        const adminRoleDocRef = doc(firestore, "roles_admin", authUser.uid);
        await setDoc(adminRoleDocRef, { email: authUser.email });
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

  useEffect(() => {
    if (!isUserLoading && currentUser) {
      if (appView !== 'settings') {
         setAppView(currentUser.role === 'admin' ? 'admin_dashboard' : 'user_dashboard');
      }
    } else if (!isUserLoading && !firebaseUser) {
        setAppView(null);
    }
  }, [currentUser, isUserLoading, firebaseUser, appView]);


  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    if (!auth) {
        toast({ variant: "destructive", title: "خطأ", description: "خدمات Firebase غير متاحة حاليًا." });
        return false;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "تم تسجيل الدخول بنجاح", description: `أهلاً بك!` });
      return true;
    } catch (error: any) {
       toast({ variant: "destructive", title: "فشل تسجيل الدخول", description: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
      return false;
    }
  };
  
  const handleRegister = async (username: string, email: string, password: string): Promise<boolean> => {
    if (!auth) {
        toast({ variant: "destructive", title: "خطأ", description: "خدمات Firebase غير متاحة حاليًا." });
        return false;
    }
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: 'نجاح', description: 'تم إنشاء حسابك وتسجيل دخولك تلقائيًا!' });
        return true;
    } catch (error: any) {
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
    setAppView(null);
    setAuthView('login');
  };

  const handleGoToSettings = () => {
    setAppView('settings');
  };

  const handleBackToDashboard = () => {
    setAppView(currentUser?.role === 'admin' ? 'admin_dashboard' : 'user_dashboard');
  };
  
  const renderContent = () => {
    if (isUserLoading || (firebaseUser && isUserDocLoading)) {
      return <main className="flex-grow flex items-center justify-center p-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /></main>;
    }
    
    if (appView && currentUser) {
       switch (appView) {
          case 'settings':
            return <main className="flex-grow flex items-center justify-center p-4"><Card className="w-full max-w-lg"><SettingsPage onBack={handleBackToDashboard} onChangePassword={handleChangePassword}/></Card></main>;
          case 'admin_dashboard':
            return <AdminDashboard onLogout={handleLogout} />;
          case 'user_dashboard':
            return <UserDashboard user={currentUser} onLogout={handleLogout} onGoToSettings={handleGoToSettings} />;
          default:
            return null;
       }
    }

    // Auth forms
    return (
       <main className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden min-h-[300px]">
          {authView === 'login' ? (
            <LoginForm onLogin={handleLogin} onSwitchToRegister={() => setAuthView('register')} />
          ) : (
            <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setAuthView('login')} />
          )}
        </Card>
      </main>
    )
  };

  return (
    <>
      <AppHeader />
      {renderContent()}
    </>
  );
}
