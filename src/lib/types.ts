

export interface User {
  id: string;
  username: string;
  email?: string;
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
  gameOfferId: string;
  gameName: string;
  offerName: string;
  price: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

    