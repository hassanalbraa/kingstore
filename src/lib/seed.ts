
"use client";

import { collection, writeBatch, getDocs, Firestore, query, where, doc } from 'firebase/firestore';

export const initialOffers = [
  // The order here will be the initial order in the app
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
  const offersCollectionRef = collection(db, 'gameOffers');
  const batch = writeBatch(db);
  let offersAdded = 0;
  let offersUpdated = 0;

  try {
    // Get all existing offers to check which ones need updating vs. adding
    const existingOffersSnapshot = await getDocs(offersCollectionRef);
    const existingOffersMap = new Map(existingOffersSnapshot.docs.map(doc => [doc.data().offerName, doc]));
    const existingOfferNames = new Set(initialOffers.map(o => o.offerName));

    // Loop through the initial offers array to assign order
    for (let i = 0; i < initialOffers.length; i++) {
        const offerData = initialOffers[i];
        const existingDoc = existingOffersMap.get(offerData.offerName);
        
        const dataWithOrder = {
            ...offerData,
            order: i + 1 // Add the order field based on array index
        };

        if (existingDoc) {
            // If offer exists, update it with the order. This is safe and idempotent.
            batch.update(existingDoc.ref, dataWithOrder);
            offersUpdated++;
        } else {
            // If offer doesn't exist, create it with the order field.
            // Use offerName as document ID to prevent duplicates
            const newDocRef = doc(offersCollectionRef, offerData.offerName.replace(/\//g, '-'));
            batch.set(newDocRef, dataWithOrder);
            offersAdded++;
        }
    }
    
    // Check for offers in the database that are NOT in the initialOffers list
    // and assign them a high order number so they appear at the end.
    let maxOrder = initialOffers.length;
    for (const [offerName, docSnap] of existingOffersMap.entries()) {
        if (!existingOfferNames.has(offerName)) {
            if (docSnap.data().order === undefined) {
                 batch.update(docSnap.ref, { order: ++maxOrder });
                 offersUpdated++;
            }
        }
    }


    if (offersAdded === 0 && offersUpdated === 0) {
        return { success: true, message: "جميع العروض موجودة ومحدثة بالفعل. لا يوجد شيء لفعله." };
    }

    await batch.commit();

    let message = '';
    if (offersAdded > 0) message += `تمت إضافة ${offersAdded} عروض جديدة. `;
    if (offersUpdated > 0) message += `تم تحديث ${offersUpdated} عروض لضمان الترتيب الصحيح.`;
    
    return { success: true, message: message.trim() };

  } catch (error) {
    console.error("Error seeding game offers: ", error);
    return { success: false, message: `فشل إضافة/تحديث العروض: ${error}` };
  }
}
