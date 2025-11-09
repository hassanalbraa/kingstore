"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Gamepad2 } from 'lucide-react';

interface GameCardProps {
  gameName: string;
  onClick: () => void;
}

const GameCard = ({ gameName, onClick }: GameCardProps) => {
  return (
    <Card 
      onClick={onClick}
      className="bg-secondary border-2 border-transparent hover:border-primary transition-all duration-300 cursor-pointer group overflow-hidden"
    >
      <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
        <Gamepad2 className="h-12 w-12 text-primary mb-4 transition-transform group-hover:scale-110" />
        <h3 className="text-lg font-bold text-secondary-foreground">{gameName}</h3>
      </CardContent>
    </Card>
  );
};

export default GameCard;
