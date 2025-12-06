import React from 'react';
import { ReceiptData, Assignment } from '../types';

interface ReceiptViewerProps {
  receipt: ReceiptData;
  assignments: Assignment[];
}

const ReceiptViewer: React.FC<ReceiptViewerProps> = ({ receipt, assignments }) => {
  const getAssignedPeople = (itemId: string) => {
    const assignment = assignments.find((a) => a.itemId === itemId);
    return assignment ? assignment.assignedTo : [];
  };

  // Assign a consistent color to names
  const getColorForName = (name: string) => {
    const colors = [
      'bg-red-100 text-red-800',
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-yellow-100 text-yellow-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
          <span className="material-icons-round text-slate-400">receipt_long</span>
          Parsed Receipt
        </h2>
        <span className="text-xs font-medium bg-white px-2 py-1 rounded border border-slate-200 text-slate-500">
          {receipt.items.length} items
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 rounded-l-lg">Item</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 rounded-r-lg">Split By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {receipt.items.map((item) => {
              const assignedTo = getAssignedPeople(item.id);
              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-3 font-medium text-slate-800">{item.name}</td>
                  <td className="px-3 py-3 text-right text-slate-500">{item.quantity}</td>
                  <td className="px-3 py-3 text-right font-mono text-slate-700">
                    {receipt.currency}{item.price.toFixed(2)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {assignedTo.length > 0 ? (
                        assignedTo.map((person) => (
                          <span
                            key={person}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium border border-opacity-10 ${getColorForName(person)}`}
                          >
                            {person}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-300 italic">Unassigned</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{receipt.currency}{receipt.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Tax</span>
            <span>{receipt.currency}{receipt.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Tip</span>
            <span>{receipt.currency}{receipt.tip.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-slate-800 pt-2 border-t border-slate-200 mt-2">
            <span>Total</span>
            <span>{receipt.currency}{receipt.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptViewer;