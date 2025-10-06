// src/components/Payroll/PayslipCard.tsx
import React, { useState } from 'react';
import type { Payslip } from '../../pages/MyPayrollPage';
import { supabase } from '../../lib/supabase';
import { format, parseISO, isValid, Locale } from 'date-fns';
import { sv } from 'date-fns/locale';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Loader2, Download, Eye, TrendingUp, TrendingDown, Briefcase } from 'lucide-react';

// Helper to capitalize the first letter of a string
const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

// Updated formatDateSafe to ensure capitalization
const formatDateSafe = (dateString: string | null | undefined, formatStr: string = 'PP', locale: Locale = sv): string => {
    if (!dateString) return 'N/A';
    const dateObj = parseISO(dateString);
    if (!isValid(dateObj)) return 'Ogiltigt Datum';
    const formattedDate = format(dateObj, formatStr, { locale });
    return capitalizeFirstLetter(formattedDate);
};

// Helper to get image as base64
const getImageBase64 = async (url: string) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error fetching image for PDF:", error);
        return null;
    }
};

export const PayslipCard: React.FC<{ payslip: Payslip }> = ({ payslip }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');

    const generatePdf = async (action: 'preview' | 'download') => {
    if (isLoading) return;
    setIsLoading(true);
    const toastId = toast.loading('Skapar PDF...');

    try {
        const { data: employerDetails, error: employerError } = await supabase.rpc(
            'get_employer_details_for_payslip',
            { p_payslip_id: payslip.id }
        );

        if (employerError) throw employerError;
        if (!employerDetails || employerDetails.length === 0) throw new Error("Kunde inte hämta arbetsgivarinformation.");
        
        const details = employerDetails[0];
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        // --- THIS IS THE NEW PROFESSIONAL LAYOUT ---
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 14;

        // Fonts and Colors
        doc.setTextColor('#1F2937'); // Dark Gray

        // Header
        const logoBase64 = await getImageBase64('/assets/farmispoolenLogo2.png');
        if (logoBase64) doc.addImage(logoBase64, 'PNG', margin, 15, 40, 15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text('Lönebesked', pageWidth - margin, 25, { align: 'right' });
        doc.setDrawColor('#F3F4F6'); // Light Gray
        doc.line(margin, 40, pageWidth - margin, 40);

        // Employer & Employee Details
        autoTable(doc, {
            startY: 45,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 1, textColor: '#1F2937' },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 25 }, 1: { cellWidth: 65 },
                2: { fontStyle: 'bold', cellWidth: 25 }, 3: { cellWidth: 'auto' },
            },
            body: [
                ['Arbetsgivare:', `${details?.employer_name || 'Information saknas'}`, 'Anställd:', `${payslip.employee.full_name}`],
                ['Org.nr:', `${details?.employer_org_no || 'N/A'}`, 'Löneperiod:', `${formatDateSafe(payslip.pay_period, 'MMMM yyyy', sv)}`],
            ],
        });

        // Main Salary Table
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            theme: 'grid',
            headStyles: { fillColor: '#F3F4F6', textColor: '#1F2937', fontStyle: 'bold' },
            footStyles: { fillColor: '#F9FAFB', textColor: '#1F2937', fontStyle: 'bold', fontSize: 11 },
            didParseCell: (data) => {
                if (data.column.index > 0) data.cell.styles.halign = 'right';
                if (data.row.section === 'body' && data.column.index === 1) {
                    if (data.cell.text[0].includes('+')) data.cell.styles.textColor = '#10B981';
                    if (data.cell.text[0].includes('-')) data.cell.styles.textColor = '#EF4444';
                }
            },
            head: [['Beskrivning', 'Belopp (SEK)']],
            body: [
                ['Bruttolön (från pass/uppdrag)', `${payslip.gross_pay.toFixed(2)}`],
                ['Semesterersättning', `+ ${payslip.vacation_pay_added.toFixed(2)}`],
                ['Preliminär skatt', `- ${payslip.tax_deducted.toFixed(2)}`],
            ],
            foot: [['Nettolön att betala', `${payslip.net_pay.toFixed(2)} SEK`]],
        });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor('#6B7280'); // Medium Gray
        const footerText = `Lönebesked genererat ${format(new Date(), 'yyyy-MM-dd HH:mm')} via FarmisPoolen AB`;
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
        // --- END OF NEW LAYOUT ---

        toast.dismiss(toastId);

        if (action === 'preview') {
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            setPdfUrl(url);
            setShowPreview(true);
        } else {
            doc.save(`Lönebesked_${formatDateSafe(payslip.pay_period, 'yyyy-MM')}.pdf`);
            toast.success("PDF nedladdad!");
        }

    } catch (err: any) {
        console.error("PDF Generation Error:", err);
        toast.error(`Kunde inte skapa PDF: ${err.message}`, { id: toastId });
    } finally {
        setIsLoading(false);
    }
};

    return (
        <>
            {/* The root div with the original shadow, border, and hover effect */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 flex flex-col">
                
                {/* Header with the vibrant gradient you liked */}
                <div className="p-5 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold">
                            {formatDateSafe(payslip.pay_period, 'MMMM yyyy', sv)}
                        </h3>
                        <div className="text-right">
                            <p className="text-sm opacity-90">Nettolön</p>
                            <p className="text-3xl font-bold tracking-tight">{payslip.net_pay.toFixed(2)} SEK</p>
                        </div>
                    </div>
                    <p className="text-xs opacity-80 mt-2">
                        Status: <span className={`font-semibold ${payslip.status === 'paid' ? 'text-green-300' : 'text-yellow-300'}`}>{payslip.status === 'paid' ? 'Betald' : 'Bearbetad'}</span>
                    </p>
                </div>

                {/* Body section with a light background and clear info */}
                <div className="p-5 space-y-3 bg-gray-50 flex-grow">
                     <div className="flex justify-between items-center text-sm"><span className="flex items-center text-gray-600"><TrendingUp size={16} className="mr-2 text-green-500"/>Bruttolön</span><span className="font-medium text-gray-800">{payslip.gross_pay.toFixed(2)} SEK</span></div>
                     <div className="flex justify-between items-center text-sm"><span className="flex items-center text-gray-600"><Briefcase size={16} className="mr-2 text-green-500"/>Semesterersättning</span><span className="font-medium text-green-600">+ {payslip.vacation_pay_added.toFixed(2)} SEK</span></div>
                     <div className="flex justify-between items-center text-sm"><span className="flex items-center text-gray-600"><TrendingDown size={16} className="mr-2 text-red-500"/>Preliminär skatt</span><span className="font-medium text-red-500">- {payslip.tax_deducted.toFixed(2)} SEK</span></div>
                </div>

                {/* Footer with correctly styled buttons */}
                <div className="p-3 bg-white border-t flex justify-end items-center space-x-2">
                    <button onClick={() => generatePdf('preview')} disabled={isLoading} 
                        // These classes restore the "primary outline" button style
                        className="inline-flex items-center justify-center px-3 py-1.5 border border-primary-500 text-primary-600 bg-white hover:bg-primary-50 focus:ring-primary-500 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50">
                        {isLoading ? <Loader2 size={14} className="animate-spin"/> : <><Eye size={14} className="mr-1.5"/> Förhandsgranska</>}
                    </button>
                    <button onClick={() => generatePdf('download')} disabled={isLoading} 
                        // These classes restore the "secondary" button style
                        className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50">
                        <Download size={14} className="mr-1.5"/> Ladda ner
                    </button>
                </div>
            </div>

            {showPreview && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-[100] flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <header className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-medium">Förhandsgranskning av lönebesked</h3>
                            <button onClick={() => {
                                setShowPreview(false);
                                URL.revokeObjectURL(pdfUrl); // Clean up the object URL
                            }} className="btn btn-sm btn-outline">Stäng</button>
                        </header>
                        <iframe src={pdfUrl} className="w-full h-full" title="Payslip Preview" />
                    </div>
                </div>
            )}
        </>
    );
};