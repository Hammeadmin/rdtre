// src/components/Profile/EmployeeReviewSection.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Star, Loader2, Edit, Trash2, Save, X } from 'lucide-react';
import { StarRating } from '../UI/StarRating';

interface Review {
  id: string;
  created_at: string;
  rating: number;
  comment: string;
  employer_id: string;
  employer: {
    pharmacy_name: string;
  };
}

interface EmployeeReviewSectionProps {
  employeeId: string;
}

export const EmployeeReviewSection = ({ employeeId }: EmployeeReviewSectionProps) => {
  const { profile: currentUserProfile, user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for editing a review
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');

  const userReview = reviews.find(review => review.employer_id === user?.id);

  const fetchReviews = useCallback(async () => {
  setLoading(true);
  // The fix is in the .select() statement below, specifying the foreign key.
  const { data, error } = await supabase
    .from('employee_reviews')
    .select(`
      id, 
      created_at, 
      rating, 
      comment, 
      employer_id,
      employer:profiles!employee_reviews_employer_id_fkey ( pharmacy_name )
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching reviews:", error);
    toast.error("Kunde inte hämta omdömen.");
  } else {
    setReviews(data as any);
    if (data && data.length > 0) {
      const total = data.reduce((acc, review) => acc + review.rating, 0);
      setAverageRating(total / data.length);
    } else {
      setAverageRating(0);
    }
  }
  setLoading(false);
}, [employeeId]);

  useEffect(() => {
    if (currentUserProfile?.role === 'employer') fetchReviews();
  }, [fetchReviews, currentUserProfile]);

  const handleAddReview = async () => {
    if (editRating === 0) return toast.error("Vänligen välj ett betyg.");
    if (!user) return;
    setIsSubmitting(true);

    const { error } = await supabase.from('employee_reviews').insert({
      employee_id: employeeId,
      employer_id: user.id,
      rating: editRating,
      comment: editComment,
    });

    if (error) {
      toast.error("Kunde inte spara omdöme.");
    } else {
      toast.success("Omdöme sparat!");
      setEditComment('');
      setEditRating(0);
      fetchReviews();
    }
    setIsSubmitting(false);
  };

  const handleUpdateReview = async () => {
    if (editRating === 0) return toast.error("Betyget kan inte vara noll stjärnor.");
    setIsSubmitting(true);

    const { error } = await supabase
      .from('employee_reviews')
      .update({ rating: editRating, comment: editComment })
      .eq('id', editingReviewId!);

    if (error) {
      toast.error("Kunde inte uppdatera omdöme.");
    } else {
      toast.success("Omdöme uppdaterat!");
      setEditingReviewId(null);
      fetchReviews();
    }
    setIsSubmitting(false);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (window.confirm("Är du säker på att du vill ta bort ditt omdöme?")) {
      const { error } = await supabase.from('employee_reviews').delete().eq('id', reviewId);
      if (error) {
        toast.error("Kunde inte ta bort omdömet.");
      } else {
        toast.success("Omdöme borttaget.");
        fetchReviews();
      }
    }
  };

  // Enters edit mode for a specific review
  const startEditing = (review: Review) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment);
  };

  // Exits edit mode
  const cancelEditing = () => {
    setEditingReviewId(null);
    setEditRating(0);
    setEditComment('');
  };

  if (currentUserProfile?.role !== 'employer') return null;
  if (loading) return <div className="text-center p-4"><Loader2 className="animate-spin inline-block" /></div>;

  return (
    <div className="border-t pt-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Omdömen från Arbetsgivare</h3>

      {reviews.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6 flex flex-wrap items-center justify-center gap-2">
          <StarRating rating={averageRating} size={24} />
          <span className="font-bold text-xl text-gray-700">{averageRating.toFixed(1)}</span>
          <span className="text-gray-500">/ 5 från {reviews.length} omdöme(n)</span>
        </div>
      )}

      {/* ADD/EDIT FORM SECTION */}
      {!userReview && !editingReviewId && (
        <div className="mb-6 p-4 border rounded-lg bg-white">
          <h4 className="font-semibold text-gray-700 mb-2">Lämna ett omdöme</h4>
          <StarRating rating={editRating} setRating={setEditRating} size={28} className="mb-3" />
          <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} placeholder="Skriv en kommentar (valfritt)..." className="form-input w-full min-h-[80px]" />
          <button onClick={handleAddReview} disabled={isSubmitting} className="btn btn-primary mt-3">
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Skicka omdöme'}
          </button>
        </div>
      )}

      {/* REVIEWS LIST */}
      <div className="space-y-4">
        {reviews.length > 0 ? (
          reviews.map(review => (
            <div key={review.id} className="p-4 border rounded-lg bg-white relative">
              {editingReviewId === review.id ? (
                // EDITING VIEW
                <div>
                  <StarRating rating={editRating} setRating={setEditRating} size={24} className="mb-3" />
                  <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} className="form-input w-full min-h-[80px]" />
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleUpdateReview} disabled={isSubmitting} className="btn btn-primary btn-sm">
                      <Save className="h-4 w-4 mr-1.5" /> Spara
                    </button>
                    <button onClick={cancelEditing} className="btn btn-secondary btn-sm">
                      <X className="h-4 w-4 mr-1.5" /> Avbryt
                    </button>
                  </div>
                </div>
              ) : (
                // DISPLAY VIEW
                <>
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
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString('sv-SE')}
                    </p>
                    {review.employer_id === user?.id && (
                      <div className="flex gap-2">
                        <button onClick={() => startEditing(review)} className="btn btn-secondary btn-xs">
                          <Edit className="h-3 w-3 mr-1" /> Ändra
                        </button>
                        <button onClick={() => handleDeleteReview(review.id)} className="btn btn-danger-outline btn-xs">
                          <Trash2 className="h-3 w-3 mr-1" /> Ta bort
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Inga omdömen har lämnats än.</p>
        )}
      </div>
    </div>
  );
};