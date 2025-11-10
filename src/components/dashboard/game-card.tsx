
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
    // Add other custom mappings here, e.g., 'PUBG': 'pubg-logo.png'
  };

  const imageName = customImageMapping[gameName]
    ? customImageMapping[gameName]
    : gameName.toLowerCase()
        .replace(/\s+\/\s+/g, '-') // Replace " / " with "-"
        .replace(/\s+/g, '-')       // Replace spaces with "-"
        .replace(/[^a-z0-9-]/g, '') + '.png'; // Remove special characters and add extension

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
      {/* The overlay div has been removed to hide the shadow */}
      <CardContent className="p-0 flex flex-col items-center justify-center text-center h-full z-10">
        {/* The game name has been removed as requested */}
      </CardContent>
    </Card>
  );
};

export default GameCard;
