export interface User {
  id: string;
  username: string;
  password?: string;
  balance: number;
  role: 'user' | 'admin';
}

export interface Offer {
  id: string;
  name: string;
  price: number;
  imageId: string;
}
