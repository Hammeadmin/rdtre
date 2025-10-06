// src/components/Shifts/PostedShifts.tsx
import React from 'react';
import { Calendar, Clock, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { updateShiftStatus } from '../../lib/shifts';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react'; // Or your preferred loading icon

// Define the expected shape of a shift object passed via props
// Consider replacing this with the more specific ShiftNeed from types.ts if it matches better
interface ShiftData {
  id: string;
  title: string;
  status: 'open' | 'filled' | 'cancelled' | 'completed' | string; // Keep string for flexibility if other statuses exist
  date: string; // Expecting YYYY-MM-DD string
  start_time: string | null;
  end_time: string | null;
  location: string;
  lunch: string;
  required_role?: string[]; // Changed to array to match database structure
  required_experience?: string[]; // Added this field
  applications_count?: number;
  [key: string]: any; // Allow other potential properties
}

interface PostedShiftsProps {
  shifts: ShiftData[];
  onManage: (shift: ShiftData) => void;
  onViewDetails: (shift: ShiftData) => void;
  onRefreshData: () => void; // <-- Added prop for refreshing data after completion
}

// --- Mark Complete Button Component (Internal Helper) ---
interface MarkCompleteButtonProps {
    shiftId: string;
    shiftTitle: string;
    onShiftCompleted: () => void; // Function to refresh the list/view
}

const handleMarkComplete = async () => {
    if (!window.confirm(`Är du säker på att du vill markera passet "${shiftTitle}" som slutfört?`)) {
        return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Märker pass som slutfört...');

    try {
        // Use our new, simple helper function
        const result = await updateShiftStatus(shiftId, 'completed');

        if (result.error) {
            throw new Error(result.error);
        }

        toast.success('Passet har markerats som slutfört!', { id: toastId });
        if (onShiftCompleted) {
            onShiftCompleted(); // Refresh the dashboard data
        }
    } catch (error: any) {
        toast.error(`Misslyckades: ${error.message}`, { id: toastId });
    } finally {
        setIsProcessing(false);
    }
};

    return (
        <button
            onClick={handleMarkComplete}
            disabled={isProcessing}
            // Using btn-success for styling consistency with previous examples
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
            {isProcessing ? (
                <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" /> Processing...
                </>
            ) : (
                'Mark Completed' // Simplified button text
            )}
        </button>
    );
}
// --- End Mark Complete Button Component ---


export function PostedShifts({ shifts, onManage, onViewDetails, onRefreshData }: PostedShiftsProps) {
  // Helper for status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'filled': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-purple-100 text-purple-800'; // Added completed status color
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper to safely format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00'); // Assume local timezone if none specified
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return format(date, 'd MMMM yyyy', { locale: sv });
    } catch (error) {
      console.error("Date formatting error:", error);
      return 'Invalid Date';
    }
  };

  // Handle empty list passed via props
  if (!shifts || shifts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center mt-4">
        <p className="text-gray-500">Inga pass matchar nuvarande filter.</p>
      </div>
    );
  }

  // Render the list based on the 'shifts' prop received
  return (
    <div className="space-y-4">
      {shifts.map((shift) => {
        // Determine if the shift can be marked complete
        const shiftDate = new Date(shift.date + 'T00:00:00'); // Assume local timezone
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set time to beginning of day for comparison
        const canMarkComplete = shift.status === 'filled' && shiftDate <= today;

        return (
          <div key={shift.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
            <div className="flex flex-wrap justify-between items-start gap-4">
              {/* Shift Info */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-medium text-lg text-gray-800 truncate mr-2">{shift.title}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(shift.status)} flex-shrink-0`}>
                    {shift.status.charAt(0).toUpperCase() + shift.status.slice(1)} {/* Capitalize status */}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0 text-gray-400" />
                    {formatDate(shift.date)}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 flex-shrink-0 text-gray-400" />
                    {shift.start_time?.slice(0, 5) || 'N/A'} - {shift.end_time?.slice(0, 5) || 'N/A'}
                  </div>
                  {/* Optionally display Required Role here if needed in the list view */}
                   {shift.required_role && Array.isArray(shift.required_role) && shift.required_role.length > 0 && (
  <div className="flex items-center text-xs pt-1">
    <Briefcase className="font-medium text-gray-500 mr-1"/>
    {shift.required_role.join(', ')}
  </div>
)}
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 pt-2 sm:pt-0 items-start sm:items-center">
                {/* View Details Button */}
                <button
                  onClick={(e) => {
                    console.log('View Details clicked for shift:', shift.id);
                    e.preventDefault();
                    e.stopPropagation();
                    onViewDetails(shift);
                  }}
                  className="px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm w-full sm:w-auto"
                >
                  View Details
                </button>
                {/* Manage Applications Button */}
                {(shift.status === 'open' || shift.status === 'filled') && (
                  <button
                    onClick={(e) => {
                      console.log('Manage Applications clicked for shift:', shift.id);
                      e.preventDefault();
                      e.stopPropagation();
                      onManage(shift);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm w-full sm:w-auto"
                  >
                    Hantera sökande
                  </button>
                )}
                {/* --- Mark Completed Button (Conditionally Rendered) --- */}
                {canMarkComplete && (
                    <MarkCompleteButton
                        shiftId={shift.id}
                        shiftTitle={shift.title}
                        onShiftCompleted={onRefreshData} // Pass the refresh handler
                    />
                )}
                 {/* Display if already completed (instead of button) */}
                 {shift.status === 'completed' && (
                    <span className="text-xs text-purple-700 italic px-3 py-1">Avslutade</span>
                 )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}