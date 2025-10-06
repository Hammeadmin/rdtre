// src/components/Admin/UserManagement.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { UserProfile, UserRole } from '../../types';
import { setVerificationStatus } from '../../lib/profiles'; // Ensure this path is correct
import { createNotification } from '../../lib/notifications';
import { toast } from 'react-hot-toast';
import {
    Loader2,
    User as UserIcon,
    Search,
    Edit3,
    ShieldCheck,
    ShieldOff,
    UserCheck,
    UserX,
    RefreshCw,
    CheckCircle,
    XCircle,
    AlertTriangle, // Can still be used for other alerts if needed
    FileText as ViewLicenseIcon
} from 'lucide-react';

interface ManagedUser extends UserProfile {
    email?: string;
    // license_document is part of UserProfile
}

const getRoleDisplayName = (role: UserRole | string | null): string => {
    switch (role) {
        case 'pharmacist': return 'Farmaceut';
        case 'säljare': return 'Säljare';
        case 'egenvårdsrådgivare': return 'Egenvårdsrådgivare';
        case 'employer': return 'Arbetsgivare';
        case 'admin': return 'Administratör';
        case 'anonymous': return 'Anonym';
        case 'authenticated': return 'Autentiserad';
        default: return role || 'Okänd Roll';
    }
};

