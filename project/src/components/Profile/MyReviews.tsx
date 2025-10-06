// src/components/Profile/MyReviews.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Star, Award, Loader2 } from 'lucide-react';
import { StarRating } from '../UI/StarRating';

interface Review {
  id: string;
  created_at: string;
  rating: number;
  comment: string;
  employer: {
    pharmacy_name: string;
  };
}

export const MyReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchMyReviews = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('employee_reviews')
      .select(`
        id, created_at, rating, comment,
        employer:profiles!employee_reviews_employer_id_fkey(pharmacy_name)
      `)
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Kunde inte hämta dina omdömen.");
    } else {
      setReviews(data as any);
      if (data && data.length > 0) {
        const total = data.reduce((acc, review) => acc + review.rating, 0);
        setAverageRating(total / data.length);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMyReviews();
  }, [fetchMyReviews]);

  if (loading) {
    return <div className="text-center p-4"><Loader2 className="animate-spin inline-block text-gray-400" /></div>;
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
        <Award className="w-5 h-5 mr-2 text-gray-500" />
        Mina Omdömen
      </h3>

      {reviews.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Du har inte fått några omdömen än.</p>
      ) : (
        <>
          <div className="bg-white p-4 rounded-lg mb-6 flex flex-wrap items-center justify-center gap-2 border">
            <StarRating rating={averageRating} size={24} />
            <span className="font-bold text-xl text-gray-700">{averageRating.toFixed(1)}</span>
            <span className="text-gray-500">/ 5 i snittbetyg</span>
          </div>
          <div className="space-y-4">
            {reviews.map(review => (
              <div key={review.id} className="p-4 border rounded-lg bg-white">
               <div className="flex justify-between items-start gap-4">
                {/* The pharmacy name can now grow but will also wrap its text if needed */}
                <p className="flex-grow min-w-0 font-semibold text-primary-700 break-words">
                  {review.employer.pharmacy_name}
                </p>
                {/* The stars are now prevented from shrinking */}
                <div className="flex-shrink-0">
                  <StarRating rating={review.rating} size={16} />
                </div>
              </div>
                <p className="text-gray-600 mt-2 text-sm break-words">{review.comment || <span className="italic text-gray-400">Ingen kommentar lämnad.</span>}</p>
                <p className="text-xs text-gray-400 mt-3 text-right">
                  {new Date(review.created_at).toLocaleDateString('sv-SE')}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};