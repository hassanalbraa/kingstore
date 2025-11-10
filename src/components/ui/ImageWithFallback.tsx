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
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
    setError(false); 
  }, [src]);
  
  const handleImageError = () => {
    if (!error) {
      if (fallbackSrc) {
        setImgSrc(fallbackSrc);
      }
      setError(true);
    }
  };
  
  if (error && !fallbackSrc) {
     return (
        <div 
            className="rounded-full bg-background/20 flex items-center justify-center text-white font-bold"
            style={{ width: props.width, height: props.height }}
        >
            KS
        </div>
     )
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      onError={handleImageError}
      {...props}
    />
  );
};

export default ImageWithFallback;