export function UserManagement() {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [selectedNewRole, setSelectedNewRole] = useState<UserRole | ''>('');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setUsers((data as ManagedUser[]) || []);
        } catch (err: any) {
            const errorMessage = err.message || "Kunde inte hämta användare.";
            console.error('Error fetching users:', err);
            setError(errorMessage);
            toast.error(errorMessage);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleToggleVerification = async (userToUpdate: ManagedUser) => {
        const newVerifiedStatus = !userToUpdate.license_verified;
        const newActiveStatus = newVerifiedStatus ? true : userToUpdate.is_active;

        const actionText = newVerifiedStatus ? 'verifiera' : 'avverifiera';
        const userName = userToUpdate.full_name || userToUpdate.email || userToUpdate.id;
        const userEmail = userToUpdate.email;

        if (!window.confirm(`Är du säker på att du vill ${actionText} användaren ${userName}?`)) {
            return;
        }

        const toastId = toast.loading(`${newVerifiedStatus ? 'Verifierar' : 'Avverifierar'} användare...`);
        try {
            const { data: updatedProfile, error: updateError } = await setVerificationStatus(
                userToUpdate.id,
                newVerifiedStatus,
                newActiveStatus
            );

            if (updateError) {
                throw new Error(updateError);
            }

          if (newVerifiedStatus === true && userEmail) {
            try {
                // a) Create in-app notification
                await createNotification({
                    user_id: userToUpdate.id,
                    type: 'verification_success',
                    title: 'Ditt konto har verifierats!',
                    message: 'Grattis! Ditt konto har blivit verifierat. Du kan nu söka pass och uppdrag.',
                    link: '/shifts'
                });

                // b) Trigger the confirmation email via the API route
                await fetch('/api/send-verification-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail, name: userName }),
                });

            } catch (notificationError) {
                console.error("Failed to send verification notifications:", notificationError);
                // This toast informs the admin that the main action succeeded but notifications failed
                toast.error("Användaren verifierades, men aviseringen misslyckades.", { duration: 5000 });
            }
        }
          

            toast.success(`Användare ${userName} ${newVerifiedStatus ? 'blev verifierad' : 'fick verifiering borttagen'}!`, { id: toastId });
            setUsers(currentUsers =>
                currentUsers.map(u => (u.id === userToUpdate.id ? { ...u, ...updatedProfile } : u))
            );
        } catch (err: any) {
            toast.error(`Misslyckades att ${actionText} användare ${userName}: ${err.message}`, { id: toastId });
        }
    };

    const handleToggleUserActivation = async (userToUpdate: ManagedUser) => {
        const newStatus = !(userToUpdate.is_active ?? false);
        const actionText = newStatus ? "aktivera" : "inaktivera";
        const userName = userToUpdate.full_name || userToUpdate.email || userToUpdate.id;

        if (userToUpdate.role === 'admin' && !newStatus) {
            if(!window.confirm(`VARNING: Du är på väg att inaktivera en administratör (${userName}). Detta kan låsa ute administratörsåtkomst. Är du helt säker?`)) {
                return;
            }
        } else if (!window.confirm(`Är du säker på att du vill ${actionText} kontot för ${userName}? Detta kommer ${newStatus ? 'tillåta' : 'förhindra'} dem att logga in.`)) {
            return;
        }

        const toastId = toast.loading(`${newStatus ? "Aktiverar" : "Inaktiverar"} konto...`);
        try {
            const { data: updatedProfile, error } = await supabase
                .from('profiles')
                .update({ is_active: newStatus, updated_at: new Date().toISOString() })
                .eq('id', userToUpdate.id)
                .select()
                .single();

            if (error) throw error;
            toast.success(`Konto för ${userName} blev ${actionText}t.`, { id: toastId });
            setUsers(currentUsers =>
                currentUsers.map(u => (u.id === userToUpdate.id ? { ...u, ...updatedProfile } : u))
            );
        } catch (err) {
            console.error(`Error ${actionText}ing user:`, err);
            const message = err instanceof Error ? err.message : `Misslyckades med att ${actionText} användare.`;
            toast.error(message, { id: toastId });
        }
    };

    const handleUpdateRole = async (userId: string, newRole: UserRole | '') => {
        if (!newRole) {
            toast.error("Vänligen välj en giltig roll.");
            return;
        }
        const userToUpdate = users.find(u => u.id === userId);
        if (!userToUpdate) {
            toast.error("Användaren hittades inte.");
            return;
        }
        const userName = userToUpdate.full_name || userToUpdate.email || userToUpdate.id;

        if (!window.confirm(`Är du säker på att du vill ändra rollen för ${userName} till "${getRoleDisplayName(newRole)}"?`)) {
            setEditingUserId(null);
            setSelectedNewRole('');
            return;
        }
        const toastId = toast.loading(`Uppdaterar roll till ${getRoleDisplayName(newRole)}...`);
        try {
            const {data: updatedProfile, error } = await supabase
                .from('profiles')
                .update({ role: newRole as UserRole, updated_at: new Date().toISOString() })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            toast.success('Användarroll uppdaterad!', { id: toastId });
            setUsers(currentUsers =>
                currentUsers.map(u => (u.id === userId ? { ...u, ...updatedProfile } : u))
            );
        } catch (error) {
            console.error('Error updating role:', error);
            toast.error(error instanceof Error ? error.message : 'Misslyckades med att uppdatera roll.', { id: toastId });
        } finally {
            setEditingUserId(null);
            setSelectedNewRole('');
        }
    };

    const handleViewLicenseDocument = async (licenseDocumentPath: string | null | undefined) => {
        if (!licenseDocumentPath) {
            toast.error("Licensdokument saknas eller sökväg är ogiltig för denna användare.");
            return;
        }
        const BUCKET_NAME = 'license-documents';
        const toastId = toast.loading("Genererar säker länk till licens...");
        try {
            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .createSignedUrl(licenseDocumentPath, 300);

            if (error) throw error;
            if (data?.signedUrl) {
                toast.success("Säker länk genererad!", { id: toastId });
                window.open(data.signedUrl, '_blank');
            } else {
                throw new Error("Kunde inte generera signerad URL (ingen data).");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Misslyckades med att hämta licensdokument.", { id: toastId });
            console.error("Full error in handleViewLicenseDocument:", error);
        }
    };

    const filteredUsers = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            (user.full_name?.toLowerCase() || '').includes(searchLower) ||
            (user.email?.toLowerCase() || '').includes(searchLower) ||
            (user.id?.toLowerCase() || '').includes(searchLower);
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
            </div>
        );
    }
     if (error) return <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md">Fel: {error}</div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Användarhantering ({filteredUsers.length})</h1>
                    <button onClick={fetchUsers} className="btn btn-secondary btn-sm flex items-center" title="Uppdatera användarlistan">
                        <RefreshCw size={16} className="mr-1.5" /> Uppdatera
                    </button>
                </div>
                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex-grow">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                            <input type="text" placeholder="Sök användare (namn, e-post, ID)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-sm"/>
                        </div>
                    </div>
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')} className="rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm bg-white text-sm">
                        <option value="all">Alla Roller</option>
                        <option value="admin">Admins</option>
                        <option value="employer">Arbetsgivare</option>
                        <option value="pharmacist">Farmaceuter</option>
                        <option value="säljare">Säljare</option>
                        <option value="egenvårdsrådgivare">Egenvårdsrådgivare</option>
                    </select>
                </div>

                <div className="overflow-x-auto bg-white shadow-xl rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Användare</th>
                                <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Roll</th>
                                <th className="px-4 sm:px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Verifierad</th>
                                <th className="px-4 sm:px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Aktiv</th>
                                <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Åtgärder</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                {user.profile_picture_url ? (
                                                    <img className="h-10 w-10 rounded-full object-cover" src={user.profile_picture_url} alt={user.full_name || 'Användarbild'} />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-lg font-medium">
                                                        {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-medium text-gray-900">{user.full_name || 'Ej angett'}</div>
                                                <div className="text-xs text-gray-500">{user.email || 'Email saknas'}</div>
                                                <div className="text-xs text-gray-500 md:hidden mt-1">Roll: {getRoleDisplayName(user.role)}</div>
                                                {/* Removed display of license_rejection_reason here */}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                                        {editingUserId === user.id ? (
                                            <select 
                                                value={selectedNewRole || user.role || ''} 
                                                onChange={(e) => setSelectedNewRole(e.target.value as UserRole)} 
                                                className="form-select form-select-sm rounded-md border-gray-300 shadow-sm py-1 px-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="" disabled>Välj ny roll...</option>
                                                <option value="admin">Admin</option>
                                                <option value="employer">Arbetsgivare</option>
                                                <option value="pharmacist">Farmaceut</option>
                                                <option value="säljare">Säljare</option>
                                                <option value="egenvårdsrådgivare">Egenvårdsrådgivare</option>
                                            </select>
                                        ) : ( getRoleDisplayName(user.role) )}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                                        {user.license_verified ? (
                                            <span title="Licens Verifierad" className="p-1.5 inline-flex items-center rounded-full bg-green-100 text-green-700">
                                                <CheckCircle className="h-5 w-5" />
                                            </span>
                                        ) : (
                                            // Simplified title, removed dependency on license_rejection_reason
                                            <span title={"Licens Ej Verifierad"} className={`p-1.5 inline-flex items-center rounded-full bg-yellow-100 text-yellow-700`}>
                                                <XCircle className="h-5 w-5" />
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                                        {user.is_active ? (
                                            <span title="Konto Aktivt" className="p-1.5 inline-flex items-center rounded-full bg-green-100 text-green-700">
                                                <CheckCircle className="h-5 w-5" />
                                            </span>
                                        ) : (
                                            <span title="Konto Inaktivt" className="p-1.5 inline-flex items-center rounded-full bg-red-100 text-red-700">
                                                <XCircle className="h-5 w-5" />
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-1 sm:space-x-2">
                                            {editingUserId === user.id ? (
                                                <>
                                                    <button onClick={() => handleUpdateRole(user.id, selectedNewRole || (user.role as UserRole))} className="p-1.5 rounded-md text-green-600 hover:bg-green-100 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500" title="Spara Roll"> <UserCheck size={20} /> </button>
                                                    <button onClick={() => { setEditingUserId(null); setSelectedNewRole(''); }} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400" title="Avbryt"> <UserX size={20} /> </button>
                                                </>
                                            ) : (
                                                <button onClick={() => { setEditingUserId(user.id); setSelectedNewRole(user.role as UserRole || ''); }} className="p-1.5 rounded-md text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500" title="Redigera Roll"> <Edit3 size={18} /> </button>
                                            )}

                                            <button
                                                onClick={() => handleToggleVerification(user)}
                                                title={user.license_verified ? 'Avverifiera Licens' : 'Verifiera Licens'}
                                                className={`p-1.5 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 ${user.license_verified ? 'text-yellow-600 hover:bg-yellow-100 hover:text-yellow-700 focus:ring-yellow-500' : 'text-green-600 hover:bg-green-100 hover:text-green-700 focus:ring-green-500'}`}
                                            >
                                                {user.license_verified ? <ShieldOff size={20} /> : <ShieldCheck size={20} />}
                                            </button>
                                            <button
                                                onClick={() => handleToggleUserActivation(user)}
                                                title={user.is_active ? 'Inaktivera Konto' : 'Aktivera Konto'}
                                                className={`p-1.5 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 ${user.is_active ? 'text-red-600 hover:bg-red-100 hover:text-red-700 focus:ring-red-500' : 'text-green-600 hover:bg-green-100 hover:text-green-700 focus:ring-green-500'}`}
                                            >
                                                {user.is_active ? <UserX size={20} /> : <UserCheck size={20} />}
                                            </button>
                                            {user.role === 'pharmacist' && user.license_document && (
                                                 <button onClick={() => handleViewLicenseDocument(user.license_document)} className="p-1.5 rounded-md text-blue-600 hover:bg-blue-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500" title="Visa Licensdokument">
                                                    <ViewLicenseIcon size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredUsers.length === 0 && !loading && (
                        <p className="text-center text-gray-500 py-10 text-sm">Inga användare matchade din sökning eller filter.</p>
                    )}
                </div>
            </div>
            <style jsx global>{`
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-150 ease-in-out; }
                .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
                .btn-sm { @apply px-3 py-1.5 text-xs; }
                .form-select-sm { @apply py-1 px-2 text-sm; }
                /* Add custom primary color for buttons if needed */
                .bg-primary-600 { background-color: #4f46e5; /* Example: Indigo-600 */ }
                .hover\\:bg-primary-700:hover { background-color: #4338ca; /* Example: Indigo-700 */ }
                .focus\\:ring-primary-500:focus { --tw-ring-color: #6366f1; /* Example: Indigo-500 */ }
            `}</style>
        </div>
    );
}