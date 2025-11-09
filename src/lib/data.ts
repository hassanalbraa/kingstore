import type { User, Offer } from './types';

export const users: User[] = [
  { id: '1', username: 'أحمد', password: '123', balance: 150.75, role: 'user' },
  { id: '2', username: 'فاطمة', password: '123', balance: 320.50, role: 'user' },
  { id: '3', username: 'أدمن', password: 'admin', balance: 9999, role: 'admin' },
  { id: '4', username: 'خالد', password: '123', balance: 50.00, role: 'user' },
];

export const gameOffers: Offer[] = [
  { id: 'offer-1', name: 'Valorant Points', price: 10, imageId: 'game-1' },
  { id: 'offer-2', name: 'Fortnite V-Bucks', price: 15, imageId: 'game-2' },
  { id: 'offer-3', name: 'FIFA Coins', price: 20, imageId: 'game-3' },
  { id: 'offer-4', name: 'GTA Shark Cards', price: 25, imageId: 'game-4' },
];
