// src/lib/payroll.ts
import { supabase } from './supabase';
import type { PayrollRecord as PayrollRecordFromTypes, PayrollStatus, UserProfile, ShiftNeed, JobPosting } from '../types';

export interface PayrollAdjustment {
    reason: string;
    amount: number;
}

export interface PeriodLevelAdjustment {
    id?: string;
    tempId?: string;
    reason: string;
    amount: number;
}

export interface PeriodLevelAdjustmentDB extends PeriodLevelAdjustment {
    id: string;
    employee_user_id: string;
    pay_period: string;
    created_at: string;
    created_by_employer_id: string;
    updated_at?: string;
}

export interface PayrollExportData {
    id: string;
    user_id: string;
    pay_period: string;
    status: PayrollStatus;
    total_pay: number | null;
    adjustments: PayrollAdjustment[] | null;
    net_adjustments: number | null;
    created_at: string;
    processed_at?: string | null;
    record_type: 'shift' | 'posting';
    employeeName: string | null;
    employeeEmail?: string | null;
    employer_id?: string | null;
    employer_name?: string | null;
    shift_id?: string | null;
    shiftDate?: string | null;
    shiftTitle?: string | null;
    hours_worked?: number | null;
    hourly_rate?: number | null;
    total_ob_premium?: number | null;
    ob_details?: any | null;
    job_posting_id?: string | null;
    posting_title?: string | null;
    posting_period_start_date?: string | null;
    posting_period_end_date?: string | null;
    agreed_compensation?: number | null;
}

export async function fetchEmployeePeriodAdjustments(
    employeeUserId: string,
    payPeriodYYYYMM: string
): Promise<{ data: PeriodLevelAdjustmentDB[] | null; error: any | null }> {
    if (!employeeUserId || !payPeriodYYYYMM) {
        return { data: null, error: { message: "Employee ID and Pay Period (YYYY-MM) are required." } };
    }
    try {
        const { data, error } = await supabase
            .from('employee_period_adjustments')
            .select('*')
            .eq('employee_user_id', employeeUserId)
            .eq('pay_period', payPeriodYYYYMM)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return { data: data as PeriodLevelAdjustmentDB[], error: null };
    } catch (error) {
        return { data: null, error: error instanceof Error ? error : { message: 'An unexpected error occurred.' } };
    }
}

export async function saveEmployeePeriodAdjustments(
    employeeUserId: string,
    payPeriodYYYYMM: string,
    uiAdjustments: PeriodLevelAdjustment[],
    employerId: string
): Promise<{ data: PeriodLevelAdjustmentDB[] | null; error: any | null }> {
    if (!employeeUserId || !payPeriodYYYYMM || !employerId) {
        return { data: null, error: { message: "Employee ID, Pay Period (YYYY-MM), and Employer ID are required." } };
    }
    try {
        const { data: existingDbAdjustments, error: fetchError } = await fetchEmployeePeriodAdjustments(employeeUserId, payPeriodYYYYMM);
        if (fetchError) throw fetchError;

        const dbAdjustmentsMap = new Map((existingDbAdjustments || []).map(adj => [adj.id, adj]));
        const uiAdjustmentsWithIdsMap = new Map(uiAdjustments.filter(adj => adj.id).map(adj => [adj.id!, adj]));
        const idsToDelete: string[] = (existingDbAdjustments || []).filter(dbAdj => !uiAdjustmentsWithIdsMap.has(dbAdj.id)).map(adj => adj.id);

        if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabase.from('employee_period_adjustments').delete().in('id', idsToDelete);
            if (deleteError) throw deleteError;
        }

        const adjustmentsToUpsert: Omit<PeriodLevelAdjustmentDB, 'created_at' | 'updated_at' | 'id'> & { id?: string }[] = [];
        for (const uiAdj of uiAdjustments) {
            const commonData = { employee_user_id: employeeUserId, pay_period: payPeriodYYYYMM, reason: uiAdj.reason, amount: uiAdj.amount, created_by_employer_id: employerId };
            if (uiAdj.id) {
                const existingInDb = dbAdjustmentsMap.get(uiAdj.id);
                if (existingInDb && (existingInDb.reason !== uiAdj.reason || existingInDb.amount !== uiAdj.amount)) {
                    adjustmentsToUpsert.push({ id: uiAdj.id, ...commonData });
                } else if (!existingInDb) {
                    adjustmentsToUpsert.push({ id: uiAdj.id, ...commonData });
                }
            } else {
                adjustmentsToUpsert.push(commonData);
            }
        }
        if (adjustmentsToUpsert.length > 0) {
            const { error: upsertError } = await supabase.from('employee_period_adjustments').upsert(adjustmentsToUpsert, { onConflict: 'id' });
            if (upsertError) throw upsertError;
        }
        const { data: finalAdjustments, error: finalFetchError } = await fetchEmployeePeriodAdjustments(employeeUserId, payPeriodYYYYMM);
        if (finalFetchError) return { data: null, error: { message: "Adjustments saved, but failed to fetch updated list." } };
        return { data: finalAdjustments, error: null };
    } catch (error) {
        return { data: null, error: error instanceof Error ? error : { message: 'An unexpected error occurred during save.' } };
    }
}

