

export type WithId<T> = T & { id: string };

export interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  role: 'user' | 'admin';
  walletId: string;
}

export interface Offer {
  id:string;
  gameName: string;
  offerName: string;
  price: number;
  unit: string;
  imageId?: string;
}

export interface UserGameOffer {
  id: string;
  userId: string;
  username: string;
  walletId: string;
  gameOfferId: string; // Will be 'my-kashi-topup' or 'credit-transfer'
  gameName: string; // e.g., 'تغذية ماي كاشي' or 'تحويل رصيد'
  offerName: string; // e.g., 'طلب تحويل 500 ج.س' or 'تحويل زين 1000 ج.س'
  price: number; // For game offers, this is the fixed price. For others, it's the user-defined amount.
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date | { seconds: number; nanoseconds: number; };
  gameId?: string; // For game-specific user ID OR My Kashi account number OR phone number for credit transfer
  gameUsername?: string; // For game-specific username OR My Kashi account name
  amount?: number; // Specifically for My Kashi/credit top-ups
}


export interface Transaction {
  id: string;
  userId: string;
  type: 'purchase' | 'top-up';
  amount: number;
  description: string;
  createdAt: Date | { seconds: number; nanoseconds: number; };
}
