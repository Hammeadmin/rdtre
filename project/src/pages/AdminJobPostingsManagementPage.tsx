// src/pages/AdminJobPostingsManagementPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    Loader2, PlusCircle, Eye, Trash2, Edit3, Search, Briefcase, MapPin, CalendarDays, Users, Filter as FilterIcon, CheckCircle, XCircle, Building2
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { sv } from 'date-fns/locale';
import type { JobPosting, UserRole, UserProfile } from '../types';
import {
    fetchAllPostingsAdmin,
    deletePosting,
    updatePostingStatus, // Assuming you have this from lib/postings.ts
} from '../lib/postings';
import { CreatePostingForm } from '../components/postings/CreatePostingForm'; // Assuming adaptable or new admin form
import { PostingDetailsModal } from '../components/postings/PostingDetailsModal';
import { EditPostingModal } from '../components/postings/EditPostingModal';
import { ManagePostingApplicantsModal } from '../components/postings/ManagePostingApplicantsModal';
import { useAuth } from '../context/AuthContext';

// Helper to format dates consistently
const formatDateDisplay = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = parseISO(dateString);
        return isValid(date) ? format(date, 'd MMM yy', { locale: sv }) : 'Invalid Date';
    } catch { return 'Invalid Date'; }
};

// Type for employer list for the creation form
type EmployerSelectItem = { id: string; display_name: string };