export async function fetchSinglePayrollRecord(
    recordId: string,
    recordType: 'shift' | 'posting'
): Promise<{ data: PayrollExportData | null; error: string | null }> {
    try {
        let data: any; // Use 'any' for initial Supabase response, then cast
        let error: any;

        if (recordType === 'shift') {
            const response = await supabase
                .from('payroll_records')
                .select(`
                    id, user_id, shift_id, pay_period, hours_worked, hourly_rate,
                    total_pay, status, created_at, processed_at,
                    total_ob_premium, ob_details, adjustments, net_adjustments,
                    profile:profiles!payroll_records_user_id_fkey ( full_name, email ), 
                    shift:shift_needs!payroll_records_shift_id_fkey ( 
                        date, title, location, employer_id,
                        employer:profiles!shift_needs_employer_id_fkey (full_name, pharmacy_name)
                    )
                `)
                .eq('id', recordId)
                .maybeSingle();
            data = response.data;
            error = response.error;
        } else if (recordType === 'posting') {
            const response = await supabase
                .from('posting_payroll_records')
                .select(`
                    id, employee_user_id, job_posting_id, pay_period, agreed_compensation,
                    total_pay, status, created_at, processed_at,
                    adjustments, net_adjustments, employer_id,
                    profile:profiles!posting_payroll_records_employee_user_id_fkey ( full_name, email ),
                    posting:job_postings!posting_payroll_records_job_posting_id_fkey (
                        title, period_start_date, period_end_date, location, employer_id,
                        employer_profile:profiles!job_postings_employer_id_fkey(full_name, pharmacy_name)
                    )
                `)
                .eq('id', recordId)
                .maybeSingle();
            data = response.data;
            error = response.error;
        } else {
            return { data: null, error: "Invalid record type for fetching single payroll record." };
        }

        if (error) throw error;

        let transformedData: PayrollExportData | null = null;
        if (data) {
            if (recordType === 'shift') {
                transformedData = {
                    id: data.id, user_id: data.user_id, record_type: 'shift',
                    pay_period: data.pay_period, status: data.status as PayrollStatus,
                    total_pay: data.total_pay != null ? parseFloat(data.total_pay.toFixed(2)) : null,
                    adjustments: data.adjustments, net_adjustments: data.net_adjustments,
                    created_at: data.created_at, processed_at: data.processed_at,
                    employeeName: data.profile?.full_name ?? null, employeeEmail: data.profile?.email ?? null,
                    employer_id: data.shift?.employer_id ?? null,
                    employer_name: data.shift?.employer?.pharmacy_name || data.shift?.employer?.full_name || null,
                    shift_id: data.shift_id, shiftDate: data.shift?.date ?? null, shiftTitle: data.shift?.title ?? null,
                    hours_worked: data.hours_worked != null ? parseFloat(data.hours_worked.toFixed(2)) : null,
                    hourly_rate: data.hourly_rate != null ? parseFloat(data.hourly_rate.toFixed(2)) : null,
                    total_ob_premium: data.total_ob_premium != null ? parseFloat(data.total_ob_premium.toFixed(2)) : null,
                    ob_details: data.ob_details,
                };
            } else if (recordType === 'posting') {
                transformedData = {
                    id: data.id, user_id: data.employee_user_id, record_type: 'posting',
                    pay_period: data.pay_period, status: data.status as PayrollStatus,
                    total_pay: data.total_pay != null ? parseFloat(data.total_pay.toFixed(2)) : null,
                    adjustments: data.adjustments, net_adjustments: data.net_adjustments,
                    created_at: data.created_at, processed_at: data.processed_at,
                    employeeName: data.profile?.full_name ?? null, employeeEmail: data.profile?.email ?? null,
                    employer_id: data.employer_id ?? data.posting?.employer_id ?? null, // employer_id on posting_payroll_records or via join
                    employer_name: data.posting?.employer_profile?.pharmacy_name || data.posting?.employer_profile?.full_name || null,
                    job_posting_id: data.job_posting_id, posting_title: data.posting?.title ?? null,
                    posting_period_start_date: data.posting?.period_start_date ?? null,
                    posting_period_end_date: data.posting?.period_end_date ?? null,
                    agreed_compensation: data.agreed_compensation != null ? parseFloat(data.agreed_compensation.toFixed(2)) : null,
                    // Shift specific fields are null for postings
                    shift_id: null, shiftDate: null, shiftTitle: null, hours_worked: null, hourly_rate: null,
                    total_ob_premium: null, ob_details: null,
                };
            }
        }
        return { data: transformedData, error: null };
    } catch (error) {
        console.error(`Error fetching single ${recordType} payroll record:`, error);
        const message = error instanceof Error ? error.message : `Error fetching ${recordType} record`;
        return { data: null, error: message };
    }
}


