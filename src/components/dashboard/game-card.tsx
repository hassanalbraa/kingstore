
"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Gamepad2 } from 'lucide-react';
import React from 'react';
import ImageWithFallback from '../ui/ImageWithFallback';

interface GameCardProps {
  gameName: string;
  onClick: () => void;
}

const GameCard = ({ gameName, onClick }: GameCardProps) => {

  const customImageMapping: { [key: string]: string } = {
    'Free Fire': 'fire.png',
    // Add other custom mappings here, e.g., 'PUBG': 'pubg-logo.png'
  };

  const imageName = customImageMapping[gameName]
    ? customImageMapping[gameName]
    : gameName.toLowerCase()
        .replace(/\s+\/\s+/g, '-') // Replace " / " with "-"
        .replace(/\s+/g, '-')       // Replace spaces with "-"
        .replace(/[^a-z0-9-]/g, '') + '.png'; // Remove special characters and add extension

  const imageSrc = `/${imageName}`;

  const fallback = <Gamepad2 className="h-12 w-12 text-primary mb-4 transition-transform group-hover:scale-110" />;

  return (
    <Card 
      onClick={onClick}
      className="bg-secondary border-2 border-transparent hover:border-primary transition-all duration-300 cursor-pointer group overflow-hidden"
    >
      <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
        <ImageWithFallback
            src={imageSrc}
            alt={`${gameName} icon`}
            width={60}
            height={60}
            className="mb-4 transition-transform group-hover:scale-110 object-contain"
            fallbackSrc="/gamepad2.png" // A default image icon in public folder
        />
        <h3 className="text-lg font-bold text-secondary-foreground">{gameName}</h3>
      </CardContent>
    </Card>
  );
};

export default GameCard;
