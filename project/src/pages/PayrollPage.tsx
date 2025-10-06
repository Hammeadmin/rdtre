// src/pages/PayrollPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
    fetchPayrollDataForExport,
    updatePayrollStatus,
} from '../lib/payroll';
import type { PayrollStatus, UserRole, ShiftNeed, JobPosting } from '../types';
import type { PayrollExportData } from '../lib/payroll';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
    Loader2, Download, CheckCircle, XCircle, ChevronUp, ChevronDown,
    Filter, Info, DollarSign, Send, Eye, ListFilter, FileText, RefreshCw, Archive,
    Printer, Edit3, PlusCircle, Wallet, Trash2, Save, Briefcase, AlertTriangle, Building2,
    Square, CheckSquare, Undo2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PayrollAdjustmentsModal } from '../components/Payroll/PayrollAdjustmentsModal';
import ShiftDetailsModal from '../components/Shifts/ShiftDetailsModal';
import { PostingDetailsModal } from '../components/postings/PostingDetailsModal';
import { ConsolidatedPayrollModal, ConsolidatedItemDetail, ConsolidatedPayrollSummary, PeriodLevelAdjustmentUI } from '../components/Payroll/ConsolidatedPayrollModal';
import { format, parseISO, isValid, Locale } from 'date-fns';
import { sv } from 'date-fns/locale';
import { PayrollEmailLog } from '../components/Payroll/PayrollEmailLog'; // 1. Import the new component
import { ProcessPayrollModal } from '../components/Payroll/ProcessPayrollModal';

const capitalizeFirstLetter = (string: string) => {
    if (!string) return string;
    return string.charAt(0).toUpperCase() + string.slice(1);
};


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
// Helper: OBDetailsTooltip Component
const OBDetailsTooltip: React.FC<{ details: any }> = ({ details }) => {
    if (!details || typeof details !== 'object' || Object.keys(details).length === 0) return null;
    const formattedDetails = Object.entries(details)
        .map(([key, value]) => {
            if (typeof value === 'number' && value > 0) {
                const rate = key.match(/(\d+)/)?.[0];
                return `${parseFloat(value.toFixed(2))}h @ ${rate || '?'}% OB`;
            } return null;
        }).filter(Boolean).join(', ');
    if (!formattedDetails) return null;
    return (
        <span className="group relative ml-1.5 inline-block align-middle">
            <Info size={13} className="text-blue-500 cursor-help" />
            <span className="absolute hidden group-hover:block bg-gray-700 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 whitespace-nowrap z-20 shadow-lg text-center">
                {formattedDetails}
            </span>
        </span>
    );
};

// Helper: formatDateSafe
const formatDateSafe = (dateString: string | null | undefined, formatStr: string = 'PP', locale: Locale = sv): string => {
    if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') return 'N/A';
    let dateObj: Date | null = null;
    try {
        if (dateString.includes('T') && (dateString.includes('Z') || dateString.match(/[+-]\d{2}:\d{2}$/))) dateObj = parseISO(dateString);
        else if (/^\d{4}-\d{2}$/.test(dateString)) dateObj = parseISO(dateString + '-01');
        else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) dateObj = parseISO(dateString);
        else dateObj = new Date(dateString);
        if (dateObj && isNaN(dateObj.getTime())) { dateObj = parseISO(dateString); if (isNaN(dateObj.getTime())) dateObj = null; }
    } catch (e) { dateObj = null; }
    if (!dateObj || !isValid(dateObj)) {
        console.warn(`formatDateSafe: Could not parse '${dateString}' into a valid date. Returning 'Formatting Error'.`);
        return 'Formatting Error';
    }
    try {
        const formatted = format(dateObj, formatStr, { locale }); 
        return capitalizeFirstLetter(formatted);
    } catch (formatError) {
        console.warn(`formatDateSafe: Error formatting date object for '<span class="math-inline">\{dateString\}' with format '</span>{formatStr}'. Error: ${formatError}`);
        return 'Formatting Error';
    }
};

const EmployerPayrollView: React.FC<{ recordTypeFilter: 'shift' | 'posting' }> = ({ recordTypeFilter }) => {
    const { profile: currentProfile } = useAuth();
    const isAdmin = currentProfile?.role === 'admin';
    const [payrollRecords, setPayrollRecords] = useState<PayrollExportData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAdjustmentsModal, setShowAdjustmentsModal] = useState(false);
    const [recordToAdjust, setRecordToAdjust] = useState<PayrollExportData | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<PayrollStatus | ''>('pending');
    const [selectedPayPeriod, setSelectedPayPeriod] = useState<string>('');
    const [employeeFilter, setEmployeeFilter] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<SortConfig<PayrollExportData>>({ key: 'pay_period', direction: 'descending' });
    const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
    const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
    const [detailedItemData, setDetailedItemData] = useState<ShiftNeed | JobPosting | null>(null);
    const [isLoadingItemDetails, setIsLoadingItemDetails] = useState(false);
    const [showConsolidatedModal, setShowConsolidatedModal] = useState(false);
    const [consolidatedData, setConsolidatedData] = useState<ConsolidatedPayrollSummary | null>(null);
    const [isLoadingConsolidated, setIsLoadingConsolidated] = useState(false);
    const [allEmployers, setAllEmployers] = useState<{ id: string; display_name: string }[]>([]);
    const [adminSelectedEmployerId, setAdminSelectedEmployerId] = useState<string>('');
    const [emailLogs, setEmailLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [recordsToProcess, setRecordsToProcess] = useState<PayrollExportData[]>([]);
    const [previewData, setPreviewData] = useState<PayrollExportData | null>(null);
    const [showPayModal, setShowPayModal] = useState(false);
    const [recordsToPay, setRecordsToPay] = useState<PayrollExportData[]>([]);
    const [availablePayPeriods, setAvailablePayPeriods] = useState<string[]>([]);
    const [showPaymentInfoModal, setShowPaymentInfoModal] = useState(false);
    const [paymentInfo, setPaymentInfo] = useState<any>(null);
    const [isLoadingPaymentInfo, setIsLoadingPaymentInfo] = useState(false);


  const handleShowPaymentInfo = async () => {
    const selectedRecords = sortedRecords.filter(r => selectedRecordIds.has(r.id));
    const employeeId = selectedRecords[0]?.user_id;

    if (!employeeId) {
        toast.error("Kunde inte identifiera den anställde.");
        return;
    }

    setIsLoadingPaymentInfo(true);
    setShowPaymentInfoModal(true);
    try {
        const { data, error } = await supabase
            .from('payroll_information')
            .select('*')
            .eq('id', employeeId)
            .single();

        if (error) throw error;
        setPaymentInfo(data);
    } catch (err: any) {
        toast.error("Kunde inte hämta betalningsinformation.");
        setShowPaymentInfoModal(false);
    } finally {
        setIsLoadingPaymentInfo(false);
    }
};

  const handleOpenPayModal = () => {
    const processedRecords = sortedRecords.filter(r =>
        selectedRecordIds.has(r.id) && r.status === 'processed'
    );

    if (processedRecords.length === 0) {
        toast.error("Please select 'Processed' records to pay.");
        return;
    }
    setRecordsToPay(processedRecords);
    setShowPayModal(true);
};

  const generateCleanCSV = (payslips: any[]): string => {
    const headers = ["Anställd", "Löneperiod", "Bruttolön", "Semesterers.", "Skatt", "Nettolön", "Status"];
    
    const rows = payslips.map(p => {
        return [
            `"${p.employee?.full_name || 'Okänd'}"`,
            `"${formatDateSafe(p.pay_period, 'yyyy-MM')}"`,
            p.gross_pay.toFixed(2),
            p.vacation_pay_added.toFixed(2),
            p.tax_deducted.toFixed(2),
            p.net_pay.toFixed(2),
            `"Bearbetad"` // Or you could fetch the status if needed
        ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
};

// Replace your existing handleExportCSV function
const handleExportCSV = async () => {
    const recordsToExport = sortedRecords.filter(r => 
        selectedRecordIds.has(r.id) && (r.status === 'processed' || r.status === 'paid')
    );

    if (recordsToExport.length === 0) {
        return toast.error("Vänligen välj bearbetade eller betalda poster att exportera.");
    }
    
    const toastId = toast.loading("Hämtar löneunderlag för CSV-export...");

    try {
        const recordIds = recordsToExport.map(r => r.id);
        const orClause = recordIds.map(id => `source_record_ids.cs.{"${id}"}`).join(',');

        const { data: payslips, error } = await supabase
            .from('payslips')
            .select('*, employee:employee_id(full_name)')
            .or(orClause);

        if (error) throw error;
        if (!payslips || payslips.length === 0) {
            throw new Error("Inga matchande lönebesked funna för CSV-export.");
        }

        const csvContent = generateCleanCSV(payslips);
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Lönebesked_${selectedPayPeriod}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV-fil har laddats ner!', { id: toastId });

    } catch (err: any) {
        console.error("CSV Export error:", err);
        toast.error(`Misslyckades att generera CSV: ${err.message}`, { id: toastId });
    }
};

const generateProfessionalPayslip = async (doc: jsPDF, payslipData: any, isPreview: boolean = false) => {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;

    // --- Fonts and Colors ---
    const FONT_REGULAR = 'helvetica';
    const FONT_BOLD = 'helvetica';
    const COLOR_PRIMARY_TEXT = '#1F2937'; // Dark Gray
    const COLOR_SECONDARY_TEXT = '#6B7280'; // Medium Gray
    const COLOR_GREEN = '#10B981';
    const COLOR_RED = '#EF4444';
    const COLOR_TABLE_HEADER = '#F3F4F6'; // Light Gray
    const COLOR_FOOTER_BG = '#F9FAFB'; // Very Light Gray

    doc.setTextColor(COLOR_PRIMARY_TEXT);

    // --- 1. Header Section ---
    const logoBase64 = await getImageBase64('/assets/farmispoolenLogo2.png');
    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, 15, 40, 15);
    }
    doc.setFont(FONT_BOLD, 'bold');
    doc.setFontSize(22);
    doc.text(isPreview ? 'Förhandsgranskning' : 'Lönebesked', pageWidth - margin, 25, { align: 'right' });
    doc.setDrawColor(COLOR_TABLE_HEADER);
    doc.line(margin, 40, pageWidth - margin, 40);

    // --- 2. Employer & Employee Details ---
    let details: any = {};
    if (!isPreview) {
        const { data, error } = await supabase.rpc('get_employer_details_for_payslip', { p_payslip_id: payslipData.id });
        if (error) console.warn("Could not fetch employer details:", error);
        details = data?.[0];
    } else {
        const { data, error } = await supabase.from('profiles').select('pharmacy_name, organization_number').eq('id', payslipData.employer_id).single();
        if (error) console.warn("Could not fetch employer profile for preview:", error);
        details = { employer_name: data?.pharmacy_name, employer_org_no: data?.organization_number };
    }

    autoTable(doc, {
        startY: 45,
        theme: 'plain',
        tableWidth: 'auto',
        styles: { fontSize: 9, cellPadding: 1, textColor: COLOR_PRIMARY_TEXT },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 25 },
            1: { cellWidth: 65 },
            2: { fontStyle: 'bold', cellWidth: 25 },
            3: { cellWidth: 'auto' },
        },
        body: [
            ['Arbetsgivare:', `${details?.employer_name || 'Information saknas'}`, 'Anställd:', `${payslipData.employeeName || 'Okänd'}`],
            ['Org.nr:', `${details?.employer_org_no || 'N/A'}`, 'Löneperiod:', `${formatDateSafe(payslipData.pay_period, 'MMMM yyyy', sv)}`],
        ],
    });

    // --- 3. Main Salary Specification Table ---
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        theme: 'grid',
        headStyles: { fillColor: COLOR_TABLE_HEADER, textColor: COLOR_PRIMARY_TEXT, fontStyle: 'bold' },
        footStyles: { fillColor: COLOR_FOOTER_BG, textColor: COLOR_PRIMARY_TEXT, fontStyle: 'bold', fontSize: 11 },
        didParseCell: (data) => {
            // Right-align all numeric columns
            if (data.column.index > 0) {
                data.cell.styles.halign = 'right';
            }
            // Color for additions and deductions
            if (data.row.section === 'body' && data.column.index === 1) {
                if (data.cell.text[0].includes('+')) data.cell.styles.textColor = COLOR_GREEN;
                if (data.cell.text[0].includes('-')) data.cell.styles.textColor = COLOR_RED;
            }
        },
        head: [['Beskrivning', 'Belopp (SEK)']],
        body: [
            ['Bruttolön (från pass/uppdrag)', `${payslipData.gross_pay.toFixed(2)}`],
            ['Semesterersättning', `+ ${payslipData.vacation_pay_added.toFixed(2)}`],
            ['Preliminär skatt', `- ${payslipData.tax_deducted.toFixed(2)}`],
        ],
        foot: [
            ['Nettolön att betala', `${payslipData.net_pay.toFixed(2)} SEK`],
        ],
    });

    // --- 4. Footer ---
    doc.setFontSize(8);
    doc.setTextColor(COLOR_SECONDARY_TEXT);
    const footerText = `Lönebesked genererat ${format(new Date(), 'yyyy-MM-dd HH:mm')} via FarmisPoolen AB`;
    doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
};
const handlePreviewPayslip = async (record: PayrollExportData) => {
    const toastId = toast.loading("Skapar förhandsgranskning...");

    try {
        // Perform the same calculations as the ProcessPayrollModal
        const grossPay = record.total_pay || 0;
        const vacationPay = grossPay * 0.12; // Standard 12%
        const taxDeduction = (grossPay + vacationPay) * 0.30; // Standard 30%
        const netPay = grossPay + vacationPay - taxDeduction;

        // Create a temporary "payslip" object with all the needed data
        const tempPayslip = {
            ...record, // Spread the original record to get employeeName, pay_period, etc.
            gross_pay: grossPay,
            vacation_pay_added: vacationPay,
            tax_deducted: taxDeduction,
            net_pay: netPay,
        };
        
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        await generateProfessionalPayslip(doc, tempPayslip, true);
        
        // Open the PDF in a new browser tab for preview
        doc.output('dataurlnewwindow');

        toast.success("Förhandsgranskning skapad!", { id: toastId });
    } catch (e: any) {
        console.error("PDF preview failed:", e);
        toast.error(`Fel vid förhandsgranskning: ${e.message}`, { id: toastId });
    }
};
  


  const handleOpenProcessModal = () => {
        const records = sortedRecords.filter(r => selectedRecordIds.has(r.id) && r.status === 'pending');
        if (records.length === 0) {
            toast("Inga väntande poster valda att bearbeta.");
            return;
        }

        // Check if all selected records belong to the same employee
        const firstEmployeeId = records[0]?.user_id;
        if (!records.every(r => r.user_id === firstEmployeeId)) {
            toast.error("Du kan endast bearbeta löner för en anställd åt gången.");
            return;
        }

        setRecordsToProcess(records);
        setShowProcessModal(true);
    };
  const handleOpenAdjustmentsModal = (record: PayrollExportData) => {
    setRecordToAdjust(record);
    setShowAdjustmentsModal(true);
};

