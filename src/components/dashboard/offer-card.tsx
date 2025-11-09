"use client";

import Image from 'next/image';
import type { Offer } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

interface OfferCardProps {
  offer: Offer;
}

const OfferCard = ({ offer }: OfferCardProps) => {
  // In a real app, you would fetch the placeholder image data, but for now we just use the imageUrl from the offer
  // We will assume the imageId is the last part of the URL.
  const placeholderImageUrl = `https://picsum.photos/seed/${offer.id}/600/400`;
  const imageHint = offer.name.split(' ').slice(0, 2).join(' ');


  return (
    <Card className="bg-secondary border-2 border-secondary hover:border-primary transition-all duration-300 cursor-pointer group overflow-hidden">
      <CardContent className="p-4 flex flex-col items-center text-center">
        <div className="w-full h-32 relative mb-4 rounded-md overflow-hidden">
            <Image
              src={placeholderImageUrl}
              alt={offer.name}
              fill
              style={{ objectFit: 'cover' }}
              className="group-hover:scale-105 transition-transform duration-300"
              data-ai-hint={imageHint}
            />
          </div>
        <h4 className="text-lg font-semibold text-secondary-foreground">{offer.name}</h4>
        <p className="text-xl font-bold text-primary">{offer.price.toFixed(2)} ج.س</p>
      </CardContent>
    </Card>
  );
};

export default OfferCard;
