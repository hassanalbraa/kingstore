

"use client";

import type { Offer } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

interface OfferCardProps {
  offer: Offer;
  onClick: () => void;
}

const OfferCard = ({ offer, onClick }: OfferCardProps) => {
  return (
    <Card 
      onClick={onClick}
      className="bg-secondary border-2 border-transparent hover:border-primary transition-all duration-300 cursor-pointer group overflow-hidden flex flex-col justify-between"
    >
      <CardContent className="p-4 flex flex-col items-center text-center">
        <h4 className="text-md font-semibold text-secondary-foreground mb-2 flex-grow">{offer.offerName} {offer.unit}</h4>
        <p className="text-xl font-bold text-primary">{Math.round(offer.price)} ج.س</p>
      </CardContent>
    </Card>
  );
};

export default OfferCard;

    