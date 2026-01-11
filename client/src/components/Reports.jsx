import React, { useState, useEffect } from 'react';
import axios from '../api';
import { BarChart3, Download, PieChart, TrendingUp, Calendar } from 'lucide-react';

const Reports = ({ user, showAlert }) => {
  const [data, setData] = useState({ categorySpend: [], vendorSpend: [], monthlyTrend: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`/reports/summary?company_id=${user.company_id || ''}`);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const SimpleBarChart = ({ data, color = "bg-blue-500" }) => {
    if (!data || data.length === 0) return <div className="text-gray-400 text-sm text-center py-10">No data available</div>;
    
    const max = Math.max(...data.map(d => d.value));

    return (
        <div className="space-y-3">
            {data.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-32 truncate text-gray-600 font-medium" title={item.name}>{item.name || 'Uncategorized'}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden relative group">
                        <div 
                            className={`h-full ${color} rounded-full transition-all duration-1000`} 
                            style={{ width: `${(item.value / max) * 100}%` }}
                        ></div>
                        <div className="absolute top-0 right-0 h-full flex items-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-gray-600">
                             {formatCurrency(item.value)}
                        </div>
                    </div>
                    <div className="w-24 text-right font-mono text-gray-700">{formatCurrency(item.value)}</div>
                </div>
            ))}
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-hidden bg-gray-50/50">
      {/* Header */}
      <div className="p-6 md:p-8 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="text-blue-600" />
              Reports & Analytics
            </h1>
            <p className="text-gray-500 mt-1">Financial insights and expenditure trends</p>
          </div>
          <button 
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm"
            onClick={() => showAlert('Export feature coming soon', 'info')}
          >
            <Download size={18} /> Export Data
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 custom-scrollbar">
        {loading ? (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Monthly Trend */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-green-600" /> Monthly Spending Trend
                    </h3>
                    <div className="h-64 flex items-end justify-between gap-2">
                        {data.monthlyTrend.length === 0 ? (
                            <div className="w-full text-center text-gray-400">No trend data</div>
                        ) : (
                            data.monthlyTrend.map((item, i) => {
                                const max = Math.max(...data.monthlyTrend.map(d => d.value));
                                const height = (item.value / max) * 100;
                                return (
                                    <div key={i} className="flex-1 flex flex-col justify-end group relative">
                                        <div 
                                            className="w-full bg-blue-500 rounded-t-lg transition-all duration-1000 group-hover:bg-blue-600 relative"
                                            style={{ height: `${height}%` }}
                                        >
                                            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {formatCurrency(item.value)}
                                            </div>
                                        </div>
                                        <div className="text-xs text-center text-gray-500 mt-2 truncate font-medium">{item.name}</div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Spend by Category */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <PieChart size={20} className="text-purple-600" /> Spend by Category
                    </h3>
                    <SimpleBarChart data={data.categorySpend} color="bg-purple-500" />
                </div>

                {/* Top Vendors */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <BarChart3 size={20} className="text-orange-600" /> Top Vendors
                    </h3>
                    <SimpleBarChart data={data.vendorSpend} color="bg-orange-500" />
                </div>

            </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
