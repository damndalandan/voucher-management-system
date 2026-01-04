import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Clock, User, FileText, Activity } from 'lucide-react';

const VoucherHistory = ({ voucher, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/vouchers/${voucher.id}/history`);
        setHistory(res.data);
      } catch (err) {
        console.error("Error fetching history", err);
      } finally {
        setLoading(false);
      }
    };

    if (voucher) {
      fetchHistory();
    }
  }, [voucher]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="bg-purple-600 p-1.5 rounded-lg text-white shadow-lg shadow-purple-200">
                  <Activity size={18} />
              </div>
              Voucher History
              <span className="text-sm font-normal text-gray-500 ml-2">#{voucher.voucher_code}</span>
          </h2>
          <button 
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-700"
          >
              <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Clock size={40} className="mb-2 opacity-20" />
              <p>No history found for this voucher.</p>
            </div>
          ) : (
            <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-200 z-0"></div>

                <div className="space-y-0">
                    {history.map((item, index) => (
                        <div key={item.id} className="relative z-10 flex group hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                            {/* Timeline Dot */}
                            <div className="w-16 flex-shrink-0 flex justify-center pt-6">
                                <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                                    item.action.includes('Created') ? 'bg-green-500' :
                                    item.action.includes('Approved') ? 'bg-blue-500' :
                                    item.action.includes('Rejected') ? 'bg-red-500' :
                                    'bg-purple-500'
                                }`}></div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 py-5 pr-6">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                        <Clock size={10} /> {formatDate(item.created_at)}
                                    </span>
                                    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {item.role}
                                    </span>
                                </div>
                                
                                <h3 className="text-sm font-bold text-gray-900 mb-1">
                                    {item.action}
                                </h3>
                                
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                        <User size={10} />
                                    </div>
                                    <span className="text-sm text-gray-600">{item.username}</span>
                                </div>

                                {item.details && (
                                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 font-mono border border-gray-200 mt-2 whitespace-pre-wrap">
                                        {item.details}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoucherHistory;
