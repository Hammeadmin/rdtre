// src/components/Payroll/PayrollEmailLog.tsx
import React from 'react';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CheckCircle, XCircle, Mail, Calendar } from 'lucide-react';
import type { Database } from '../../types/database';

type PayrollEmailLogEntry = Database['public']['Tables']['payroll_email_log']['Row'];

interface PayrollEmailLogProps {
  logs: PayrollEmailLogEntry[];
}

export const PayrollEmailLog: React.FC<PayrollEmailLogProps> = ({ logs }) => {
  if (logs.length === 0) {
    return <p className="text-sm text-gray-500 italic">No emails have been sent for this period yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Mottagare</th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Period</th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Skickat</th>
            <th className="px-4 py-2 text-center font-medium text-gray-600">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="px-4 py-3 whitespace-nowrap">{log.recipient_email}</td>
              <td className="px-4 py-3 whitespace-nowrap">{log.pay_period}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                {format(parseISO(log.created_at), 'd MMM yyyy, HH:mm', { locale: sv })}
              </td>
              <td className="px-4 py-3 text-center">
                {log.status === 'success' ? (
                  <span className="inline-flex items-center text-green-600" title="Skickat">
                    <CheckCircle size={16} />
                  </span>
                ) : (
                  <span className="inline-flex items-center text-red-600" title={`Misslyckades: ${log.error_message || ''}`}>
                    <XCircle size={16} />
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};