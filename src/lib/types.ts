

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
  id: string;
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
  gameOfferId: string; // Will be 'my-kashi-topup' for this type of offer
  gameName: string;
  offerName: string;
  price: number; // For game offers, this is the fixed price. For My Kashi, it's the user-defined amount.
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date | { seconds: number; nanoseconds: number; };
  gameId?: string; // For game-specific user ID OR My Kashi account number
  gameUsername?: string; // For game-specific username OR My Kashi account name
  amount?: number; // Specifically for My Kashi top-ups
}


export interface Transaction {
  id: string;
  userId: string;
  type: 'purchase' | 'top-up';
  amount: number;
  description: string;
  createdAt: Date | { seconds: number; nanoseconds: number; };
}
