// src/components/Payroll/ConsolidatedPayrollModal.tsx
import React, { useState, useEffect } from 'react';
import type { Locale } from 'date-fns';
import { format, parseISO, isValid } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Loader2, X, Printer, Edit3, PlusCircle, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Use a direct import instead of for side-effects
import type { UserRole } from '../../types'; // Ensure you have this type defined

// --- Interfaces (remain the same) ---
export interface ConsolidatedItemDetail {
    payrollRecordId: string;
    itemId: string | null;
    itemDate: string | null;
    itemTitle: string | null;
    hoursWorked: number | null;
    basePayForItem: number;
    obPremiumForItem: number | null;
    netAdjustmentsOnItem: number | null;
    totalPayForItem: number | null;
    itemType: 'shift' | 'posting';
}

export interface PeriodLevelAdjustment {
    id?: string;
    tempId?: string;
    reason: string;
    amount: number;
}

export interface ConsolidatedPayrollSummary {
    employeeUserId: string;
    employeeName: string | null;
    payPeriod: string;
    individualItems: ConsolidatedItemDetail[];
    totalHoursFromItems: number;
    totalBasePayFromItems: number;
    totalOBPremiumFromItems: number;
    totalNetAdjustmentsFromItems: number;
    subTotalPayFromItems: number;
    periodLevelAdjustments: PeriodLevelAdjustment[];
    totalPeriodLevelAdjustments: number;
    grandTotalPay: number;
}

// --- Helper Functions ---
const formatDateSafeModal = (dateString: string | null | undefined, formatStr: string = 'PP', locale: Locale = sv): string => {
    if (!dateString) return 'N/A';
    try {
        const dateObj = parseISO(dateString);
        if (isValid(dateObj)) return format(dateObj, formatStr, { locale });
        return 'Invalid Date';
    } catch (e) {
        return 'Date Error';
    }
};