const handleCloseAdjustmentsModal = (refresh: boolean = false) => {
    setShowAdjustmentsModal(false);
    setRecordToAdjust(null);
    if (refresh) {
        loadPayrollData();
    }
};

const handleGeneratePayslipsPDF = async () => {
    const toastId = "payslip-pdf-gen";
    const processedRecordIds = sortedRecords
        .filter(r => selectedRecordIds.has(r.id) && r.status === 'processed')
        .map(r => r.id);

    if (processedRecordIds.length === 0) {
        return toast.error("Välj en eller flera 'Bearbetade' poster för att ladda ner lönebesked.");
    }

    toast.loading("Hämtar lönebesked och skapar PDF...", { id: toastId });

    try {
        // ---- THIS IS THE FIX ----
        // Build a dynamic "OR" clause to find any payslip containing any of the selected IDs.
        // This is more reliable than array operators.
        const orClause = processedRecordIds
          .map(id => `source_record_ids.cs.{"${id}"}`)
           .join(',');

        const { data: payslips, error } = await supabase
            .from('payslips')
            .select('*, employee:employee_id(full_name)')
            .or(orClause);
        // ---- END OF FIX ----

        if (error) throw error;
        if (!payslips || payslips.length === 0) {
            // This error will no longer be incorrectly triggered.
            throw new Error("Kunde inte hitta några matchande lönebesked.");
        }
        
        // Remove duplicates if multiple selections point to the same payslip
        const uniquePayslips = Array.from(new Map(payslips.map(p => [p.id, p])).values());


        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        for (const payslip of uniquePayslips) {
            const payslipWithDetails = {
                ...payslip,
                employeeName: payslip.employee?.full_name,
                pay_period: payslip.pay_period,
            };
            
            doc.addPage();
            await generateProfessionalPayslip(doc, payslipWithDetails, false);
        }
        
        doc.deletePage(1);
        doc.save(`Lönebesked_${selectedPayPeriod || 'export'}.pdf`);
        toast.success("PDF med lönebesked har skapats!", { id: toastId });

    } catch (e: any) {
        console.error("PDF generation failed:", e);
        toast.error(`PDF Fel: ${e.message}`, { id: toastId });
    }
};

 const handleSendToPayrollOffice = async () => {
    const recordsToSend = sortedRecords.filter(r => 
      selectedRecordIds.has(r.id) && (r.status === 'processed' || r.status === 'paid')
    );

    if (recordsToSend.length === 0) {
        toast.error("Vänligen välj bearbetade eller betalda poster att skicka.");
        return;
    }
    
    const recipientEmail = window.prompt("Ange e-postadress till Lönekontoret:");
    if (!recipientEmail) {
        toast("Avbrutet.");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
        toast.error("Ogiltig e-postadress.");
        return;
    }

    const toastId = toast.loading("Förbereder och skickar e-post...");

    try {
        const recordIds = recordsToSend.map(r => r.id);

        // 1. Fetch the FINAL payslip data from the database
        const orClause = recordIds.map(id => `source_record_ids.cs.{"${id}"}`).join(',');

        const { data: payslips, error } = await supabase
            .from('payslips')
            .select('*, employee:employee_id(full_name)')
            .or(orClause);
        // ---- END OF FIX ----

        if (error) throw error;
        if (!payslips || payslips.length === 0) {
            throw new Error("Kunde inte hitta matchande lönebesked för de valda posterna.");
        }

        // 2. Generate the PDF using the new, correct logic
        const uniquePayslips = Array.from(new Map(payslips.map(p => [p.id, p])).values());

        // Use the professional PDF generation logic you already have
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        for (const payslip of uniquePayslips) {
            const payslipWithDetails = { ...payslip, employeeName: payslip.employee?.full_name };
            doc.addPage();
            await generateProfessionalPayslip(doc, payslipWithDetails, false);
        }
        doc.deletePage(1);

        // 3. Get the final PDF as a base64 string and send it
        const pdfAsBase64 = doc.output('datauristring');
        const response = await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emailType: 'payrollReport',
                payload: {
                    recipientEmail: recipientEmail,
                    pdfData: pdfAsBase64,
                    payPeriod: selectedPayPeriod,
                    employerName: currentProfile?.pharmacy_name || currentProfile?.full_name || "Farmispoolen",
                },
            }),
        });

        if (!response.ok) {
            throw new Error('Nätverksfel vid sändning av e-post.');
        }

        toast.success('Lönerapporten har skickats!', { id: toastId });
        fetchEmailLogs();
    } catch (error: any) {
        toast.error(`Det gick inte att skicka rapporten: ${error.message}`, { id: toastId });
        console.error('Error sending payroll report:', error);
    }
};



    const defaultPayPeriod = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
        // This ensures a correct string like "2025-06" is created
        return `${currentYear}-${currentMonth}`;
    }, []);

    useEffect(() => {
        if (isAdmin) {
            const fetchEmployersForAdmin = async () => {
                try {
                    const { data, error: empError } = await supabase.from('profiles').select('id, full_name, pharmacy_name').eq('role', 'employer').order('pharmacy_name', { ascending: true, nullsFirst: false }).order('full_name', { ascending: true });
                    if (empError) throw empError;
                    setAllEmployers(data?.map(emp => ({ id: emp.id, display_name: emp.pharmacy_name || emp.full_name || `Arbetsgivare ${emp.id.substring(0, 8)}` })) || []);
                } catch (e) {
                    toast.error("Kunde inte ladda arbetsgivarlistan för adminfilter.");
                    console.error("Error fetching employers for admin:", e);
                }
            };
            fetchEmployersForAdmin();
        }
    }, [isAdmin]);

    const loadPayrollData = useCallback(async (period?: string) => {
        setIsLoading(true); 
        setError(null);
        
        const payPeriodToFetch = period || selectedPayPeriod || defaultPayPeriod;
        
        // This check ensures we don't try to fetch data if the period isn't set yet
        if (!payPeriodToFetch) {
            setIsLoading(false);
            return;
        }

        if (!period) {
          
        }

        const filtersArg: {
            payPeriod?: string;
            status?: PayrollStatus | '';
            employeeNameOrId?: string;
            recordType?: 'shift' | 'posting';
            adminForEmployerId?: string;
        } = { recordType: recordTypeFilter };

        // **THE FIX**: This now correctly formats the date string before it's sent.
        if (payPeriodToFetch && selectedPayPeriod) { // <-- The new logic
    filtersArg.payPeriod = `${payPeriodToFetch}-01`;
}
        
        if (selectedStatus) filtersArg.status = selectedStatus;
        if (employeeFilter.trim()) filtersArg.employeeNameOrId = employeeFilter.trim();

        if (isAdmin) {
            if (adminSelectedEmployerId) filtersArg.adminForEmployerId = adminSelectedEmployerId;
        } else if (currentProfile?.role === 'employer') {
            filtersArg.adminForEmployerId = currentProfile.id;
        }

        const { data, error: fetchError } = await fetchPayrollDataForExport(filtersArg);
        
        if (fetchError) {
            const errorMessage = typeof fetchError === 'string' ? fetchError : (fetchError as Error).message || 'Okänt fel vid hämtning av löneunderlag.';
            setError(errorMessage);
            setPayrollRecords([]);
            toast.error(`Kunde inte ladda löneunderlag: ${errorMessage}`);
        } else {
            setPayrollRecords(data || []);
            setError(null);
        }
        setIsLoading(false);
      if (!fetchError && data) {
    const uniquePeriods = Array.from(new Set(data.map(r => r.pay_period.substring(0, 7))));
    setAvailablePayPeriods(uniquePeriods.sort().reverse());
}
    }, [selectedStatus, selectedPayPeriod, employeeFilter, defaultPayPeriod, recordTypeFilter, isAdmin, adminSelectedEmployerId, currentProfile]);

