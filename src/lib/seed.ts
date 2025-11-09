"use client";

import { collection, writeBatch, getDocs, Firestore, doc } from 'firebase/firestore';

export const initialOffers = [
  { gameName: 'PUBG', offerName: '60 شدة', price: 3500, unit: 'شدة' },
  { gameName: 'PUBG', offerName: '120 شدة', price: 7000, unit: 'شدة' },
  { gameName: 'PUBG', offerName: '240 شدة', price: 14000, unit: 'شدة' },
  { gameName: 'Free Fire', offerName: '100 💎', price: 3400, unit: '💎' },
  { gameName: 'Free Fire', offerName: '210 💎', price: 6800, unit: '💎' },
  { gameName: 'Free Fire', offerName: '530 💎', price: 17000, unit: '💎' },
  { gameName: 'Free Fire', offerName: '1080 💎', price: 34000, unit: '💎' },
  { gameName: 'Free Fire', offerName: '2200 💎', price: 70000, unit: '💎' },
  { gameName: 'Free Fire', offerName: 'عضوية أسبوعية', price: 8000, unit: '💎' },
  { gameName: 'Free Fire', offerName: 'عضوية شهرية', price: 38500, unit: '💎' },
  { gameName: 'Free Fire', offerName: 'باقة تصريح مستوى 6 (120💎)', price: 2000, unit: '' },
  { gameName: 'Free Fire', offerName: 'باقة تصريح مستوى 10 (200💎)', price: 3200, unit: '' },
  { gameName: 'Free Fire', offerName: 'باقة تصريح مستوى 15 (200💎)', price: 3200, unit: '' },
  { gameName: 'Free Fire', offerName: 'باقة تصريح مستوى 20 (200💎)', price: 3200, unit: '' },
  { gameName: 'Free Fire', offerName: 'باقة تصريح مستوى 25 (200💎)', price: 3200, unit: '' },
  { gameName: 'Free Fire', offerName: 'باقة تصريح مستوى 30 (200💎)', price: 3200, unit: '' },
  { gameName: 'Free Fire', offerName: 'باقة تصريح مستوى 35 (350💎)', price: 4500, unit: '' },
  { gameName: 'عروض التجار / اكواد جارينا', offerName: '10$ جارينا', price: 33700, unit: '' },
  { gameName: 'عروض التجار / اكواد جارينا', offerName: '20$ جارينا', price: 33600, unit: '' },
  { gameName: 'عروض التجار / اكواد جارينا', offerName: '50$ جارينا', price: 33300, unit: '' },
  { gameName: 'عروض التيك توك', offerName: '70 🪙', price: 3500, unit: '🪙' },
  { gameName: 'عروض التيك توك', offerName: '100 🪙', price: 5250, unit: '🪙' },
  { gameName: 'عروض التيك توك', offerName: '140 🪙', price: 7000, unit: '🪙' },
  { gameName: 'عروض التيك توك', offerName: '200 🪙', price: 10500, unit: '🪙' },
  { gameName: 'عروض التيك توك', offerName: '500 🪙', price: 26000, unit: '🪙' },
  { gameName: 'عروض التيك توك', offerName: '700 🪙', price: 36000, unit: '🪙' },
];

export async function seedGameOffers(db: Firestore) {
  const offersCollection = collection(db, 'gameOffers');
  
  // Check if the collection is already populated to prevent re-seeding
  const snapshot = await getDocs(offersCollection);
  if (!snapshot.empty) {
    console.log("Game offers collection already contains documents. Seeding skipped.");
    return { success: false, message: "العروض موجودة بالفعل. لم يتم إضافة أي شيء." };
  }

  const batch = writeBatch(db);
  const offersCollectionRef = collection(db, 'gameOffers');

  initialOffers.forEach((offer) => {
    const docRef = doc(offersCollectionRef); // Correct way to create a doc with an auto-generated ID
    batch.set(docRef, offer);
  });

  try {
    await batch.commit();
    console.log("Successfully seeded game offers.");
    return { success: true, message: "تمت إضافة جميع العروض بنجاح!" };
  } catch (error) {
    console.error("Error seeding game offers: ", error);
    return { success: false, message: `فشل إضافة العروض: ${error}` };
  }
}