export async function updatePayrollAdjustments(
    recordId: string,
    newAdjustments: PayrollAdjustment[] | null,
    recordType: 'shift' | 'posting'
): Promise<{ success: boolean; error: string | null }> {
    try {
        const payrollTable = recordType === 'shift' ? 'payroll_records' : 'posting_payroll_records';
        
        let basePayFields = 'total_pay'; // Default
        if (recordType === 'shift') {
            basePayFields = 'hours_worked, hourly_rate, total_ob_premium';
        } else if (recordType === 'posting') {
            basePayFields = 'agreed_compensation';
        }

        const { data: record, error: fetchError } = await supabase
            .from(payrollTable)
            .select(basePayFields)
            .eq('id', recordId)
            .maybeSingle();

        if (fetchError) throw new Error(`Error fetching record for adjustment: ${fetchError.message}`);
        if (!record) throw new Error(`Payroll record ${recordId} (type: ${recordType}) not found.`);

        const netAdjustmentsValue = (newAdjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);
        
        let payBeforeAdjustments = 0;
        if (recordType === 'shift') {
            const hours = record.hours_worked || 0;
            const rate = record.hourly_rate || 0;
            const ob = record.total_ob_premium || 0;
            payBeforeAdjustments = (hours * rate) + ob;
        } else if (recordType === 'posting') {
            payBeforeAdjustments = record.agreed_compensation || 0;
        }
        
        const newTotalPay = parseFloat((payBeforeAdjustments + netAdjustmentsValue).toFixed(2));

        const { error: updateError } = await supabase
            .from(payrollTable)
            .update({
                adjustments: newAdjustments && newAdjustments.length > 0 ? newAdjustments : null,
                net_adjustments: parseFloat(netAdjustmentsValue.toFixed(2)),
                total_pay: newTotalPay
            })
            .eq('id', recordId);

        if (updateError) throw updateError;
        return { success: true, error: null };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update adjustments';
        return { success: false, error: message };
    }
}

