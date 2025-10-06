// src/components/Profile/MinimalReviewDisplay.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Star } from 'lucide-react';
import { Tooltip } from '../UI/Tooltip';

interface MinimalReviewDisplayProps {
  employeeId: string;
}

export const MinimalReviewDisplay: React.FC<MinimalReviewDisplayProps> = ({ employeeId }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const fetchRating = async () => {
      const { data, error, count } = await supabase
        .from('employee_reviews')
        .select('rating', { count: 'exact' })
        .eq('employee_id', employeeId);

      if (error) {
        // Fail silently to not clutter the UI
        console.error('Failed to fetch minimal rating:', error);
      } else if (data && data.length > 0) {
        const total = data.reduce((acc, { rating }) => acc + rating, 0);
        setRating(total / data.length);
        setCount(count || 0);
      }
    };

    fetchRating();
  }, [employeeId]);

  // Render nothing if there are no reviews, keeping it minimal
  if (rating === null) {
    return null;
  }

  return (
  <Tooltip content={`Snittbetyg: ${rating.toFixed(1)} baserat på ${count} omdöme(n)`} position="top">
    <div className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full cursor-default">
      <Star className="h-3 w-3 text-amber-500 fill-current" />
      <span>{rating.toFixed(1)}</span>
      <span className="text-gray-400">({count})</span>
    </div>
  </Tooltip>
);
};