import React from 'react';
import * as Recharts from 'recharts';
import { AnalysisStats } from '../types';
import { Activity } from 'lucide-react';

interface StatsPanelProps {
  stats: AnalysisStats;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  const PieChart = Recharts?.PieChart;
  const Pie = Recharts?.Pie;
  const Cell = Recharts?.Cell;
  const ResponsiveContainer = Recharts?.ResponsiveContainer;

  const isChartsAvailable = !!PieChart && !!ResponsiveContainer && !!Pie;

  const data = [
    { name: 'Valid', value: stats.valid, color: '#22c55e' },
    { name: 'Issues', value: stats.invalid, color: '#ef4444' },
    { name: 'Pending', value: stats.pending, color: '#0b3a6f' },
  ].filter(d => d.value > 0);

  const percentage = stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0;

  return (
    <div className="bg-white p-6 rounded-3xl border border-[#e6edf4] shadow-sm">
      <h3 className="text-[11px] font-black text-[#94a3b8] uppercase tracking-[0.2em] mb-4">Verification Audit</h3>
      
      <div className="flex items-center">
        <div className="w-1/2 h-32 relative">
          {isChartsAvailable && stats.total > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={30}
                  outerRadius={45}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={500}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-200">
               <Activity className="w-8 h-8 opacity-20" />
            </div>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             <span className="text-xl font-black text-[#0b3a6f] leading-none">{percentage}%</span>
          </div>
        </div>
        
        <div className="flex-1 pl-6 space-y-4">
          <div>
            <span className="text-[9px] font-black text-[#94a3b8] uppercase tracking-widest block mb-1">Trust Integrity</span>
            <div className="h-2 w-full bg-[#f6f8fb] rounded-full overflow-hidden">
               <div className="h-full bg-[#0b3a6f] transition-all duration-1000" style={{ width: `${percentage}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <span className="text-[14px] font-black text-[#1f2937] block">{stats.valid}</span>
                <span className="text-[8px] font-bold text-[#22c55e] uppercase tracking-wider">Valid</span>
             </div>
             <div>
                <span className="text-[14px] font-black text-[#1f2937] block">{stats.invalid}</span>
                <span className="text-[8px] font-bold text-[#ef4444] uppercase tracking-wider">Issues</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;