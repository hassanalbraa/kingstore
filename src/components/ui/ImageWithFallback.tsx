"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ImageWithFallbackProps {
  src: string;
  fallbackSrc?: string;
  alt: string;
  [key: string]: any;
}

const ImageWithFallback = ({ src, fallbackSrc, alt, ...props }: ImageWithFallbackProps) => {
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
    setError(false); 
  }, [src]);
  
  const handleImageError = () => {
    if (!error) { // Prevent infinite loops
      setError(true);
      if (fallbackSrc) {
        setCurrentSrc(fallbackSrc);
      }
    }
  };
  
  // If the primary and fallback have both failed, render a placeholder div
  if (error && currentSrc === fallbackSrc) {
     return (
        <div 
            className="flex items-center justify-center bg-muted text-muted-foreground w-full h-full"
        >
            <span className="font-bold text-lg">KS</span>
        </div>
     )
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      onError={handleImageError}
      {...props}
    />
  );
};

export default ImageWithFallback;
