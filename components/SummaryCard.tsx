import React from 'react';
import { PersonSummary, ReceiptData } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SummaryCardProps {
  people: PersonSummary[];
  currency: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ people, currency }) => {
  const data = people.map(p => ({
    name: p.name,
    value: p.totalOwed,
  }));

  const COLORS = [
    '#F87171', '#60A5FA', '#4ADE80', '#C084FC', 
    '#FACC15', '#F472B6', '#818CF8'
  ];

  // Helper to color names consistently
  const getColorForName = (name: string, index: number) => {
      // Use the same hashing or index strategy to keep colors consistent across components if strictly needed,
      // but here we use the chart colors order
      return COLORS[index % COLORS.length];
  }

  if (people.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-center h-full text-slate-400 text-sm">
        No assignments yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
          <span className="material-icons-round text-green-500">payments</span>
          Split Summary
        </h2>
      </div>
      
      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
        {/* Chart Section */}
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColorForName(entry.name, index)} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `${currency}${value.toFixed(2)}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* List Section */}
        <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
          {people.map((person, idx) => (
            <div key={person.name} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-slate-50">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getColorForName(person.name, idx) }}
                ></div>
                <span className="font-medium text-slate-700">{person.name}</span>
              </div>
              <div className="text-right">
                <span className="block font-bold text-slate-800">
                  {currency}{person.totalOwed.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 block">
                  {person.items.length} items
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;