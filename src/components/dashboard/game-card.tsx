
"use client";

import { Card, CardContent } from '@/components/ui/card';
import React from 'react';
import ImageWithFallback from '../ui/ImageWithFallback';

interface GameCardProps {
  gameName: string;
  onClick: () => void;
}

const GameCard = ({ gameName, onClick }: GameCardProps) => {

  const customImageMapping: { [key: string]: string } = {
    'Free Fire': 'free fire.png',
    'تصاريح فري فاير': 'تصاريح-فري-فاير.png',
    'عروض التيك توك': 'tiktok.png',
    'عروض التجار / اكواد جارينا': 'garena.png',
  };

  const imageName = customImageMapping[gameName]
    ? customImageMapping[gameName]
    : gameName.toLowerCase().replace(/[\s\/]+/g, '-') + '.png';

  const imageSrc = `/${imageName}`;

  return (
    <Card 
      onClick={onClick}
      className="relative border-2 border-transparent hover:border-primary transition-all duration-300 cursor-pointer group overflow-hidden aspect-square flex items-center justify-center"
    >
      <ImageWithFallback
          src={imageSrc}
          alt={`${gameName} background`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          fallbackSrc="/gamepad2.png" 
      />
      <CardContent className="p-0 flex flex-col items-center justify-center text-center h-full z-10" />
    </Card>
  );
};

export default GameCard;
