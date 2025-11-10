"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Gamepad2, Swords, Flame, Ticket, DollarSign } from 'lucide-react';
import React from 'react';

interface GameCardProps {
  gameName: string;
  onClick: () => void;
}

const GameCard = ({ gameName, onClick }: GameCardProps) => {

  const getIcon = () => {
    let IconComponent;
    switch (gameName) {
      case 'PUBG':
        IconComponent = Swords;
        break;
      case 'Free Fire':
        IconComponent = Flame;
        break;
      case 'عروض التيك توك':
        IconComponent = Ticket;
        break;
      case 'عروض التجار / اكواد جارينا':
        IconComponent = DollarSign;
        break;
      default:
        IconComponent = Gamepad2;
    }
    return <IconComponent className="h-12 w-12 text-primary mb-4 transition-transform group-hover:scale-110" />;
  };


  return (
    <Card 
      onClick={onClick}
      className="bg-secondary border-2 border-transparent hover:border-primary transition-all duration-300 cursor-pointer group overflow-hidden"
    >
      <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
        {getIcon()}
        <h3 className="text-lg font-bold text-secondary-foreground">{gameName}</h3>
      </CardContent>
    </Card>
  );
};

export default GameCard;