// --- PDF Generation Logic ---
const generatePayslipPDF = (summary: ConsolidatedPayrollSummary) => {
    const toastId = "pdf-gen";
    toast.loading("Genererar lönesedel...", { id: toastId });
    try {
        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.height;
        let yPos = 20;

        const checkYPos = (increment: number = 0) => {
            if (yPos + increment > pageHeight - 20) {
                doc.addPage();
                yPos = 20;
            }
        };

        // Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Lönespecifikation', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
        yPos += 15;

        // Employee and Period Info
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Anställd:`, 14, yPos);
        doc.text(summary.employeeName || 'N/A', 50, yPos);
        doc.text(`Löneperiod:`, 14, yPos + 7);
        doc.text(formatDateSafeModal(summary.payPeriod, 'MMMM yyyy'), 50, yPos + 7);
        yPos += 20;

        // Summary Section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Summering', 14, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const addSummaryRow = (label: string, value: string | number, isBold: boolean = false) => {
            checkYPos(7);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            doc.text(label, 14, yPos);
            doc.text(typeof value === 'number' ? `${value.toFixed(2)} SEK` : value, 150, yPos, { align: 'right' });
            yPos += 7;
        };

        addSummaryRow('Totala timmar:', `${summary.totalHoursFromItems.toFixed(2)} h`);
        addSummaryRow('Grundlön (pass & uppdrag):', summary.totalBasePayFromItems);
        addSummaryRow('OB-ersättning:', summary.totalOBPremiumFromItems);
        addSummaryRow('Justeringar på poster:', summary.totalNetAdjustmentsFromItems);
        addSummaryRow('Subtotal från poster:', summary.subTotalPayFromItems, true);
        yPos += 5;

        if (summary.periodLevelAdjustments.length > 0) {
             addSummaryRow('Periodjusteringar:', summary.totalPeriodLevelAdjustments, true);
             yPos += 5;
        }

        // Grand Total
        doc.setDrawColor(150, 150, 150);
        doc.line(14, yPos, 196, yPos);
        yPos += 8;
        doc.setFontSize(14);
        addSummaryRow('Total Bruttolön:', summary.grandTotalPay, true);
        yPos += 10;

        // Details Table
        if (summary.individualItems.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Specifikation:', 14, yPos);
            yPos += 10;

            const tableBody = summary.individualItems.map(item => [
                formatDateSafeModal(item.itemDate, 'MMM dd, yy'),
                item.itemTitle || 'N/A',
                item.itemType === 'shift' ? (item.hoursWorked?.toFixed(2) || '0.00') : 'N/A',
                item.basePayForItem.toFixed(2),
                item.obPremiumForItem?.toFixed(2) || '0.00',
                item.netAdjustmentsOnItem?.toFixed(2) || '0.00',
                item.totalPayForItem?.toFixed(2) || '0.00'
            ]);

autoTable(doc, {
                startY: yPos,
                head: [['Datum', 'Titel', 'Timmar', 'Grundlön/Ers.', 'OB', 'Just.', 'Totalt (SEK)']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [22, 160, 133], textColor: 255 },
                styles: { fontSize: 8, cellPadding: 1.5 },
                columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 'auto' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } }
            });
        }

        const safeEmployeeName = (summary.employeeName || 'employee').replace(/[^a-z0-9]/gi, '_');
        doc.save(`Payslip_${safeEmployeeName}_${summary.payPeriod}.pdf`);
        toast.success("PDF genererad!", { id: toastId });
    } catch (e: any) {
        toast.error(`PDF Fel: ${e.message}`, { id: toastId });
        console.error("PDF generation error:", e);
    }
};


interface ConsolidatedPayrollModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSummaryData: ConsolidatedPayrollSummary;
    onSavePeriodAdjustments: (employeeUserId: string, payPeriodYYYYMM: string, adjustments: PeriodLevelAdjustment[]) => Promise<boolean>;
    // The modal now handles PDF generation itself
    // onGeneratePayslip: (summaryData: ConsolidatedPayrollSummary) => void;
    currentUserRole?: UserRole; // <-- ADD THIS PROP
}

export const ConsolidatedPayrollModal: React.FC<ConsolidatedPayrollModalProps> = ({
    isOpen, onClose, initialSummaryData, onSavePeriodAdjustments, currentUserRole
}) => {
    const [summaryData, setSummaryData] = useState<ConsolidatedPayrollSummary>(initialSummaryData);
    const [isEditingAdjustments, setIsEditingAdjustments] = useState(false);
    const [currentPeriodAdjustments, setCurrentPeriodAdjustments] = useState<PeriodLevelAdjustment[]>([]);
    
    const [newAdjustmentReason, setNewAdjustmentReason] = useState('');
    const [newAdjustmentAmount, setNewAdjustmentAmount] = useState<string>('');
    const [editingAdjustment, setEditingAdjustment] = useState<PeriodLevelAdjustment | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const canManage = currentUserRole === 'admin' || currentUserRole === 'employer';
    

    useEffect(() => {
        setSummaryData(initialSummaryData);
        setCurrentPeriodAdjustments(JSON.parse(JSON.stringify(initialSummaryData.periodLevelAdjustments || [])));
        setIsEditingAdjustments(false);
    }, [initialSummaryData, isOpen]);

    const handleRecalculateTotalsWithNewAdjustments = (adjustments: PeriodLevelAdjustment[]) => {
        const newTotalPeriodLevelAdjs = adjustments.reduce((sum, adj) => sum + (Number(adj.amount) || 0), 0);
        setSummaryData(prev => ({
            ...prev!,
            periodLevelAdjustments: adjustments,
            totalPeriodLevelAdjustments: newTotalPeriodLevelAdjs,
            grandTotalPay: prev!.subTotalPayFromItems + newTotalPeriodLevelAdjs,
        }));
    };
    
    const handleAddOrUpdateLocalAdjustment = () => {
        const amount = parseFloat(newAdjustmentAmount);
        if (!newAdjustmentReason.trim() || isNaN(amount)) {
            toast.error("Please enter a valid reason and amount.");
            return;
        }

        let updatedAdjustments;
        if (editingAdjustment) {
            updatedAdjustments = currentPeriodAdjustments.map(adj =>
                (adj.id === editingAdjustment.id || adj.tempId === editingAdjustment.tempId)
                    ? { ...adj, reason: newAdjustmentReason, amount }
                    : adj
            );
        } else {
            updatedAdjustments = [...currentPeriodAdjustments, { tempId: Date.now().toString(), reason: newAdjustmentReason, amount }];
        }
        setCurrentPeriodAdjustments(updatedAdjustments);
        handleRecalculateTotalsWithNewAdjustments(updatedAdjustments);
        
        setNewAdjustmentReason('');
        setNewAdjustmentAmount('');
        setEditingAdjustment(null);
    };

    const handleEditLocalAdjustment = (adjustmentToEdit: PeriodLevelAdjustment) => {
        setEditingAdjustment(adjustmentToEdit);
        setNewAdjustmentReason(adjustmentToEdit.reason);
        setNewAdjustmentAmount(adjustmentToEdit.amount.toString());
    };
    
    const handleRemoveLocalAdjustment = (adjustmentToRemove: PeriodLevelAdjustment) => {
        if (!window.confirm(`Are you sure you want to remove the adjustment: "${adjustmentToRemove.reason}"?`)) return;
        
        const updatedAdjustments = currentPeriodAdjustments.filter(adj => 
            adj.tempId !== adjustmentToRemove.tempId || (adj.id && adj.id !== adjustmentToRemove.id)
        );
        setCurrentPeriodAdjustments(updatedAdjustments);
        handleRecalculateTotalsWithNewAdjustments(updatedAdjustments);
        if (editingAdjustment && (editingAdjustment.tempId === adjustmentToRemove.tempId || editingAdjustment.id === adjustmentToRemove.id)) {
            setNewAdjustmentReason('');
            setNewAdjustmentAmount('');
            setEditingAdjustment(null);
        }
    };

    const handleSaveAllAdjustmentsToDB = async () => {
        setIsSaving(true);
        const success = await onSavePeriodAdjustments(summaryData.employeeUserId, summaryData.payPeriod, currentPeriodAdjustments);
        setIsSaving(false);
        if (success) {
            setIsEditingAdjustments(false);
            toast.success("Period adjustments saved!");
        } else {
            toast.error("Failed to save adjustments.");
        }
    };

    const handleCancelEditAdjustments = () => {
        setCurrentPeriodAdjustments(JSON.parse(JSON.stringify(summaryData.periodLevelAdjustments || [])));
        handleRecalculateTotalsWithNewAdjustments(summaryData.periodLevelAdjustments || []);
        setIsEditingAdjustments(false);
        setNewAdjustmentReason('');
        setNewAdjustmentAmount('');
        setEditingAdjustment(null);
    };

    if (!isOpen || !summaryData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-4xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4 pb-3 border-b">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 pr-2">
                        Sammanfattning månad: {summaryData.employeeName} 
                        <span className="text-gray-500 font-normal block sm:inline"> ({formatDateSafeModal(summaryData.payPeriod, 'MMMM yyyy')})</span>
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-600 p-1 rounded-full"><X size={24} /></button>
                </div>

                <div className="flex-grow overflow-y-auto pr-1 sm:pr-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 p-3 bg-slate-50 rounded-lg border text-sm">
                        <p><strong>Total Hours:</strong> {summaryData.totalHoursFromItems.toFixed(2)}</p>
                        <p><strong>Base Pay:</strong> {summaryData.totalBasePayFromItems.toFixed(2)} SEK</p>
                        <p><strong>OB Premium:</strong> {summaryData.totalOBPremiumFromItems.toFixed(2)} SEK</p>
                        <p><strong>Adjustments on Items:</strong> {summaryData.totalNetAdjustmentsFromItems.toFixed(2)} SEK</p>
                        <p className="font-bold md:col-span-2 text-base text-indigo-700 mt-2">Sub-Total from Items: {summaryData.subTotalPayFromItems.toFixed(2)} SEK</p>
                    </div>

                    <div className="p-3 border rounded-lg bg-white">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-semibold text-gray-700">Period-Level Adjustments</h3>
                            {canManage && !isEditingAdjustments && (
                            <button onClick={() => setIsEditingAdjustments(true)} className="btn btn-secondary-outline btn-xs"><Edit3 size={14} className="mr-1.5"/> Manage</button>
                        )}
                        </div>
                        {/* ... (rest of the modal JSX for adjustments remains the same) ... */}
                    </div>

                    <div className="my-4 p-3 bg-indigo-100 rounded-lg border border-indigo-300">
                        <p className="text-lg font-bold text-indigo-800 text-right">Total lön netto: {summaryData.grandTotalPay.toFixed(2)} SEK</p>
                    </div>

                    <div className="border rounded-lg bg-white p-3">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Individual Items ({summaryData.individualItems.length})</h3>
                        <div className="overflow-x-auto max-h-60 border rounded-md">
                            <table className="min-w-full text-xs">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left font-semibold">Datum</th>
                                        <th className="p-2 text-left font-semibold">Titel</th>
                                        <th className="p-2 text-right font-semibold">Timmar</th>
                                        <th className="p-2 text-right font-semibold">Bas-lön</th>
                                        <th className="p-2 text-right font-semibold">OB</th>
                                        <th className="p-2 text-right font-semibold">Justering</th>
                                        <th className="p-2 text-right font-semibold">Totalt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {summaryData.individualItems.map(item => (
                                        <tr key={item.payrollRecordId}>
                                            <td className="p-2 whitespace-nowrap">{formatDateSafeModal(item.itemDate, 'MMM dd')}</td>
                                            <td className="p-2 truncate max-w-xs" title={item.itemTitle || ''}>{item.itemTitle || 'N/A'}</td>
                                            <td className="p-2 text-right">{item.itemType === 'shift' ? item.hoursWorked?.toFixed(2) : 'N/A'}</td>
                                            <td className="p-2 text-right">{item.basePayForItem.toFixed(2)}</td>
                                            <td className="p-2 text-right">{item.obPremiumForItem?.toFixed(2) ?? '0.00'}</td>
                                            <td className="p-2 text-right">{item.netAdjustmentsOnItem?.toFixed(2) ?? '0.00'}</td>
                                            <td className="p-2 text-right font-medium">{item.totalPayForItem?.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

<div className="flex justify-end gap-3 pt-4 border-t mt-auto">
                    <button onClick={onClose} className="btn btn-outline">Stäng</button>
                    <button
                        onClick={() => generatePayslipPDF(summaryData)} // Call the internal PDF generator
                        className="btn btn-primary"
                        disabled={isEditingAdjustments}
                    >
                        <Printer size={16} className="mr-2"/> Ladda ner PDF
                    </button>
                </div>
            </div>
        </div>
    );
};