import React, { useState, useEffect } from 'react';
import axios from '../api';
import { ShieldCheck, Search, Filter, Clock, User, Activity } from 'lucide-react';

const AuditLogs = ({ user, showAlert }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await axios.get('/audit-logs');
      setLogs(res.data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
      showAlert('Failed to load audit logs', 'error');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
        mon: 'short', day: 'numeric', year: 'numeric', 
        hour: 'numeric', minute: '2-digit', second: '2-digit'
    });
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.username && log.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-hidden bg-gray-50/50">
      {/* Header */}
      <div className="p-6 md:p-8 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ShieldCheck className="text-blue-600" />
              Audit Logs
            </h1>
            <p className="text-gray-500 mt-1">System-wide activity and security events</p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-6 flex max-w-md relative">
          <input
            type="text"
            placeholder="Search logs..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Entity</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap space-x-2">
                        <Clock size={14} className="inline mb-0.5" />
                        <span>{formatDate(log.created_at)}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                            <User size={14} className="text-gray-400" />
                            {log.username || 'System/Guest'}
                            {log.user_role && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded ml-1">{log.user_role}</span>}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-blue-600">
                        {log.action}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                        {log.entity_type} {log.entity_id && <span className="text-xs bg-gray-100 text-gray-500 px-1 rounded ml-1">#{log.entity_id}</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                        {log.details}
                    </td>
                     <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                        {log.ip_address}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                     <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-400 italic">
                            No logs found matching your search.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