export async function fetchPayrollDataForExport(filters: {
    payPeriod?: string; // Expects YYYY-MM-DD for the first of the month
    status?: PayrollStatus | '';
    employeeNameOrId?: string;
    recordType?: 'shift' | 'posting' | 'all';
    adminForEmployerId?: string;
}): Promise<{ data: PayrollExportData[] | null; error: string | null }> {
    try {
        const { recordType = 'all', adminForEmployerId, ...otherFilters } = filters;
        let shiftPayrollData: any[] = [];
        let postingPayrollData: any[] = [];

        // This helper function is correct and does not need to be changed.
        const applySharedFilters = (query: any, isShiftTable: boolean) => {
            if (otherFilters.payPeriod) query = query.eq('pay_period', otherFilters.payPeriod);
            if (otherFilters.status) query = query.eq('status', otherFilters.status);

            if (adminForEmployerId) {
                // Correctly filter on the foreign key relationship
                if (isShiftTable) {
                    query = query.eq('shift.employer_id', adminForEmployerId);
                } else {
                    query = query.eq('employer_id', adminForEmployerId);
                }
            }

            if (otherFilters.employeeNameOrId) {
                const s = otherFilters.employeeNameOrId;
                if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)) {
                    query = query.eq(isShiftTable ? 'user_id' : 'employee_user_id', s);
                } else {
                    query = query.ilike('profile.full_name', `%${s}%`);
                }
            }
            return query;
        };

        if (recordType === 'all' || recordType === 'shift') {
            let shiftQuery = supabase
                .from('payroll_records')
                .select(`
                    id, user_id, shift_id, pay_period, hours_worked, hourly_rate,
                    total_pay, status, created_at, processed_at,
                    total_ob_premium, ob_details, adjustments, net_adjustments,
                    profile:profiles!payroll_records_user_id_fkey ( full_name, email ),
                    shift:shift_needs!payroll_records_shift_id_fkey (
                        date, title, employer_id,
                        employer:profiles!shift_needs_employer_id_fkey (full_name, pharmacy_name)
                    )
                `);
            
            // **THE FIX**: applySharedFilters was missing from this part in my last response
            shiftQuery = applySharedFilters(shiftQuery, true);

            const { data, error } = await shiftQuery.order('pay_period', { ascending: false }).order('profile(full_name)', { ascending: true });
            if (error) throw new Error(`Shift Payroll Fetch Error: ${error.message}`);
            shiftPayrollData = data || [];
        }

        if (recordType === 'all' || recordType === 'posting') {
            let postingQuery = supabase
                .from('posting_payroll_records')
                .select(`
                    id, employee_user_id, job_posting_id, pay_period, agreed_compensation, 
                    total_pay, status, created_at, processed_at,
                    adjustments, net_adjustments, employer_id,
                    hours_worked, total_ob_premium, ob_details,
                    profile:profiles!posting_payroll_records_employee_user_id_fkey ( full_name, email ),
                    posting:job_postings!posting_payroll_records_job_posting_id_fkey (
                        title, period_start_date, period_end_date, hourly_rate, employer_id,
                        employer_profile:profiles!job_postings_employer_id_fkey(full_name, pharmacy_name)
                    )
                `);

            postingQuery = applySharedFilters(postingQuery, false);
            const { data, error } = await postingQuery.order('pay_period', { ascending: false }).order('profile(full_name)', { ascending: true });
            if (error) throw new Error(`Posting Payroll Fetch Error: ${error.message}`);
            postingPayrollData = data || [];
        }
        
        // This transformation logic is correct and remains the same
        const combinedData: PayrollExportData[] = [];
        shiftPayrollData.forEach(record => combinedData.push({
            id: record.id, user_id: record.user_id, record_type: 'shift', pay_period: record.pay_period, status: record.status, total_pay: record.total_pay,
            adjustments: record.adjustments, net_adjustments: record.net_adjustments, created_at: record.created_at, processed_at: record.processed_at,
            employeeName: record.profile?.full_name ?? null, employeeEmail: record.profile?.email ?? null, employer_id: record.shift?.employer_id ?? null,
            employer_name: record.shift?.employer?.pharmacy_name || record.shift?.employer?.full_name || null,
            shift_id: record.shift_id, shiftDate: record.shift?.date ?? null, shiftTitle: record.shift?.title ?? null,
            hours_worked: record.hours_worked, hourly_rate: record.hourly_rate, total_ob_premium: record.total_ob_premium, ob_details: record.ob_details,
        }));

        postingPayrollData.forEach(record => combinedData.push({
            id: record.id, user_id: record.employee_user_id, record_type: 'posting', pay_period: record.pay_period, status: record.status,
            total_pay: record.total_pay, adjustments: record.adjustments, net_adjustments: record.net_adjustments, created_at: record.created_at, processed_at: record.processed_at,
            employeeName: record.profile?.full_name ?? null, employeeEmail: record.profile?.email ?? null,
            employer_id: record.employer_id ?? record.posting?.employer_id ?? null, 
            employer_name: record.posting?.employer_profile?.pharmacy_name || record.posting?.employer_profile?.full_name || null,
            job_posting_id: record.job_posting_id, posting_title: record.posting?.title ?? null,
            posting_period_start_date: record.posting?.period_start_date ?? null, posting_period_end_date: record.posting?.period_end_date ?? null,
            agreed_compensation: record.agreed_compensation, hours_worked: record.hours_worked, hourly_rate: record.posting?.hourly_rate,
            total_ob_premium: record.total_ob_premium, ob_details: record.ob_details,
        }));
        
        combinedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return { data: combinedData, error: null };
    } catch (error) {
        console.error("Error fetching payroll data for export:", error);
        const message = error instanceof Error ? error.message : 'Ett fel inträffade vid hämtning av löneunderlag.';
        return { data: null, error: message };
    }
}

