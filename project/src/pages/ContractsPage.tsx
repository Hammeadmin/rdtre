import { ContractManagement } from '../components/Contracts/ContractManagement';
import { useAuth } from '../context/AuthContext';

export function ContractsPage() {
    const { profile } = useAuth();

    if (profile?.role !== 'employer') {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold">Åtkomst nekad</h1>
                <p className="mt-2 text-gray-600">Denna sida är endast tillgänglig för arbetsgivare.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Avtalshantering</h1>
            <ContractManagement />
        </div>
    );
}
