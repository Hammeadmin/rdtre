// In hammeadmin/fffffff/fffffff-main/project/src/components/Shifts/CompletedShiftsList.tsx

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { sv } from 'date-fns/locale';
import { DollarSign, Eye, Check, Loader2, ListChecks, Filter, Users, Calendar, FileOutput, CheckSquare, Square } from 'lucide-react';

import type { ShiftNeed } from '../../types';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

// This interface is now simpler
interface ExtendedShiftNeed extends ShiftNeed {
    applicant_name?: string | null;
}

// Props are simplified: NO more exportedShiftIds
interface CompletedShiftsListProps {
    shifts: ExtendedShiftNeed[];
    onRefreshData?: () => void;
    onViewShiftDetails: (shift: ExtendedShiftNeed) => void;
}

export function CompletedShiftsList({ shifts, onViewShiftDetails, onRefreshData }: CompletedShiftsListProps) {
    const [monthFilter, setMonthFilter] = useState<string>('');
    const [payrollFilter, setPayrollFilter] = useState<string>('all'); // Values: 'all', 'processed', 'not_processed'
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState<Set<string>>(new Set());

  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);


    // The filtering logic is now based on the shift's status
    const filteredShifts = useMemo(() => {
        return shifts.filter(shift => {
            // **FIX**: Check the shift.status directly
            const isExported = shift.status === 'processed';

            if (payrollFilter === 'processed' && !isExported) return false;
            // A shift that is not exported has the status 'completed'
            if (payrollFilter === 'not_processed' && shift.status !== 'completed') return false;
            
            if (monthFilter) {
                if (!shift.date || !isValid(parseISO(shift.date)) || !format(parseISO(shift.date), 'yyyy-MM').startsWith(monthFilter)) {
                    return false;
                }
            }
            if (searchTerm) {
                const lowercasedSearch = searchTerm.toLowerCase();
                return (shift.title?.toLowerCase().includes(lowercasedSearch)) ||
                       (shift.applicant_name?.toLowerCase().includes(lowercasedSearch)) ||
                       (shift.location?.toLowerCase().includes(lowercasedSearch));
            }
            return true;
        });
    }, [shifts, monthFilter, payrollFilter, searchTerm]);

  useEffect(() => {
        const visibleIds = new Set(filteredShifts.map(s => s.id));
        setSelectedShiftIds(prevSelected => {
            const newSelected = new Set<string>();
            prevSelected.forEach(id => {
                if (visibleIds.has(id)) {
                    newSelected.add(id);
                }
            });
            return newSelected;
        });
    }, [filteredShifts]);

    // --- LOGIC FOR INDETERMINATE "SELECT ALL" CHECKBOX ---
    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const numSelected = selectedShiftIds.size;
            const numVisible = filteredShifts.filter(s => s.status === 'completed').length;
            if (numSelected > 0 && numSelected < numVisible) {
                selectAllCheckboxRef.current.indeterminate = true;
            } else {
                selectAllCheckboxRef.current.indeterminate = false;
            }
        }
    }, [selectedShiftIds, filteredShifts]);

    const handleToggleSelect = (shiftId: string) => {
        setSelectedShiftIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(shiftId)) {
                newSet.delete(shiftId);
            } else {
                newSet.add(shiftId);
            }
            return newSet;
        });
    };
    
    const handleToggleSelectAll = () => {
        const allVisibleExportableIds = filteredShifts
            .filter(s => s.status === 'completed')
            .map(s => s.id);
            
        if (selectedShiftIds.size === allVisibleExportableIds.length) {
            setSelectedShiftIds(new Set());
        } else {
            setSelectedShiftIds(new Set(allVisibleExportableIds));
        }
    };
    
    // --- NEW BULK EXPORT FUNCTION ---
    const handleBulkSendToPayroll = async () => {
        const shiftsToExport = Array.from(selectedShiftIds);
        if (shiftsToExport.length === 0) {
            toast.error("Inga pass är valda för export.");
            return;
        }

        if (!window.confirm(`Är du säker på att du vill exportera ${shiftsToExport.length} valda pass till lönelistan?`)) {
            return;
        }

        const toastId = toast.loading(`Exporterar ${shiftsToExport.length} pass...`);
        setIsProcessing(new Set(shiftsToExport));

        // Use Promise.allSettled to handle all exports and updates
        const results = await Promise.allSettled(shiftsToExport.map(async (shiftId) => {
            const { error: rpcError } = await supabase.rpc('export_shift_to_payroll', { p_shift_id: shiftId });
            if (rpcError) throw new Error(`Databasfel för pass ${shiftId}: ${rpcError.message}`);

            const { error: updateError } = await supabase.from('shift_needs').update({ status: 'processed' }).eq('id', shiftId);
            if (updateError) throw new Error(`Statusuppdatering misslyckades för pass ${shiftId}: ${updateError.message}`);
        }));
        
        const successfulExports = results.filter(r => r.status === 'fulfilled').length;
        const failedExports = results.length - successfulExports;

        toast.dismiss(toastId);
        if (successfulExports > 0) {
            toast.success(`${successfulExports} pass har exporterats!`);
        }
        if (failedExports > 0) {
            toast.error(`${failedExports} pass kunde inte exporteras. Kontrollera att de inte redan är exporterade.`);
            console.error("Failed exports details:", results.filter(r => r.status === 'rejected'));
        }

        setSelectedShiftIds(new Set()); // Clear selection
        setIsProcessing(new Set());
        if (onRefreshData) {
            onRefreshData(); // Refresh all data
        }
    };
    
    // This handler can export a SINGLE shift and then trigger a full refresh
    const handleSendToPayroll = async (shiftId: string, shiftTitle: string) => {
        if (!window.confirm(`Skicka passet "${shiftTitle}" till lönelistan? Detta kommer att låsa passet.`)) {
            return;
        }
        
        const toastId = toast.loading('Exporterar till lön...');
        setIsProcessing(prev => new Set(prev).add(shiftId));

        try {
            // **FIX**: Call the new, correct RPC function
            const { error } = await supabase.rpc('export_shift_to_payroll', {
                p_shift_id: shiftId,
            });

            if (error) throw error;

            // **Step 2: Update the original shift's status to 'processed'.**
            // This tells the UI that the shift has been sent and should be filtered as "Exporterad".
            const { error: updateError } = await supabase
                .from('shift_needs')
                .update({ status: 'processed' }) // This is the key change for the UI
                .eq('id', shiftId);

            if (updateError) {
                // This is a failsafe. If the update fails, we notify the user.
                // The payroll record was still created, but the UI might be out of sync.
                throw new Error(`Kunde inte uppdatera passets status: ${updateError.message}`);
            }

            toast.success('Passet har exporterats och flyttats till "Exporterad"!', { id: toastId });
            
            // Step 3: Refresh all data to show the change immediately.
            if (onRefreshData) {
                onRefreshData();
            }

        } catch (error: any) {
            console.error('Error during payroll export process:', error);
            toast.error(error.message || 'Ett oväntat fel uppstod.', { id: toastId });
        } finally {
            setIsProcessing(prev => {
                const next = new Set(prev);
                next.delete(shiftId);
                return next;
            });
        }
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return 'N/A';
        try {
            const dateObj = parseISO(dateString);
            return isValid(dateObj) ? format(dateObj, 'PP', { locale: sv }) : 'Ogiltigt datum';
        } catch { return 'Ogiltigt datum'; }
    };