export async function fetchMyPayrollRecords(): Promise<{ data: PayrollExportData[] | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: "User not authenticated." };
    }

    const { data: shiftRecords, error: shiftError } = await supabase
      .from('payroll_records')
      .select(`
        id, user_id, shift_id, pay_period, hours_worked, hourly_rate, total_pay, status, created_at, processed_at, total_ob_premium, ob_details, adjustments, net_adjustments,
        shift:shift_needs!payroll_records_shift_id_fkey (title, date, employer_id, employer:profiles!shift_needs_employer_id_fkey (full_name, pharmacy_name)),
        profile:profiles!payroll_records_user_id_fkey (full_name)
      `)
      .eq('user_id', user.id);
    if (shiftError) throw new Error(`Shift payroll fetch error: ${shiftError.message}`);

    const { data: postingRecords, error: postingError } = await supabase
      .from('posting_payroll_records')
      .select(`
        id, employee_user_id, job_posting_id, pay_period, agreed_compensation, total_pay, status, created_at, processed_at, adjustments, net_adjustments, employer_id,
        posting:job_postings!posting_payroll_records_job_posting_id_fkey (title, period_start_date, employer_id, employer_profile:profiles!job_postings_employer_id_fkey(full_name, pharmacy_name)),
        profile:profiles!posting_payroll_records_employee_user_id_fkey (full_name)
      `)
      .eq('employee_user_id', user.id);
    if (postingError) throw new Error(`Posting payroll fetch error: ${postingError.message}`);

    const combinedData: PayrollExportData[] = [];

    (shiftRecords || []).forEach(r => combinedData.push({
        id: r.id, user_id: r.user_id, record_type: 'shift', pay_period: r.pay_period, status: r.status as PayrollStatus,
        total_pay: r.total_pay != null ? parseFloat(r.total_pay.toFixed(2)) : null,
        adjustments: r.adjustments, net_adjustments: r.net_adjustments, created_at: r.created_at, processed_at: r.processed_at,
        employeeName: r.profile?.full_name ?? null, employer_id: r.shift?.employer_id ?? null,
        employer_name: r.shift?.employer?.pharmacy_name || r.shift?.employer?.full_name || null,
        shift_id: r.shift_id, shiftDate: r.shift?.date ?? null, shiftTitle: r.shift?.title ?? null,
        hours_worked: r.hours_worked != null ? parseFloat(r.hours_worked.toFixed(2)) : null,
        hourly_rate: r.hourly_rate != null ? parseFloat(r.hourly_rate.toFixed(2)) : null,
        total_ob_premium: r.total_ob_premium != null ? parseFloat(r.total_ob_premium.toFixed(2)) : null,
        ob_details: r.ob_details,
    }));

    (postingRecords || []).forEach(r => combinedData.push({
        id: r.id, user_id: r.employee_user_id, record_type: 'posting', pay_period: r.pay_period, status: r.status as PayrollStatus,
        total_pay: r.total_pay != null ? parseFloat(r.total_pay.toFixed(2)) : null,
        adjustments: r.adjustments, net_adjustments: r.net_adjustments, created_at: r.created_at, processed_at: r.processed_at,
        employeeName: r.profile?.full_name ?? null,
        employer_id: r.employer_id ?? r.posting?.employer_id ?? null,
        employer_name: r.posting?.employer_profile?.pharmacy_name || r.posting?.employer_profile?.full_name || null,
        job_posting_id: r.job_posting_id, posting_title: r.posting?.title ?? null,
        posting_period_start_date: r.posting?.period_start_date ?? null,
        agreed_compensation: r.agreed_compensation != null ? parseFloat(r.agreed_compensation.toFixed(2)) : null,
        shift_id: null, shiftDate: null, shiftTitle: null, hours_worked: null, hourly_rate: null, total_ob_premium: null, ob_details: null,
    }));
    
    combinedData.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { data: combinedData, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching your payroll data';
    return { data: null, error: message };
  }
}


