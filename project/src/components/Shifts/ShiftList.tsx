// src/components/Shifts/ShiftList.tsx
import React from 'react';
import { ShiftCard } from './ShiftCard';
import type { ShiftNeed, UserRole, UserProfile } from '../../types';

interface ShiftListProps {
  shifts: ReadonlyArray<ShiftNeed>;
  onApply?: (shift: ShiftNeed) => void; // Expects full ShiftNeed object
  onViewDetails: (shift: ShiftNeed) => void;
  appliedShiftIds?: Set<string>;
  currentUserRole?: UserRole | 'anonymous';
  onRefresh?: () => void;
  profile: UserProfile | null | undefined;
  onAdminEdit?: (shiftToEdit: ShiftNeed) => void;
  onAdminDelete?: (shiftId: string) => void;
}

export function ShiftList({
  shifts,
  onApply, // This is the function from ShiftsPage (handleApplyAttemptShift)
  onViewDetails,
  appliedShiftIds,
  currentUserRole,
  onRefresh,
  profile,
  onAdminEdit,
  onAdminDelete
}: ShiftListProps) {

  console.log('[ShiftList] Rendering. Number of shifts:', shifts.length, 'onApply prop type:', typeof onApply);

  return (
    <div className="space-y-6">
      {!shifts || shifts.length === 0 ? (
        <div className="p-4 sm:p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
          {/* ... Empty state SVG and text ... */}
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Shifts Found</h3>
          <p className="mt-1 text-sm text-gray-500 px-2">
            Det finns för närvarande inga tillgängliga pass som matchar dina kriterier.
          </p>
          {onRefresh && (
            <div className="mt-4 sm:mt-6">
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Uppdatera Pass
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {shifts.map((shift) => {
            return (
              <ShiftCard
                key={shift.id}
                shift={shift}
                currentUserRole={currentUserRole}
                onViewDetails={() => onViewDetails(shift)}
                // Pass the onApply prop to ShiftCard, which expects (shift: ShiftNeed) => void
                onApply={onApply ? () => onApply(shift) : undefined}
                hasApplied={appliedShiftIds ? appliedShiftIds.has(shift.id) : false}
                profile={profile}
                onAdminEdit={onAdminEdit ? () => onAdminEdit(shift) : undefined }
                onAdminDelete={onAdminDelete ? () => onAdminDelete(shift.id) : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}