const exportableShiftsCount = filteredShifts.filter(s => s.status === 'completed').length;

   return (
    <div className="bg-white rounded-lg shadow mt-6">
        <div className="p-4 border-b border-gray-200">
            {/* The redundant filter UI has been removed from here. */}
            <div className="flex justify-between items-center flex-wrap gap-2">
                <h2 className="text-lg font-medium text-gray-900">Historik: Slutförda Pass</h2>
            </div>
        </div>

        {/* Bulk action controls are now at the top */}
        <div className="px-4 py-3 bg-gray-50/75 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="select-all-shifts"
                        className="h-5 w-5 rounded border-gray-400 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        ref={selectAllCheckboxRef}
                        checked={exportableShiftsCount > 0 && selectedShiftIds.size === exportableShiftsCount}
                        onChange={handleToggleSelectAll}
                        disabled={exportableShiftsCount === 0}
                    />
                    <label htmlFor="select-all-shifts" className="ml-2 text-sm text-gray-600 cursor-pointer">
                        Markera alla synliga
                    </label>
                </div>
            </div>
            <button
                onClick={handleBulkSendToPayroll}
                disabled={selectedShiftIds.size === 0 || isProcessing.size > 0}
                className="btn btn-primary btn-sm"
            >
                <FileOutput className="h-4 w-4 mr-2" />
                Exportera Valda ({selectedShiftIds.size})
            </button>
        </div>

        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
            Visar {filteredShifts.length} av {shifts.length} slutförda pass
        </div>

        <div className="divide-y divide-gray-200">
            {filteredShifts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                    <ListChecks className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">Inga slutförda pass hittades</p>
                    <p className="mt-1">Prova att justera dina filter.</p>
                </div>
            ) : (
                filteredShifts.map((shift) => {
                    const isExported = shift.status === 'processed';
                    const isSelected = selectedShiftIds.has(shift.id);
                    const isCurrentlyProcessing = isProcessing.has(shift.id);

                    return (
                        <div key={shift.id} className={`p-4 transition-colors flex items-start gap-4 ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                            {/* Checkbox only shows for shifts that can be exported */}
                            {!isExported && (
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 rounded border-gray-400 text-primary-600 focus:ring-primary-500 mt-1 flex-shrink-0 cursor-pointer"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelect(shift.id)}
                                    disabled={isCurrentlyProcessing}
                                />
                            )}
                            
                            <div className={`flex-grow ${isExported ? 'ml-9' : ''}`}>
                                <div className="flex flex-wrap justify-between items-start gap-2">
                                    <div className="flex-grow min-w-0">
                                        <h3 className="text-lg font-medium text-gray-900">{shift.title}</h3>
                                        <p className="text-sm text-gray-600 mt-1 flex items-center">
                                            <Users size={14} className="mr-1.5 text-gray-400"/> Utförd av: <strong>{shift.applicant_name || 'Okänd'}</strong>
                                        </p>
                                        <div className="mt-2 flex items-center text-sm text-gray-600">
                                            <Calendar className="mr-1.5 h-4 w-4 text-gray-400" />
                                            {formatDate(shift.date)}
                                        </div>
                                    </div>
                                    <div className="flex flex-row gap-2 flex-shrink-0 items-center pt-1 sm:pt-0">
                                        <button onClick={() => onViewShiftDetails(shift)} className="btn btn-secondary btn-xs">
                                            <Eye className="h-4 w-4 mr-1.5" /> Visa Detaljer
                                        </button>
                                        
                                        {isExported ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                <Check className="h-4 w-4 mr-1.5" /> Exporterad
                                            </span>
                                        ) : (
                                            // The single export button is hidden, as bulk is the primary action now.
                                            // It can be re-enabled if needed by removing the 'invisible' class.
                                            <button 
                                                onClick={() => handleSendToPayroll(shift.id, shift.title || 'Okänt pass')}
                                                className="btn btn-primary-outline btn-xs invisible"
                                                disabled={isCurrentlyProcessing}
                                            >
                                                {isCurrentlyProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <DollarSign className="h-4 w-4 mr-1.5" />}
                                                Exportera
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
        {/* Your existing style block is preserved */}
        <style jsx global>{`
            .form-input, .form-select { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm; }
            .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-150 ease-in-out; }
            .btn-xs { @apply px-2.5 py-1 text-xs; }
            .btn-sm { @apply px-3 py-1.5 text-sm; }
            .btn-outline { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500; }
            .btn-success { @apply border-transparent text-white bg-green-600 hover:bg-green-700 focus:ring-green-500; }
            .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
            .btn-primary { @apply border-transparent text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500; }
            .btn-primary-outline { @apply border-blue-500 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-500; }
        `}</style>
    </div>
);
}
export default CompletedShiftsList;