export function generatePayrollCSV(data: PayrollExportData[]): string {
  if (!data || data.length === 0) return '';
  const headers = [
    'Record ID', 'Record Type', 'Employee Name', 'Employee ID', 'Email', 'Pay Period',
    'Item Date', 'Item Title', 
    'Employer Name', 'Employer ID',
    'Hours Worked', 'Base Hourly Rate', 'Agreed Compensation (Postings)',
    'Total OB Premium', 'OB Details (JSON)', 'Net Adjustments', 'Adjustment Details (JSON)',
    'Total Pay', 'Status', 'Processed At'
  ];
  const csvRows = [
    headers.join(','),
    ...data.map(row => {
        const itemDate = row.record_type === 'shift' ? row.shiftDate : row.posting_period_start_date;
        const itemTitle = row.record_type === 'shift' ? row.shiftTitle : row.posting_title;
        return [
            `"${row.id}"`, `"${row.record_type}"`, `"${(row.employeeName || '').replace(/"/g, '""')}"`, `"${row.user_id}"`,
            `"${(row.employeeEmail || '').replace(/"/g, '""')}"`, row.pay_period,
            itemDate ?? '', `"${(itemTitle || '').replace(/"/g, '""')}"`,
            `"${(row.employer_name || '').replace(/"/g, '""')}"`, `"${row.employer_id || ''}"`,
            row.hours_worked?.toFixed(2) ?? '0.00',
            row.record_type === 'shift' ? (row.hourly_rate?.toFixed(2) ?? '0.00') : '',
            row.record_type === 'posting' ? (row.agreed_compensation?.toFixed(2) ?? '0.00') : '',
            row.total_ob_premium?.toFixed(2) ?? '0.00',
            `"${JSON.stringify(row.ob_details || {}).replace(/"/g, '""')}"`,
            row.net_adjustments?.toFixed(2) ?? '0.00',
            `"${JSON.stringify(row.adjustments || {}).replace(/"/g, '""')}"`,
            row.total_pay?.toFixed(2) ?? '0.00',
            row.status,
            row.processed_at ?? ''
        ].join(',');
    })
  ];
  const BOM = "\uFEFF";
  return BOM + csvRows.join('\n');
}

export function downloadPayrollFile(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function updatePayrollStatus(
    recordIds: string[],
    newStatus: 'processed' | 'paid',
    recordType: 'shift' | 'posting' // Changed 'all' to be handled by calling this twice if needed
): Promise<{ success: boolean; successCount?: number; error: string | null }> {
    try {
        let payrollTable: string;
        if (recordType === 'shift') {
            payrollTable = 'payroll_records';
        } else if (recordType === 'posting') {
            payrollTable = 'posting_payroll_records';
        } else {
            return { success: false, error: "Invalid record type for status update." };
        }

        const { count, error } = await supabase
            .from(payrollTable)
            .update({ 
                status: newStatus, 
                // Set processed_at only when moving to 'paid' or if it's 'processed' and not already set
                processed_at: (newStatus === 'paid' || newStatus === 'processed') ? new Date().toISOString() : undefined 
            })
            .in('id', recordIds);
            
        if (error) throw error;
        return { success: true, successCount: count || 0, error: null };

    } catch (error) {
        console.error("Error updating payroll status:", error);
        const message = error instanceof Error ? error.message : 'Error updating status';
        return { success: false, error: message };
    }
}