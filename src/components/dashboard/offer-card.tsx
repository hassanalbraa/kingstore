"use client";

import Image from 'next/image';
import type { Offer } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent } from '@/components/ui/card';

interface OfferCardProps {
  offer: Offer;
}

const OfferCard = ({ offer }: OfferCardProps) => {
  const placeholderImage = PlaceHolderImages.find(p => p.id === offer.imageId);

  return (
    <Card className="bg-secondary border-2 border-secondary hover:border-primary transition-all duration-300 cursor-pointer group overflow-hidden">
      <CardContent className="p-4 flex flex-col items-center text-center">
        {placeholderImage && (
          <div className="w-full h-32 relative mb-4 rounded-md overflow-hidden">
            <Image
              src={placeholderImage.imageUrl}
              alt={offer.name}
              fill
              style={{ objectFit: 'cover' }}
              className="group-hover:scale-105 transition-transform duration-300"
              data-ai-hint={placeholderImage.imageHint}
            />
          </div>
        )}
        <h4 className="text-lg font-semibold text-secondary-foreground">{offer.name}</h4>
        <p className="text-xl font-bold text-primary">${offer.price.toFixed(2)}</p>
      </CardContent>
    </Card>
  );
};

export default OfferCard;
