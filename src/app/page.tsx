
"use client";

import { useState, useEffect } from 'react';
import { User as FirebaseAuthUser } from 'firebase/auth';
import { doc, setDoc, getDocs, query, where, collection, runTransaction } from 'firebase/firestore';
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

  // Effect to create user document if it doesn't exist after login
  useEffect(() => {
    const createUserDocument = async (authUser: FirebaseAuthUser) => {
      if (!firestore) return;
      const userRef = doc(firestore, 'users', authUser.uid);
      
      // Check if document already exists
      const userDoc = await runTransaction(firestore, async transaction => {
        const docSnapshot = await transaction.get(userRef);
        return docSnapshot;
      });

      if (userDoc.exists()) {
        return; // Document already exists, do nothing.
      }

      // If document doesn't exist, create it.
      try {
        const walletId = Math.floor(1000000 + Math.random() * 9000000).toString();
        const userRole = authUser.email?.toLowerCase() === 'admin@king.store' ? 'admin' : 'user';

        const newUser: Omit<User, 'id'> = {
            walletId,
            // Use email as a fallback for username, or a default value
            username: authUser.displayName || authUser.email?.split('@')[0] || 'New User', 
            email: authUser.email || '',
            balance: 0,
            role: userRole,
        };

        await setDoc(userRef, newUser);
        
        // Handle admin role creation
        if (userRole === 'admin') {
            const adminRoleDocRef = doc(firestore, "roles_admin", authUser.uid);
            await setDoc(adminRoleDocRef, { isAdmin: true });
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

    if (firebaseUser && !isUserDocLoading && !currentUser) {
      createUserDocument(firebaseUser);
    }
  }, [firebaseUser, currentUser, isUserDocLoading, firestore, toast]);


  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: `أهلاً بك!`,
      });
      // View will change automatically via the user state listener
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // The user document will be created by the useEffect hook upon successful authentication.
        toast({ title: 'نجاح', description: 'تم إنشاء حسابك! الرجاء تسجيل الدخول للمتابعة.' });
        setView('login'); // Switch to login view after successful registration
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
    // Rely on the currentUser state to determine the correct dashboard
    if (currentUser?.role === 'admin') {
      setView('admin_dashboard');
    } else {
      setView('user_dashboard');
    }
  };
  
  const renderView = () => {
    // Show loader while checking auth state OR while loading the user document
    if (isUserLoading || (firebaseUser && isUserDocLoading)) {
      return <div className="flex justify-center items-center p-10"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    // Once we have a firebaseUser and we have confirmed the user document is loaded (or not)
    if (firebaseUser && currentUser) {
       if (view === 'settings') {
         return <SettingsPage onBack={handleBackToDashboard} onChangePassword={handleChangePassword}/>;
       }
       if (currentUser.role === 'admin') {
         return <AdminDashboard onLogout={handleLogout} />
       }
       return <UserDashboard user={currentUser} onLogout={handleLogout} onGoToSettings={handleGoToSettings} />;
    }

    // If no user, show login or register. Also handles the case where user doc is still being created.
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
