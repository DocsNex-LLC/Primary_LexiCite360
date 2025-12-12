import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AnalysisStats } from '../types';

interface StatsPanelProps {
  stats: AnalysisStats;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  const data = [
    { name: 'Valid', value: stats.valid, color: '#16a34a' },
    { name: 'Hallucination', value: stats.invalid, color: '#dc2626' },
    { name: 'Pending', value: stats.pending, color: '#2563eb' },
  ].filter(d => d.value > 0);

  const percentage = stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0;

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Verification Health</h3>
      
      <div className="flex items-center justify-between">
        <div className="w-1/2 h-32">
          {stats.total > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-xs text-center">
              No data
            </div>
          )}
        </div>
        
        <div className="w-1/2 pl-4 border-l border-gray-100">
          <div className="mb-3">
            <span className="text-3xl font-bold text-gray-900">{percentage}%</span>
            <span className="text-xs text-gray-500 block">Accuracy Score</span>
          </div>
          <div className="space-y-1">
             <div className="flex justify-between text-xs">
                <span className="text-gray-600">Verified</span>
                <span className="font-medium text-green-600">{stats.valid}</span>
             </div>
             <div className="flex justify-between text-xs">
                <span className="text-gray-600">Hallucinations</span>
                <span className="font-medium text-red-600">{stats.invalid}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;