const fetchEmailLogs = useCallback(async (period?: string) => {
    if (!currentProfile?.id) return;
    setLoadingLogs(true);
    const payPeriodToFetch = period || selectedPayPeriod || defaultPayPeriod;

    const { data, error } = await supabase
      .from('payroll_email_log')
      .select('*')
      .eq('employer_id', currentProfile.id)
      .eq('pay_period', payPeriodToFetch)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Kunde inte hämta e-postloggen.");
      console.error("Error fetching email logs:", error);
    } else {
      setEmailLogs(data || []);
    }
    setLoadingLogs(false);
  }, [currentProfile?.id, selectedPayPeriod, defaultPayPeriod]);

    useEffect(() => {
        if(currentProfile?.id) {
            if (isAdmin && allEmployers.length === 0 && !adminSelectedEmployerId) return;
            loadPayrollData();
          fetchEmailLogs();
        }
    }, [selectedPayPeriod, selectedStatus, employeeFilter, fetchEmailLogs, loadPayrollData, currentProfile?.id, isAdmin, adminSelectedEmployerId, allEmployers.length]);
    
    const handleApplyFiltersClick = () => {
        if (isAdmin && !adminSelectedEmployerId && allEmployers.length > 0) {
            if (!window.confirm("Varning: Hämtning av löneunderlag för alla arbetsgivare kan ta tid. Fortsätta?")) return;
        }
        setSelectedRecordIds(new Set());
        loadPayrollData();
    };

    const requestSort = (key: keyof PayrollExportData) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof PayrollExportData) => {
        if (sortConfig.key !== key) return <ListFilter size={14} className="ml-1 text-gray-400 opacity-50" />;
        return sortConfig.direction === 'ascending' ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />;
    };

    const sortedRecords = useMemo(() => {
        let sortableItems = [...payrollRecords];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key!]; const bValue = b[sortConfig.key!];
                if (aValue == null && bValue == null) return 0;
                if (aValue == null) return 1;
                if (bValue == null) return -1;
                if (typeof aValue === 'string' && typeof bValue === 'string') return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                if (typeof aValue === 'number' && typeof bValue === 'number') return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
                const strA = String(aValue); const strB = String(bValue);
                return sortConfig.direction === 'ascending' ? strA.localeCompare(strB) : strB.localeCompare(strA);
            });
        }
        return sortableItems;
    }, [payrollRecords, sortConfig]);

    const handleToggleSelectRecord = (recordId: string) => {
        setSelectedRecordIds(prev => { const newSet = new Set(prev); if (newSet.has(recordId)) newSet.delete(recordId); else newSet.add(recordId); return newSet; });
    };

    const handleToggleSelectAllVisible = () => {
        const allVisibleIds = new Set(sortedRecords.map(r => r.id));
        const allCurrentlySelected = sortedRecords.length > 0 && sortedRecords.every(r => selectedRecordIds.has(r.id));
        if (allCurrentlySelected) setSelectedRecordIds(new Set()); else setSelectedRecordIds(allVisibleIds);
    };
    
    const selectedPendingCount = useMemo(() => sortedRecords.filter(r => selectedRecordIds.has(r.id) && r.status === 'pending').length, [selectedRecordIds, sortedRecords]);
    const selectedProcessedCount = useMemo(() => sortedRecords.filter(r => selectedRecordIds.has(r.id) && r.status === 'processed').length, [selectedRecordIds, sortedRecords]);
    const selectedPaidCount = useMemo(() => sortedRecords.filter(r => selectedRecordIds.has(r.id) && r.status === 'paid').length, [selectedRecordIds, sortedRecords]);
    
