// src/components/UI/StarRating.tsx
import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  setRating?: (rating: number) => void;
  size?: number;
  className?: string;
}

export const StarRating = ({ rating, setRating, size = 5, className = '' }: StarRatingProps) => {
  const isInteractive = !!setRating;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {[...Array(5)].map((_, index) => {
        const starValue = index + 1;
        return (
          <Star
            key={starValue}
            size={size}
            className={`transition-colors ${
              starValue <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            } ${isInteractive ? 'cursor-pointer hover:text-yellow-300' : ''}`}
            onClick={() => isInteractive && setRating(starValue)}
          />
        );
      })}
    </div>
  );
};