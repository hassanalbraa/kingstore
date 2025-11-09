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
  name: string;
  price: number;
  imageId: string;
}
