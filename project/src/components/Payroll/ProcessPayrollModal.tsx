// src/components/Payroll/ProcessPayrollModal.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Loader2, X, Save, AlertTriangle, Info, User, Landmark, Hash, Percent, PlusCircle } from 'lucide-react';
import type { PayrollExportData } from '../../lib/payroll';
import type { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext'; // 1. Import useAuth

// Define types for the new data we're fetching
interface PayrollInformation {
    id: string;
    birth_date: string;
    tax_percentage: number;
    bank_name: string;
    clearing_number: string;
    account_number: string;
    address: string;
    postal_code: string;
    city: string;
}

interface EmployerEmployeeRelationship {
    id: string;
    relationship_type: 'timanställd' | 'heltidsanställd' | 'konsult';
}

// 2. Define the Preset type
interface PayrollPreset {
    id: string;
    preset_name: string;
    tax_percentage: number;
    apply_vacation_pay: boolean;
}

interface ProcessPayrollModalProps {
    isOpen: boolean;
    onClose: (processed: boolean) => void; // Modified to signal if processing happened
    recordsToProcess: PayrollExportData[];
    recordType: 'shift' | 'posting'; // Add recordType
    // onConfirmProcess prop is now removed
}

// A small helper component for displaying data
const InfoRow: React.FC<{ icon: React.ElementType, label: string, value: React.ReactNode }> = ({ icon: Icon, label, value }) => (
    <div className="flex items-start py-2">
        <Icon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
        <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-base font-semibold text-gray-800">{value || 'Ej angivet'}</p>
        </div>
    </div>
);

export const ProcessPayrollModal: React.FC<ProcessPayrollModalProps> = ({
    isOpen,
    onClose,
    recordsToProcess,
    recordType, // Get recordType from props
}) => {
    const { profile: currentUser } = useAuth(); // 3. Get current user profile
    const [payrollInfo, setPayrollInfo] = useState<PayrollInformation | null>(null);
    const [relationship, setRelationship] = useState<EmployerEmployeeRelationship | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
   const [isProcessing, setIsProcessing] = useState(false);
    
    // Editable fields
    const [taxPercentage, setTaxPercentage] = useState(32);
    const [applyVacationPay, setApplyVacationPay] = useState(false);
    const vacationPayRate = 0.12; // 12%

    // 4. State for presets
    const [presets, setPresets] = useState<PayrollPreset[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string>('');

    const employeeId = useMemo(() => recordsToProcess[0]?.user_id, [recordsToProcess]);
    const employeeName = useMemo(() => recordsToProcess[0]?.employeeName, [recordsToProcess]);

    const fetchData = useCallback(async () => {
        if (!employeeId || !currentUser?.id) return;
        setIsLoading(true);
        setError(null);
        try {
            // Fetch payroll info, relationship, and presets in parallel
            const [infoRes, relRes, presetsRes] = await Promise.all([
                supabase.from('payroll_information').select('*').eq('id', employeeId).single(),
                supabase.from('employer_employee_relationships').select('*').eq('employee_id', employeeId).single(),
                supabase.from('payroll_presets').select('*').eq('employer_id', currentUser.id)
            ]);

            if (infoRes.error && infoRes.error.code !== 'PGRST116') throw infoRes.error;
            if (relRes.error && relRes.error.code !== 'PGRST116') throw relRes.error;
            if (presetsRes.error) throw presetsRes.error;

            setPayrollInfo(infoRes.data);
            setRelationship(relRes.data);
            setPresets(presetsRes.data || []);
            
            // Set initial editable values
            setTaxPercentage(infoRes.data?.tax_percentage || 32);
            setApplyVacationPay(relRes.data?.relationship_type === 'timanställd');
            setSelectedPresetId(''); // Reset preset selection

        } catch (e: any) {
            console.error("Error fetching payroll details:", e);
            setError("Kunde inte hämta all information. Vissa uppgifter kan saknas.");
            toast.error("Kunde inte hämta löneinformation.");
        } finally {
            setIsLoading(false);
        }
    }, [employeeId, currentUser?.id]);

    useEffect(() => {
        if (isOpen && employeeId) {
            fetchData();
        }
    }, [isOpen, employeeId, fetchData]);

    // 5. Effect to apply a selected preset
    useEffect(() => {
        if (!selectedPresetId) return;
        const selected = presets.find(p => p.id === selectedPresetId);
        if (selected) {
            setTaxPercentage(selected.tax_percentage);
            setApplyVacationPay(selected.apply_vacation_pay);
            toast.success(`Förval "${selected.preset_name}" tillämpat!`);
        }
    }, [selectedPresetId, presets]);

    const summary = useMemo(() => {
        return recordsToProcess.reduce((acc, rec) => {
            acc.grossPay += rec.total_pay || 0;
            return acc;
        }, { grossPay: 0 });
    }, [recordsToProcess]);

    const vacationPay = applyVacationPay ? summary.grossPay * vacationPayRate : 0;
    const taxDeduction = (summary.grossPay + vacationPay) * (taxPercentage / 100);
    const netPay = summary.grossPay + vacationPay - taxDeduction;

    const handleConfirm = async () => {
        setIsProcessing(true);
        const toastId = toast.loading("Bearbetar löneunderlag...");

        const payload = {
            p_employee_id: employeeId,
            p_pay_period: recordsToProcess[0].pay_period.substring(0, 7), // "YYYY-MM"
            p_gross_pay: summary.grossPay,
            p_vacation_pay: vacationPay,
            p_tax_deducted: taxDeduction,
            p_net_pay: netPay,
            p_record_ids: recordsToProcess.map(r => r.id),
            p_record_type: recordType
        };

        try {
            const { data, error } = await supabase.rpc('process_payroll', payload);

            if (error) throw error;

            toast.success("Löneunderlaget har bearbetats!", { id: toastId });
            setIsProcessing(false);
            onClose(true); // Close and signal success
        } catch (e: any) {
            console.error("Failed to process payroll:", e);
            toast.error(`Fel vid bearbetning: ${e.message}`, { id: toastId });
            setIsProcessing(false);
        }
    };

    // 6. Logic to save the current settings as a new preset
    const handleSavePreset = async () => {
        const presetName = window.prompt("Ange ett namn för ditt nya förval (t.ex. 'Standard Timanställd'):");
        if (!presetName || !currentUser?.id) {
            toast("Åtgärden avbröts.");
            return;
        }

        const toastId = toast.loading("Sparar förval...");
        const { data, error: insertError } = await supabase
            .from('payroll_presets')
            .insert({
                employer_id: currentUser.id,
                preset_name: presetName,
                tax_percentage: taxPercentage,
                apply_vacation_pay: applyVacationPay,
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error saving preset:", insertError);
            toast.error(insertError.message.includes('unique_preset_name_for_employer')
                ? "Ett förval med det namnet finns redan."
                : "Kunde inte spara förval.", { id: toastId });
        } else {
            toast.success(`Förval "${presetName}" har sparats!`, { id: toastId });
            // Add new preset to the list and select it
            setPresets(prev => [...prev, data]);
            setSelectedPresetId(data.id);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl transform transition-all max-h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-5 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Bearbeta Löneunderlag</h2>
                        <p className="text-sm text-gray-500">Granska och bekräfta uppgifter för {employeeName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <X className="h-6 w-6 text-gray-600" />
                    </button>
                </header>

                <main className="p-6 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Left Column: Employee Info */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Anställdinformation</h3>
                                {!payrollInfo && (
                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 flex items-center">
                                        <AlertTriangle size={18} className="mr-2" />
                                        <span>Den anställde har inte fyllt i sina bank- och adressuppgifter än.</span>
                                    </div>
                                )}
                                <InfoRow icon={User} label="Personnummer" value={payrollInfo?.birth_date} />
                                <InfoRow icon={Landmark} label="Bank" value={payrollInfo?.bank_name} />
                                <InfoRow icon={Hash} label="Clearing & Konto" value={`${payrollInfo?.clearing_number || '...'} - ${payrollInfo?.account_number || '...'}`} />
                                <InfoRow icon={Info} label="Anställningstyp" value={relationship?.relationship_type || 'Okänd'} />
                            </div>

                            {/* Right Column: Calculation */}
                            <div className="bg-slate-50 p-4 rounded-lg space-y-4">
                                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Löneberäkning</h3>
                                
                                {/* 7. Add the Preset Dropdown */}
                                <div>
                                    <label htmlFor="preset-select" className="form-label">Tillämpa förval</label>
                                    <select
                                        id="preset-select"
                                        className="form-select"
                                        value={selectedPresetId}
                                        onChange={(e) => setSelectedPresetId(e.target.value)}
                                    >
                                        <option value="">Välj ett förval...</option>
                                        {presets.map(p => (
                                            <option key={p.id} value={p.id}>{p.preset_name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Bruttolön (från poster):</span>
                                        <span className="font-semibold">{summary.grossPay.toFixed(2)} SEK</span>
                                    </div>

                                    {/* Vacation Pay Toggle */}
                                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100">
                                        <label htmlFor="vacation-pay" className="flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                id="vacation-pay"
                                                className="form-checkbox"
                                                checked={applyVacationPay}
                                                onChange={(e) => { setApplyVacationPay(e.target.checked); setSelectedPresetId(''); }}
                                                disabled={relationship?.relationship_type === 'heltidsanställd'}
                                            />
                                            <span className="ml-2 text-gray-600">Semesterersättning ({vacationPayRate * 100}%):</span>
                                        </label>
                                        <span className="font-semibold text-green-600">+ {vacationPay.toFixed(2)} SEK</span>
                                    </div>
                                    {relationship?.relationship_type === 'heltidsanställd' && (
                                         <p className="text-xs text-gray-500 -mt-2 pl-8">Ej tillämpligt för heltidsanställda.</p>
                                    )}

                                    {/* Tax Percentage Input */}
                                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100">
                                        <label htmlFor="tax-percent" className="text-gray-600">Skatteavdrag (%):</label>
                                        <div className="relative">
                                            <input
                                                id="tax-percent"
                                                type="number"
                                                value={taxPercentage}
                                                onChange={(e) => { setTaxPercentage(Number(e.target.value)); setSelectedPresetId(''); }}
                                                className="form-input w-24 text-right pr-8"
                                            />
                                            <Percent size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"/>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-red-600">
                                        <span>Totalt avdrag:</span>
                                        <span className="font-semibold">- {taxDeduction.toFixed(2)} SEK</span>
                                    </div>
                                </div>
                                
                                <div className="border-t pt-4 mt-4">
                                    <div className="flex justify-between items-center text-xl">
                                        <span className="font-bold text-gray-800">Nettolön att betala:</span>
                                        <span className="font-bold text-primary-600">{netPay.toFixed(2)} SEK</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                <footer className="p-5 bg-gray-50 border-t mt-auto">
                    <div className="flex justify-between items-center">
                        {/* 8. Connect the button to the new handler */}
                        <button onClick={handleSavePreset} className="btn btn-outline btn-sm">
                            <PlusCircle size={14} className="mr-1.5" /> Spara som nytt förval
                        </button>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="btn btn-secondary">Avbryt</button>
                           <button onClick={handleConfirm} disabled={isLoading || isProcessing} className="btn btn-success">
        {isProcessing ? 'Bearbetar...' : `Bekräfta & Bearbeta ${recordsToProcess.length} poster`}
    </button>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};