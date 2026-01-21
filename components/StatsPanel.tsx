import React from 'react';
import * as Recharts from 'recharts';
import { AnalysisStats } from '../types';
import { AlertCircle, Activity } from 'lucide-react';

interface StatsPanelProps {
  stats: AnalysisStats;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  // Check if Recharts is actually loaded to prevent "Cannot read property of undefined" errors
  const PieChart = Recharts?.PieChart;
  const Pie = Recharts?.Pie;
  const Cell = Recharts?.Cell;
  const ResponsiveContainer = Recharts?.ResponsiveContainer;
  const Tooltip = Recharts?.Tooltip;

  const isChartsAvailable = !!PieChart && !!ResponsiveContainer && !!Pie;

  const data = [
    { name: 'Valid', value: stats.valid, color: '#16a34a' },
    { name: 'Issues', value: stats.invalid, color: '#dc2626' },
    { name: 'Pending', value: stats.pending, color: '#2563eb' },
  ].filter(d => d.value > 0);

  const percentage = stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0;

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Verification Health</h3>
      
      <div className="flex items-center justify-between">
        <div className="w-1/2 h-28 relative flex items-center justify-center">
          {isChartsAvailable && stats.total > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={500}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : stats.total > 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-blue-500/40">
               <Activity className="w-8 h-8 mb-1 animate-pulse" />
               <span className="text-[7px] uppercase font-bold text-center">Charts Offline</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
               <AlertCircle className="w-6 h-6 mb-1 opacity-20" />
               <span className="text-[8px] uppercase font-bold">No Data</span>
            </div>
          )}
        </div>
        
        <div className="w-1/2 pl-4 border-l border-gray-100">
          <div className="mb-2">
            <span className="text-3xl font-black text-gray-900 leading-none">{percentage}%</span>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mt-1">Trust Score</span>
          </div>
          <div className="space-y-1">
             <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">Verified</span>
                <span className="font-bold text-green-600">{stats.valid}</span>
             </div>
             <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">Issues</span>
                <span className="font-bold text-red-600">{stats.invalid}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;