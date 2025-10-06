// src/components/Payroll/PayrollAdjustmentsModal.tsx
import React, { useState } from 'react';
import { updatePayrollAdjustments, PayrollAdjustment } from '../../lib/payroll'; // Adjust path
import type { PayrollExportData } from '../../lib/payroll'; // Adjust path
import { toast } from 'react-hot-toast';
import { X, Plus, Trash2, Save, Loader2 } from 'lucide-react';

interface PayrollAdjustmentsModalProps {
    payrollRecord: PayrollExportData;
    // Change this line to accept a boolean
    onClose: (refresh: boolean) => void; 
    currentRecordType: 'shift' | 'posting';
}

export const PayrollAdjustmentsModal: React.FC<PayrollAdjustmentsModalProps> = ({
    payrollRecord,
    onClose,
    currentRecordType, // RECEIVED: The type from the parent view
}) => {
    const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>(
        Array.isArray(payrollRecord.adjustments) ? payrollRecord.adjustments : []
    );
    const [newReason, setNewReason] = useState('');
    const [newAmount, setNewAmount] = useState<number | string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAddAdjustment = (e: React.FormEvent) => {
         e.preventDefault();
         const amountNum = parseFloat(newAmount as string);
         if (!newReason || isNaN(amountNum)) {
             toast.error("Please enter a valid reason and amount.");
             return;
         }
         setAdjustments([...adjustments, { reason: newReason, amount: amountNum }]);
         setNewReason('');
         setNewAmount('');
     };

    const handleRemoveAdjustment = (index: number) => {
        setAdjustments(adjustments.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);
        
        const result = await updatePayrollAdjustments(payrollRecord.id, adjustments, currentRecordType);
        setIsLoading(false);
        if (result.success) {
            toast.success("Adjustments saved successfully!");
            // Change this line to send 'true' on success
            onClose(true); 
        } else {
            setError(result.error || 'Failed to save adjustments.');
            toast.error(result.error || 'Failed to save adjustments.');
            // Optionally, send 'false' if no refresh is needed
            onClose(false);
        }
    };

    const netAdjustments = adjustments.reduce((sum, adj) => sum + (adj.amount || 0), 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-base sm:text-lg font-medium pr-2">Edit Adjustments for {payrollRecord.employeeName}</h3>
                    <button onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>

                {/* Body */}
                <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto">
                    {error && <div className="text-red-600 bg-red-50 p-2 rounded text-sm">{error}</div>}

                    {/* List Current Adjustments */}
                    <div className="space-y-2">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-600">Nuvarande justeringar:</h4>
                        {adjustments.length === 0 ? (
                            <p className="text-xs sm:text-sm text-gray-500 italic">Inga justeringar gjorda.</p>
                        ) : (
                            adjustments.map((adj, index) => (
                                <div key={index} className="flex justify-between items-center text-xs sm:text-sm border p-1.5 sm:p-2 rounded bg-gray-50">
                                    <span>{adj.reason}:</span>
                                    <span className={`font-medium ${adj.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {adj.amount.toFixed(2)} SEK
                                    </span>
                                    <button onClick={() => handleRemoveAdjustment(index)} className="text-red-500 hover:text-red-700 ml-2">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                         <div className="text-right font-semibold border-t pt-1.5 sm:pt-2 text-sm">
                             Net Adjustment: {netAdjustments.toFixed(2)} SEK
                         </div>
                    </div>

                    {/* Add New Adjustment Form */}
                    <form onSubmit={handleAddAdjustment} className="space-y-2 border-t pt-3 sm:pt-4">
                         <h4 className="text-xs sm:text-sm font-medium text-gray-600">Lägg till ny justering:</h4>
                         <div>
                             <label htmlFor="reason" className="sr-only">Orsak</label>
                             <input
                                 type="text" id="reason" placeholder="Reason (e.g., Bonus, Advance)"
                                 value={newReason} onChange={(e) => setNewReason(e.target.value)} required
                                 className="w-full border-gray-300 rounded-md shadow-sm text-xs sm:text-sm p-1.5 sm:p-2"
                            />
                         </div>
                         <div>
                             <label htmlFor="amount" className="sr-only">Summa</label>
                            <input
                                type="number" step="0.01" id="amount" placeholder="Amount (+/-)"
                                value={newAmount} onChange={(e) => setNewAmount(e.target.value)} required
                                className="w-full border-gray-300 rounded-md shadow-sm text-xs sm:text-sm p-1.5 sm:p-2"
                             />
                         </div>
                         <button type="submit" className="btn btn-secondary btn-xs sm:btn-sm flex items-center">
                             <Plus size={16} className="mr-1"/> Lägg till
                         </button>
                     </form>
                </div>

                {/* Footer */}
                <div className="flex justify-end items-center p-3 sm:p-4 border-t bg-gray-50 space-x-2">
                    <button onClick={() => onClose(false)} type="button" className="btn btn-secondary btn-sm sm:btn-md">Avbryt</button>
                    <button onClick={handleSave} disabled={isLoading} className="btn btn-primary btn-sm sm:btn-md flex items-center">
                        {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Save size={16} className="mr-1"/>}
                        Spara justering
                    </button>
                </div>
            </div>
            {/* Styles from PayrollPage for .btn, .btn-primary, .btn-secondary, .btn-sm, .btn-md are assumed to apply or can be copied here if needed */}
            <style jsx global>{`
              .btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border-width: 1px; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; border-radius: 0.375rem; box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow); transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
              .btn:focus { outline: 2px solid transparent; outline-offset: 2px; --tw-ring-offset-width: 2px; --tw-ring-color: theme('colors.primary.500'); box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000); }
              .btn:disabled { opacity: 0.7; cursor: not-allowed; }
              .btn-primary { @apply border-transparent text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500; }
              .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
              .btn-xs { @apply px-2.5 py-1.5 text-xs; }
              .btn-sm { @apply px-3 py-1.5 text-sm; }
              .btn-md { /* For general button sizing, or adjust .btn if all are this size */ }
            `}</style>
        </div>
    );
};
export default PayrollAdjustmentsModal;