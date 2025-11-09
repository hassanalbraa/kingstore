import type { User, Offer } from './types';

// This file is now deprecated as we are using Firebase.
// It is kept for reference but will not be used in the application.

export const users: User[] = [
  { id: '1', username: 'أحمد', email: 'ahmad@test.com', balance: 150.75, role: 'user' },
  { id: '2', username: 'فاطمة', email: 'fatima@test.com', balance: 320.50, role: 'user' },
  { id: '3', username: 'أدمن', email: 'admin@test.com', balance: 9999, role: 'admin' },
  { id: '4', username: 'خالد', email: 'khaled@test.com', balance: 50.00, role: 'user' },
];

export const gameOffers: Offer[] = [
  { id: 'offer-1', name: 'Valorant Points', price: 10, imageId: 'game-1' },
  { id: 'offer-2', name: 'Fortnite V-Bucks', price: 15, imageId: 'game-2' },
  { id: 'offer-3', name: 'FIFA Coins', price: 20, imageId: 'game-3' },
  { id: 'offer-4', name: 'GTA Shark Cards', price: 25, imageId: 'game-4' },
];