const handleBulkRevertStatus = async () => {
    let fromStatus: PayrollStatus | null = null;

    if (selectedPaidCount > 0 && selectedProcessedCount === 0 && selectedPendingCount === 0) {
        fromStatus = 'paid';
    } else if (selectedProcessedCount > 0 && selectedPaidCount === 0 && selectedPendingCount === 0) {
        fromStatus = 'processed';
    } else {
        toast.error("Du kan endast återställa poster som alla har status 'Betald' ELLER 'Bearbetad'.");
        return;
    }

    const idsToRevert = sortedRecords.filter(r => selectedRecordIds.has(r.id) && r.status === fromStatus).map(r => r.id);
    const toStatus = fromStatus === 'paid' ? 'processed' : 'pending';

    if (idsToRevert.length === 0) {
        toast.error("Inga valda poster att återställa.");
        return;
    }

    if (!window.confirm(`Är du säker på att du vill återställa ${idsToRevert.length} post(er) från '${fromStatus}' till '${toStatus}'?`)) {
        return;
    }

    const toastId = toast.loading(`Återställer ${idsToRevert.length} post(er)...`);

    // Call the single, unified RPC function for all reverts
    const { error } = await supabase.rpc('revert_payroll_status', {
        p_record_ids: idsToRevert,
        p_record_type: recordTypeFilter,
        p_from_status: fromStatus
    });

    if (error) {
        toast.error(error.message, { id: toastId });
    } else {
        toast.success(`${idsToRevert.length} post(er) har återställts.`, { id: toastId });
        setSelectedRecordIds(new Set());
        loadPayrollData(); // Refresh the data grid
    }
};

    const handleBulkUpdateStatus = async (newStatus: 'paid', idsToUpdate: string[]) => {
        if (idsToUpdate.length === 0) {
            toast(`Inga poster att markera som '${newStatus}'.`);
            return;
        }

        const toastId = toast.loading(`Markerar ${idsToUpdate.length} post(er) som ${newStatus}...`);
        const result = await updatePayrollStatus(idsToUpdate, newStatus, recordTypeFilter);

        if (result.error) {
            toast.error(typeof result.error === 'string' ? result.error : 'Okänt fel.', { id: toastId });
        } else {
            toast.success(`${result.successCount || idsToUpdate.length} post(er) markerade som ${newStatus}.`, { id: toastId });
            setSelectedRecordIds(new Set());
            loadPayrollData();
        }
    };
    
    const periodSummary = useMemo(() => {
        return sortedRecords.reduce((acc, record) => {
            const hours = record.hours_worked || 0; const rate = record.hourly_rate || 0;
            if (record.record_type === 'shift') { acc.totalBasePay += hours * rate; acc.totalHours += hours; acc.totalOBPremium += record.total_ob_premium || 0; } 
            else if (record.record_type === 'posting') { acc.totalBasePay += record.agreed_compensation || 0; }
            acc.totalAdjustments += record.net_adjustments || 0; acc.totalGrossPay += record.total_pay || 0; acc.recordCount += 1;
            return acc;
        }, { totalHours: 0, totalBasePay: 0, totalOBPremium: 0, totalAdjustments: 0, totalGrossPay: 0, recordCount: 0 });
    }, [sortedRecords]);
    
    const handleViewItemDetails = useCallback(async (record: PayrollExportData) => {
        if (!record.record_type) { toast.error("Typ av post saknas."); return; }
        const itemId = record.record_type === 'shift' ? record.shift_id : record.job_posting_id;
        if (!itemId) { toast.error(`${record.record_type === 'shift' ? 'Skift' : 'Annons'}-ID saknas.`); return; }
        setIsLoadingItemDetails(true);
        try {
            const table = record.record_type === 'shift' ? 'shift_needs' : 'job_postings';
            const { data, error } = await supabase.from(table).select(`*, employer:employer_id (full_name, pharmacy_name)`).eq('id', itemId).maybeSingle();
            if (error) throw error; if (!data) throw new Error(`Detaljer hittades inte.`);
            setDetailedItemData(data); setShowItemDetailsModal(true);
        } catch (err: any) { toast.error(err.message || "Kunde inte ladda detaljer."); } 
        finally { setIsLoadingItemDetails(false); }
    }, []);

    const handleClearFilters = () => { setSelectedPayPeriod(defaultPayPeriod); setSelectedStatus('pending'); setEmployeeFilter(''); if(isAdmin) setAdminSelectedEmployerId(''); setSelectedRecordIds(new Set()); };

  const uniqueEmployeeInSelection = useMemo(() => {
    if (selectedRecordIds.size === 0) return null;

    const selectedRecords = sortedRecords.filter(r => selectedRecordIds.has(r.id));
    if (selectedRecords.length === 0) return null;

    const firstEmployeeId = selectedRecords[0].user_id;
    for (let i = 1; i < selectedRecords.length; i++) {
        if (selectedRecords[i].user_id !== firstEmployeeId) {
            return null; // Found records for multiple employees
        }
    }
    return { userId: firstEmployeeId }; // All selected records belong to one employee
}, [selectedRecordIds, sortedRecords]);
    
    const uniqueEmployeeInFilteredResults = useMemo(() => {
        if (!employeeFilter.trim() || sortedRecords.length === 0) return null;
        const employeeId = sortedRecords[0].user_id; const employeeName = sortedRecords[0].employeeName;
        for (let i = 1; i < sortedRecords.length; i++) { if (sortedRecords[i].user_id !== employeeId) return null; }
        return { userId: employeeId, name: employeeName ?? 'Okänd Anställd' };
    }, [sortedRecords, employeeFilter]);
    
    const handleOpenConsolidatedSummary = useCallback(async () => {
        if (!uniqueEmployeeInFilteredResults || !selectedPayPeriod) {
            toast.error("Vänligen filtrera på en enskild anställd och välj en löneperiod.");
            return;
        }
        const { userId, name } = uniqueEmployeeInFilteredResults;
        const payPeriodYYYYMM = selectedPayPeriod;
        setIsLoadingConsolidated(true);
        const employeeItemsForPeriod = sortedRecords.filter(rec => rec.user_id === userId && rec.pay_period.startsWith(payPeriodYYYYMM));
        const summary = employeeItemsForPeriod.reduce((acc, rec) => {
            const baseForItem = (rec.record_type === 'shift' ? (rec.hours_worked || 0) * (rec.hourly_rate || 0) : (rec.agreed_compensation || 0));
            const obForItem = rec.total_ob_premium ?? 0;
            acc.totalHours += rec.hours_worked || 0;
            acc.totalBasePay += baseForItem;
            acc.totalOB += obForItem;
            acc.totalAdjustments += rec.net_adjustments ?? 0;
            acc.grandTotal += rec.total_pay ?? 0;
            if (rec.ob_details) {
                acc.totalOB50Hours += rec.ob_details.ob_50_hours || 0;
                acc.totalOB75Hours += rec.ob_details.ob_75_hours || 0;
                acc.totalOB100Hours += rec.ob_details.ob_100_hours || 0;
            }
            acc.items.push({
                payrollRecordId: rec.id,
                itemId: rec.record_type === 'shift' ? rec.shift_id : rec.job_posting_id,
                itemDate: rec.record_type === 'shift' ? rec.shiftDate : rec.posting_period_start_date,
                itemTitle: rec.record_type === 'shift' ? rec.shiftTitle : rec.posting_title,
                hoursWorked: rec.hours_worked,
                basePayForItem,
                obPremiumForItem: obForItem,
                netAdjustmentsOnItem: rec.net_adjustments ?? 0,
                totalPayForItem: rec.total_pay ?? 0,
                itemType: rec.record_type!,
            });
            return acc;
        }, { 
            totalHours: 0, totalBasePay: 0, totalOB: 0, totalAdjustments: 0, grandTotal: 0, 
            items: [] as ConsolidatedItemDetail[], 
            totalOB50Hours: 0, totalOB75Hours: 0, totalOB100Hours: 0 
        });
        const summaryData: ConsolidatedPayrollSummary = {
            employeeUserId: userId, employeeName: name, payPeriod: payPeriodYYYYMM,
            individualItems: summary.items, totalHoursFromItems: summary.totalHours,
            totalBasePayFromItems: summary.totalBasePay, totalOBPremiumFromItems: summary.totalOB,
            obDetails: { ob_50_hours: summary.totalOB50Hours, ob_75_hours: summary.totalOB75Hours, ob_100_hours: summary.totalOB100Hours },
            totalNetAdjustmentsFromItems: summary.totalAdjustments,
            subTotalPayFromItems: summary.grandTotal, grandTotalPay: summary.grandTotal,
            periodLevelAdjustments: [], totalPeriodLevelAdjustments: 0,
        };
        setConsolidatedData(summaryData);
        setShowConsolidatedModal(true);
        setIsLoadingConsolidated(false);
    }, [uniqueEmployeeInFilteredResults, selectedPayPeriod, sortedRecords]);

    const handleSaveConsolidatedAdjustments = useCallback(async (employeeUserId: string, payPeriodYYYYMM: string, adjustmentsToSave: PeriodLevelAdjustmentUI[]): Promise<boolean> => {
        const effectiveEmployerId = isAdmin ? adminSelectedEmployerId : currentProfile?.id;
        if (!effectiveEmployerId && adjustmentsToSave.length > 0) { toast.error("Kan inte spara justeringar."); return false; }
        toast.loading("Sparar...");
        toast.success("Sparat!");
        return true;
    }, [isAdmin, adminSelectedEmployerId, currentProfile?.id]);

    return (
        <div className="space-y-6">
            <div className="p-3 sm:p-4 md:p-6 bg-white rounded-xl border shadow-lg">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-5">Filter & Åtgärder för {recordTypeFilter === 'shift' ? 'Pass' : 'Uppdrag'}</h2>
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-x-6 gap-y-4 items-end`}>
                    <div>
    <label htmlFor="payPeriodFilterEmp" className="form-label">Löneperiod</label>
    <select 
        id="payPeriodFilterEmp" 
        value={selectedPayPeriod} 
        onChange={(e) => setSelectedPayPeriod(e.target.value)} 
        className="form-select"
    >
        <option value="">Alla perioder</option>
        {availablePayPeriods.map(period => (
            <option key={period} value={period}>
                {capitalizeFirstLetter(format(parseISO(`${period}-01`), 'MMMM yyyy', { locale: sv }))}
            </option>
        ))}
    </select>
</div>
                    <div><label htmlFor="statusFilterEmp" className="form-label">Status</label><select id="statusFilterEmp" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as PayrollStatus | '')} className="form-select"><option value="">Alla</option><option value="pending">Väntande</option><option value="processed">Bearbetad</option><option value="paid">Betald</option></select></div>
                    <div><label htmlFor="employeeFilterEmp" className="form-label">Anställd</label><input type="text" id="employeeFilterEmp" placeholder="Filtrera på anställd..." value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="form-input"/></div>
                    {isAdmin && <div><label htmlFor="adminEmployerFilter" className="form-label"><Building2 size={14} className="inline mr-1"/>Välj Arbetsgivare</label><select id="adminEmployerFilter" value={adminSelectedEmployerId} onChange={(e) => setAdminSelectedEmployerId(e.target.value)} className="form-select" disabled={allEmployers.length === 0 && !isLoading}><option value="">{allEmployers.length > 0 || isLoading ? "Alla Arbetsgivare" : "Laddar..."}</option>{allEmployers.map(emp => <option key={emp.id} value={emp.id}>{emp.display_name}</option>)}</select></div>}
                </div>
                <div className="mt-6 pt-5 border-t flex flex-wrap gap-3 items-center">
                    <button onClick={handleApplyFiltersClick} disabled={isLoading} className="btn btn-primary btn-sm"><Filter size={14} className="mr-1.5"/>Verkställ Filter</button>
                    <button onClick={handleClearFilters} disabled={isLoading} className="btn btn-outline btn-sm"><XCircle size={14} className="mr-1.5"/>Rensa</button>
                  <button
    onClick={handleBulkRevertStatus}
    disabled={
        isLoading ||
        !((selectedPaidCount > 0 && selectedProcessedCount === 0 && selectedPendingCount === 0) ||
        (selectedProcessedCount > 0 && selectedPaidCount === 0 && selectedPendingCount === 0))
    }
    className="btn btn-danger-outline btn-sm"
    title="Återställ status för valda poster"
>
    <Undo2 size={14} className="mr-1.5" />
    Återställ ({selectedPaidCount + selectedProcessedCount})
</button>
                    <div className="flex-grow"></div>

                  <button
        onClick={handleShowPaymentInfo}
        disabled={isLoading || !uniqueEmployeeInSelection} 
        className="btn btn-secondary btn-sm"
        title="Visa betalningsinformation för vald anställd"
    >
        <Wallet size={14} className="mr-1.5" />
        Betalningsinfo
    </button>
                    <button 
                        onClick={handleSendToPayrollOffice} 
                        disabled={isLoading || sortedRecords.length === 0} 
                        className="btn btn-primary-outline btn-sm"
                        title="Generera rapport och skicka som e-post"
                    >
                        <Send size={14} className="mr-1.5"/>Skicka till Lönekontoret
                    </button>
                    <button onClick={handleExportCSV} disabled={isLoading || sortedRecords.length === 0} className="btn btn-secondary btn-sm"><Download size={14} className="mr-1.5"/>CSV</button>
                   <button onClick={handleGeneratePayslipsPDF} disabled={isLoading || selectedProcessedCount === 0} className="btn btn-secondary btn-sm" title="Ladda ner bearbetade lönebesked som PDF">
    <FileText size={14} className="mr-1.5"/>Lönebesked ({selectedProcessedCount})
</button>
                        <button 
        onClick={handleOpenProcessModal} // <-- CHANGE THIS
        disabled={isLoading || selectedPendingCount === 0} 
        className="btn btn-success-outline btn-sm"
    >
        <CheckCircle size={14} className="mr-1.5" />
        Bearbeta ({selectedPendingCount})
    </button>
                    <button
  onClick={handleOpenPayModal} // <-- CHANGE THIS
  disabled={isLoading || selectedProcessedCount === 0}
  className="btn btn-success btn-sm">
    <DollarSign size={14} className="mr-1.5" />
    Betala ({selectedProcessedCount})
</button>
                </div>
            </div>

            {uniqueEmployeeInFilteredResults && <div className="mt-4 p-3 bg-sky-50 rounded-lg border flex items-center justify-between shadow"><p className="text-sm text-sky-800">Filtrerat för: <strong className="font-semibold">{uniqueEmployeeInFilteredResults.name}</strong> i <strong className="font-medium">{formatDateSafe(selectedPayPeriod, 'MMMM yy', sv)}</strong></p><button onClick={handleOpenConsolidatedSummary} className="btn btn-primary-outline btn-sm" disabled={isLoadingConsolidated || isLoading}><Briefcase size={14} className="mr-1.5" />Visa Konsoliderad Översikt</button></div>}
            
            {!isLoading && !error && !uniqueEmployeeInFilteredResults && <div className="p-4 bg-indigo-50 rounded-lg border"><h3 className="text-lg font-semibold text-indigo-800 mb-2">Summering för {formatDateSafe(selectedPayPeriod, 'MMMM yy', sv)}</h3><div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm"><p><span className="font-medium">Timmar:</span> {periodSummary.totalHours.toFixed(2)}</p><p><span className="font-medium">Grundlön:</span> {periodSummary.totalBasePay.toFixed(2)} SEK</p><p><span className="font-medium">OB:</span> {periodSummary.totalOBPremium.toFixed(2)} SEK</p><p><span className="font-medium">Just:</span> {periodSummary.totalAdjustments.toFixed(2)} SEK</p><p className="font-semibold text-base"><span className="font-medium">Totalt:</span> {periodSummary.totalGrossPay.toFixed(2)} SEK</p></div></div>}

                {/* NEW: Email Log Section */}
      <div className="p-3 sm:p-4 md:p-6 bg-white rounded-xl border shadow-lg">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Skickade Lönerapporter</h2>
        {loadingLogs ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Laddar logg...</span>
          </div>
        ) : (
          <PayrollEmailLog logs={emailLogs} />
        )}
      </div>
            
            {isLoading && <div className='text-center p-10'><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary-600"/><p className="mt-2">Laddar...</p></div>}
            {error && <div className="text-red-700 bg-red-100 p-4 rounded-md border my-4">Fel: {error}</div>}

            {!isLoading && !error && (
                <div className="overflow-x-auto shadow-xl border sm:rounded-lg bg-white mt-6">
                    <table className="min-w-full divide-y">
                        <thead className="bg-gray-100 whitespace-nowrap">
                            <tr>
                                <th className="th-class"><input type="checkbox" className="form-checkbox" onChange={handleToggleSelectAllVisible} checked={sortedRecords.length > 0 && sortedRecords.every(r => selectedRecordIds.has(r.id))} ref={input => { if (input) { input.indeterminate = sortedRecords.some(r => selectedRecordIds.has(r.id)) && !sortedRecords.every(r => selectedRecordIds.has(r.id)); }}}/></th>
                                {([ { label: 'Anställd', key: 'employeeName' }, { label: 'Period', key: 'pay_period' }, { label: 'Datum', key: 'shiftDate' }, { label: 'Titel', key: 'shiftTitle' }, { label: 'Timmar', key: 'hours_worked', n: 1 }, { label: 'Grundlön/Ers.', key: 'hourly_rate', n: 1 }, { label: 'Grundlön', n: 1 }, { label: 'OB Prem.', key: 'total_ob_premium', n: 1 }, { label: 'Netto Just.', key: 'net_adjustments', n: 1 }, { label: 'Total Lön', key: 'total_pay', n: 1 }, { label: 'Status', key: 'status' }, { label: 'Åtgärder', n: 1, s: 0 } ] as Array<{ label: string; key?: keyof PayrollExportData; n?: number; s?: number }>).map(h => (
                                    <th key={h.label} className={`th-class ${h.n ? 'text-right' : 'text-left'} ${h.s !== 0 ? 'cursor-pointer' : ''}`} onClick={() => h.key && h.s !== 0 && requestSort(h.key as keyof PayrollExportData)}><div className={`flex items-center ${h.n ? 'justify-end' : 'justify-start'}`}>{h.label}{h.s !== 0 && getSortIcon(h.key!)}</div></th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y">
                            {sortedRecords.length === 0 ? (
                                <tr><td colSpan={13} className="px-6 py-12 text-center text-gray-500 italic">Inga löneunderlag hittades.</td></tr>
                            ) : (
                                sortedRecords.map((record) => {
                                    const basePay = record.record_type === 'shift' ? (record.hours_worked || 0) * (record.hourly_rate || 0) : record.agreed_compensation || 0;
                                    const itemDate = record.record_type === 'shift' ? record.shiftDate : record.posting_period_start_date;
                                    const itemTitle = record.record_type === 'shift' ? record.shiftTitle : record.posting_title;
                                    return (
                                    <tr key={record.id} className={`hover:bg-slate-50 ${selectedRecordIds.has(record.id) ? 'bg-blue-50' : ''}`}>
                                        <td className="td-class"><input type="checkbox" className="form-checkbox" checked={selectedRecordIds.has(record.id)} onChange={() => handleToggleSelectRecord(record.id)}/></td>
                                        <td className="td-class font-medium">{record.employeeName}</td>
                                        <td className="td-class">{formatDateSafe(record.pay_period, 'MMMM yy', sv)}</td>
                                        <td className="td-class">{formatDateSafe(itemDate, 'MMM dd, yy', sv)}</td>
                                        <td className="td-class max-w-xs truncate"><button onClick={() => handleViewItemDetails(record)} className="text-blue-600 hover:underline">{itemTitle}</button></td>
                                        <td className="td-class text-right">{record.hours_worked?.toFixed(2)}<OBDetailsTooltip details={record.ob_details}/></td>
                                        <td className="td-class text-right">{record.record_type === 'shift' ? record.hourly_rate?.toFixed(2) : record.agreed_compensation?.toFixed(2)}</td>
                                        <td className="td-class text-right">{basePay.toFixed(2)}</td>
                                        <td className="td-class text-right">{record.total_ob_premium?.toFixed(2)}</td>
                                        <td className="td-class text-right">{record.net_adjustments?.toFixed(2)}</td>
                                        <td className="td-class font-semibold text-right">{record.total_pay?.toFixed(2)}</td>
                                        <td className="td-class"><span className={`status-badge capitalize status-${record.status}`}>{record.status}</span></td>
                                       <td className="td-class text-right">
    <button onClick={() => handleOpenAdjustmentsModal(record)} className="text-indigo-600 hover:underline">Korrigera</button>
                                         {record.status === 'pending' && (
        <button onClick={() => handlePreviewPayslip(record)} className="text-blue-600 hover:underline ml-4">
            Förhandsgranska
        </button>
    )}
</td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

          {showPayModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-5 border-b">
                <h3 className="text-lg font-medium">Bekräfta betalning</h3>
                <p className="text-sm text-gray-600 mt-1">
                    Du är på väg att markera {recordsToPay.length} post(er) som betalda.
                </p>
            </div>
            <div className="p-5">
                <p className="text-sm font-semibold mb-3">Slutför betalningen så här:</p>
                <div className="space-y-2 text-sm text-gray-700">
                    <p>1. Exportera en CSV- eller PDF-rapport för ditt underlag.</p>
                    <p>2. Använd rapporten för att genomföra betalningen via din bank eller löneleverantör.</p>
                    <p>3. När betalningen är genomförd, klicka på "Markera som betald" nedan för att uppdatera status.</p>
                </div>
            </div>
            <div className="flex justify-end p-4 bg-gray-50 border-t space-x-2">
                <button onClick={() => setShowPayModal(false)} className="btn btn-outline">Avbryt</button>
                <button
                    onClick={() => {
                        const idsToPay = recordsToPay.map(r => r.id);
                        handleBulkUpdateStatus('paid', idsToPay);
                        setShowPayModal(false);
                    }}
                    className="btn btn-success"
                >
                    Markera som betald
                </button>
            </div>
        </div>
    </div>
)}

          {showPaymentInfoModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-medium">Betalningsinformation</h3>
                <button onClick={() => setShowPaymentInfoModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            {isLoadingPaymentInfo ? (
                <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
            ) : paymentInfo ? (
                <div className="p-5 space-y-3">
                    <div className="text-sm"><span className="font-semibold">Bank:</span> {paymentInfo.bank_name || 'Ej angivet'}</div>
                    <div className="text-sm"><span className="font-semibold">Clearingnummer:</span> {paymentInfo.clearing_number || 'Ej angivet'}</div>
                    <div className="text-sm"><span className="font-semibold">Kontonummer:</span> {paymentInfo.account_number || 'Ej angivet'}</div>
                    <hr className="my-3"/>
                    <div className="text-sm"><span className="font-semibold">Adress:</span> {paymentInfo.address || 'Ej angivet'}</div>
                    <div className="text-sm"><span className="font-semibold">Postnummer:</span> {paymentInfo.postal_code || 'Ej angivet'}</div>
                    <div className="text-sm"><span className="font-semibold">Stad:</span> {paymentInfo.city || 'Ej angivet'}</div>
                </div>
            ) : (
                <div className="p-10 text-center text-sm text-gray-500">Ingen information hittades. Den anställde kan behöva fylla i sina uppgifter.</div>
            )}
            <div className="p-3 bg-gray-50 border-t text-right">
                <button onClick={() => setShowPaymentInfoModal(false)} className="btn btn-secondary btn-sm">Stäng</button>
            </div>
        </div>
    </div>
)}

          {showProcessModal && (
    <ProcessPayrollModal
        isOpen={showProcessModal}
        onClose={(processed) => {
            setShowProcessModal(false);
            if (processed) {
                setSelectedRecordIds(new Set()); // Clear selection
                loadPayrollData(); // Refresh the data grid
            }
        }}
        recordsToProcess={recordsToProcess}
        recordType={recordTypeFilter} // Pass down the record type
    />
)}
            
         {showAdjustmentsModal && recordToAdjust && 
    <PayrollAdjustmentsModal 
        payrollRecord={recordToAdjust} 
        // Pass the function directly
        onClose={handleCloseAdjustmentsModal} 
        currentRecordType={recordTypeFilter}
    />
}
            
            {isLoadingItemDetails && <div className="fixed inset-0 bg-black bg-opacity-30 z-[80] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-white"/></div>}
            {showItemDetailsModal && detailedItemData && ('date' in detailedItemData ? 
                <ShiftDetailsModal shift={detailedItemData as ShiftNeed} onClose={() => setShowItemDetailsModal(false)} currentUserRole={currentProfile?.role} onUpdate={loadPayrollData}/> :
                <PostingDetailsModal posting={detailedItemData as JobPosting} currentUserRole={currentProfile?.role || 'anonymous'} onClose={() => setShowItemDetailsModal(false)} onViewEmployerProfile={()=>{}} onUpdate={loadPayrollData} hasApplied={false} canApplyInfo={{canApply: false}}/>
            )}
            
            {showConsolidatedModal && consolidatedData && <ConsolidatedPayrollModal isOpen={showConsolidatedModal} onClose={() => setShowConsolidatedModal(false)} initialSummaryData={consolidatedData} onSavePeriodAdjustments={handleSaveConsolidatedAdjustments} currentUserRole={currentProfile?.role}/>}
        </div>
    );
};

const PayrollPage: React.FC = () => {
    const { profile, loading: authLoading } = useAuth();
    const userRole = profile?.role as UserRole | undefined;
    const [activeEmployerTab, setActiveEmployerTab] = useState<'payroll' | 'postings'>('payroll');

    if (authLoading) return <div className='fixed inset-0 flex items-center justify-center'><Loader2 className="h-12 w-12 animate-spin text-primary-600"/></div>;
    if (!profile) return <div className="p-6 text-center text-red-700"><XCircle size={56} className="mx-auto mb-4" /><h1>Åtkomst Nekad</h1></div>;

    const canViewEmployerPayroll = userRole && (userRole === 'employer' || userRole === 'admin');

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen">
            <header className="mb-8 max-w-7xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800">{canViewEmployerPayroll ? "Lönehantering" : "Min Lön"}</h1>
                <p className="text-slate-600 mt-1.5 text-lg">{canViewEmployerPayroll ? "Hantera löneunderlag för både pass och slutförda uppdrag." : "Se din personliga lönehistorik."}</p>
            </header>
            <main className="max-w-7xl mx-auto">
                {canViewEmployerPayroll ? (
                    <>
                        <div className="mb-6 border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                <button onClick={() => setActiveEmployerTab('payroll')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm sm:text-base ${activeEmployerTab === 'payroll' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Löner för Pass</button>
                                <button onClick={() => setActiveEmployerTab('postings')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm sm:text-base ${activeEmployerTab === 'postings' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Löner för Uppdrag</button>
                            </nav>
                        </div>
                        {activeEmployerTab === 'payroll' && <EmployerPayrollView recordTypeFilter="shift" />}
                        {activeEmployerTab === 'postings' && <EmployerPayrollView recordTypeFilter="posting" />}
                    </>
                ) : (
                    <EmployeeSpecificPayrollView />
                )}
            </main>
            <style jsx global>{`
                .form-label { @apply block text-xs sm:text-sm font-medium text-gray-700 mb-1; }
                .form-input, .form-select { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm; }
                .form-checkbox { @apply h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500; }
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50; }
                .btn-sm { @apply px-3 py-1.5 text-sm; }
                .btn-primary { @apply border-transparent text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500; }
                .btn-primary-outline { @apply border-primary-500 text-primary-600 bg-white hover:bg-primary-50 focus:ring-primary-500; }
                .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
                .btn-outline { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50; }
                .btn-success { @apply border-transparent text-white bg-green-600 hover:bg-green-700 focus:ring-green-500; }
                .btn-success-outline { @apply border-green-500 text-green-600 bg-white hover:bg-green-50 focus:ring-green-500; }
                .btn-danger-outline { @apply border-red-500 text-red-600 bg-white hover:bg-red-50 focus:ring-red-500; }
                .th-class { @apply px-2 sm:px-4 py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider; }
                .td-class { @apply px-2 sm:px-4 py-3.5 text-sm text-gray-600; }
                .status-badge { @apply inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border; }
                .status-paid { @apply bg-green-100 text-green-800 border-green-300; }
                .status-processed { @apply bg-yellow-100 text-yellow-800 border-yellow-300; }
                .status-pending { @apply bg-blue-100 text-blue-800 border-blue-300; }
            `}</style>
        </div>
    );
}
export default PayrollPage;
