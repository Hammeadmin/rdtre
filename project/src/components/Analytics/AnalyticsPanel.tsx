// src/components/Analytics/AnalyticsPanel.tsx
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';

// Updated props to make ratingDistribution optional or handle its absence
interface AnalyticsPanelProps {
  data: {
    monthlyStats: any[]; // Consider more specific types
    applicationStats: any[]; // Consider more specific types
    ratingDistribution?: any[]; // Make optional or remove if not used at all
  };
}

// Example COLORS, adjust if needed, especially if ratingDistribution is removed
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export function AnalyticsPanel({ data }: AnalyticsPanelProps) {
  return (
    <div className="space-y-8">
      {/* Monthly Stats Chart */}
      {data.monthlyStats && data.monthlyStats.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Månadsöversikt Pass</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_shifts" name="Totalt Antal Pass" fill="#3B82F6" />
                <Bar dataKey="filled_shifts" name="Tillsatta/Slutförda Pass" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Application Trends Chart */}
      {data.applicationStats && data.applicationStats.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ansökningstrender</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.applicationStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="applications" name="Antal Ansökningar" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

     
      {/* If no rating distribution data is expected at all, you can remove the above block entirely */}
    </div>
  );
}