export function AdminJobPostingsManagementPage() {
    const { profile: adminProfile } = useAuth();
    const [postings, setPostings] = useState<JobPosting[]>([]);
    const [allEmployers, setAllEmployers] = useState<EmployerSelectItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedPostingForEdit, setSelectedPostingForEdit] = useState<JobPosting | null>(null);
    const [selectedPostingForDetails, setSelectedPostingForDetails] = useState<JobPosting | null>(null);
    const [selectedPostingForApplicants, setSelectedPostingForApplicants] = useState<JobPosting | null>(null);

    const [filters, setFilters] = useState({
        searchTerm: '',
        status: 'all',
        employerId: '',
        role: '' as UserRole | '',
    });

    const loadInitialData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [postingsResult, employersResult] = await Promise.all([
                fetchAllPostingsAdmin(filters), // Pass current filters
                supabase.from('profiles').select('id, full_name, pharmacy_name').eq('role', 'employer')
            ]);

            if (postingsResult.error) throw new Error(`Postings: ${postingsResult.error}`);
            setPostings(postingsResult.data || []);

            if (employersResult.error) throw new Error(`Employers: ${employersResult.error.message}`);
            setAllEmployers(
                (employersResult.data || []).map(emp => ({
                    id: emp.id,
                    display_name: emp.pharmacy_name || emp.full_name || `Employer ${emp.id.substring(0, 6)}`
                }))
            );

        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [filters]); // Depend on filters to refetch when they change

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleRefresh = () => loadInitialData();

    const handleDelete = async (postingId: string) => {
        if (!window.confirm('Are you sure you want to delete this job posting?')) return;
        const toastId = toast.loading('Deleting posting...');
        const { success, error: deleteError } = await deletePosting(postingId);
        if (success) {
            toast.success('Posting deleted!', { id: toastId });
            loadInitialData();
        } else {
            toast.error(deleteError || 'Failed to delete posting.', { id: toastId });
        }
    };

    const handleStatusUpdate = async (postingId: string, newStatus: 'open' | 'filled' | 'cancelled' | 'completed') => {
        const toastId = toast.loading(`Updating status to ${newStatus}...`);
        const { success, error: updateError } = await updatePostingStatus(postingId, newStatus);
        if (success) {
            toast.success(`Status updated to ${newStatus}!`, { id: toastId });
            loadInitialData();
        } else {
            toast.error(updateError || 'Failed to update status.', { id: toastId });
        }
    };
    
    const getStatusColor = (status?: string | null) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'filled': return 'bg-green-100 text-green-800 border-green-300';
            case 'completed': return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };


    return (
        <div className="space-y-6 p-4 md:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Manage All Job Postings</h1>
                <div className="flex gap-2">
                    <button onClick={handleRefresh} className="btn btn-secondary" disabled={loading}>
                        <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : 'hidden'}`} />
                        Refresh
                    </button>
                    <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                        <PlusCircle size={18} className="mr-2" /> Create Posting for Employer
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="p-4 bg-white rounded-lg shadow border border-gray-200 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <input type="text" name="searchTerm" placeholder="Search title, desc, location..." value={filters.searchTerm} onChange={handleFilterChange} className="input-form" />
                    <select name="status" value={filters.status} onChange={handleFilterChange} className="input-form bg-white">
                        <option value="all">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="filled">Filled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <select name="employerId" value={filters.employerId} onChange={handleFilterChange} className="input-form bg-white">
                        <option value="">All Employers</option>
                        {allEmployers.map(emp => <option key={emp.id} value={emp.id}>{emp.display_name}</option>)}
                    </select>
                    <select name="role" value={filters.role} onChange={handleFilterChange} className="input-form bg-white">
                        <option value="">All Roles</option>
                        <option value="pharmacist">Pharmacist</option>
                        <option value="egenvårdsrådgivare">Egenvårdsrådgivare</option>
                        <option value="säljare">Säljare</option>
                    </select>
                </div>
            </div>
            
            {loading && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" /></div>}
            {error && <div className="p-4 text-red-600 bg-red-50 rounded-md text-center">{error}</div>}
            
            {!loading && !error && (
                <div className="overflow-x-auto shadow-md rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 bg-white">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="th-cell">Title</th>
                                <th className="th-cell">Employer</th>
                                <th className="th-cell">Role</th>
                                <th className="th-cell">Location</th>
                                <th className="th-cell">Period</th>
                                <th className="th-cell">Status</th>
                                {/* Add applicant count later if needed */}
                                <th className="th-cell">Created</th>
                                <th className="th-cell text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {postings.length === 0 ? (
                                <tr><td colSpan={8} className="py-10 text-center text-gray-500 italic">No job postings found matching filters.</td></tr>
                            ) : (
                                postings.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="td-cell font-medium text-gray-900 max-w-xs truncate" title={p.title}>{p.title}</td>
                                        <td className="td-cell max-w-xs truncate" title={p.employer_name}>{p.employer_name}</td>
                                        <td className="td-cell capitalize">{p.required_role}</td>
                                        <td className="td-cell max-w-xs truncate" title={p.location || undefined}>{p.location || 'N/A'}</td>
                                        <td className="td-cell whitespace-nowrap">{formatDateDisplay(p.period_start_date)} - {formatDateDisplay(p.period_end_date)}</td>
                                        <td className="td-cell">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(p.status)}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="td-cell whitespace-nowrap">{formatDateDisplay(p.created_at)}</td>
                                        <td className="td-cell text-right whitespace-nowrap space-x-1">
                                            <button onClick={() => setSelectedPostingForDetails(p)} className="btn-icon text-blue-600 hover:text-blue-800" title="View Details"><Eye size={16}/></button>
                                            <button onClick={() => setSelectedPostingForEdit(p)} className="btn-icon text-indigo-600 hover:text-indigo-800" title="Edit Posting"><Edit3 size={16}/></button>
                                            <button onClick={() => setSelectedPostingForApplicants(p)} className="btn-icon text-purple-600 hover:text-purple-800" title="Manage Applicants"><Users size={16}/></button>
                                            <button onClick={() => handleDelete(p.id)} className="btn-icon text-red-600 hover:text-red-800" title="Delete Posting"><Trash2 size={16}/></button>
                                            {/* Dropdown for status change could go here */}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showCreateModal && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8">
                        <CreatePostingForm
                            onSuccess={() => { setShowCreateModal(false); loadInitialData(); }}
                            onClose={() => setShowCreateModal(false)}
                            // Pass a prop to indicate admin mode and enable employer selection if CreatePostingForm is adapted
                            isAdminCreator={true} 
                            employersList={allEmployers}
                        />
                    </div>
                </div>
            )}
            {selectedPostingForEdit && (
                <EditPostingModal
                    posting={selectedPostingForEdit}
                    onClose={() => setSelectedPostingForEdit(null)}
                    onSuccess={() => { setSelectedPostingForEdit(null); loadInitialData(); }}
                />
            )}
            {selectedPostingForDetails && (
                <PostingDetailsModal
                    posting={selectedPostingForDetails}
                    currentUserRole={adminProfile?.role as UserRole || 'admin'} // Admin context
                    onClose={() => setSelectedPostingForDetails(null)}
                    onViewEmployerProfile={(empId) => console.log("View employer from admin modal:", empId)} // Basic handler for now
                    isAdminView={true} // Prop to indicate admin view
                />
            )}
            {selectedPostingForApplicants && (
                <ManagePostingApplicantsModal
                    posting={selectedPostingForApplicants}
                    onClose={() => setSelectedPostingForApplicants(null)}
                    onUpdate={loadInitialData}
                    onViewApplicantProfile={(applicantId) => alert(`Admin: View profile for applicant ${applicantId}`)} // Placeholder
                />
            )}
            <style jsx>{`
                .input-form { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm; }
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors; }
                .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500; }
                .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
                .th-cell { @apply px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider; }
                .td-cell { @apply px-3 py-3 text-sm text-gray-700; }
                .btn-icon { @apply p-1.5 rounded-md hover:bg-gray-100 transition-colors; }
            `}</style>
        </div>
    );
}