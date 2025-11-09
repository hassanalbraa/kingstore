"use client";

import { useState } from 'react';
import { User as FirebaseAuthUser } from 'firebase/auth';
import { doc, setDoc, getDocs, query, where, collection } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { useAuth, useUser, useFirestore, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';

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

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
  
  const generateUniqueWalletId = async (): Promise<string> => {
    let walletId: string;
    let isUnique = false;
    const usersRef = collection(firestore, 'users');

    while (!isUnique) {
      // Generate a 7-digit number as a string
      walletId = Math.floor(1000000 + Math.random() * 9000000).toString();
      
      const q = query(usersRef, where("walletId", "==", walletId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        isUnique = true;
      }
    }
    return walletId!;
  };


  const handleRegister = async (username: string, email: string, password: string): Promise<boolean> => {
    let authUser: FirebaseAuthUser | null = null;
    try {
      // Step 1: Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      authUser = userCredential.user;

      // Step 2: Generate a unique wallet ID
      const walletId = await generateUniqueWalletId();

      // Step 3: Determine user role
      const userRole = email === 'admin@king.store' ? 'admin' : 'user';

      // Step 4: Create user document in Firestore
      const newUser: User = {
        id: authUser.uid,
        walletId,
        username,
        email,
        balance: 0,
        role: userRole,
      };
      
      const userDoc = doc(firestore, "users", authUser.uid);
      // Use non-blocking write to allow for contextual error handling
      setDocumentNonBlocking(userDoc, newUser, { merge: false });

      if (userRole === 'admin') {
        const adminRoleDoc = doc(firestore, "roles_admin", authUser.uid);
        // Use non-blocking write
        setDocumentNonBlocking(adminRoleDoc, { isAdmin: true }, { merge: false });
      }
      
      toast({ title: 'نجاح', description: 'تم إنشاء حسابك بنجاح! يمكنك الآن تسجيل الدخول.' });
      setView('login');
      return true;
    } catch (error: any) {
      console.error("Registration Error:", error);
      
      // This catch block will now primarily handle Auth errors (e.g., email-already-in-use)
      // Firestore permission errors will be handled by the global error listener.
      let description = "حدث خطأ أثناء إنشاء الحساب.";
      if (error.code === 'auth/email-already-in-use') {
        description = "هذا البريد الإلكتروني مستخدم بالفعل.";
      }
      
      toast({ variant: "destructive", title: "خطأ في إنشاء الحساب", description });

      // Rollback Auth user if it was created
      if (authUser) {
        try {
          await authUser.delete();
          console.log("Rolled back Auth user creation.");
        } catch (deleteError) {
          console.error("Failed to rollback Auth user creation:", deleteError);
          toast({ variant: "destructive", title: "خطأ فادح", description: "فشل إنشاء الحساب. الرجاء التواصل مع الدعم الفني." });
        }
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
       // Since the logic for determining the user from walletId for the admin is complex,
       // we pass the user's UID to fund the wallet, which is the document ID in the 'users' collection.
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
