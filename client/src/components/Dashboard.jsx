import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from '../api';
import { 
  LogOut, Plus, Printer, RefreshCw, CheckCircle, Search, Filter, Calendar, X, 
  TrendingUp, Clock, FileCheck, Building, Settings, Edit, CreditCard, AlertTriangle,
  LayoutDashboard, FileText, ChevronDown, ChevronRight, ChevronLeft, User, Menu,
  Trash2, UserPlus, Save, Download, Upload, Database, Eye, Users, Paperclip, ExternalLink
} from 'lucide-react';
import VoucherForm from './VoucherForm';
import VoucherTemplate from './VoucherTemplate';
import BankDetails from './BankDetails';
import VoucherHistory from './VoucherHistory';
import { Link } from 'react-router-dom';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm Approval", confirmColor = "green", isProcessing }) => {
  if (!isOpen) return null;
  
  const getColorClasses = () => {
      if (confirmColor === 'red') return 'bg-red-600 hover:bg-red-700 shadow-red-200';
      return 'bg-green-600 hover:bg-green-700 shadow-green-200';
  };

  const getIcon = () => {
      if (confirmColor === 'red') return <AlertTriangle className="h-8 w-8 text-red-600" />;
      return <CheckCircle className="h-8 w-8 text-green-600" />;
  };

  const getBgColor = () => {
      if (confirmColor === 'red') return 'bg-red-100';
      return 'bg-green-100';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className={`${getBgColor()} p-3 rounded-full shadow-sm`}>
            {getIcon()}
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
        </div>
        <p className="text-gray-600 mb-8 text-lg leading-relaxed">{message}</p>
        <div className="flex justify-end space-x-3">
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-6 py-2.5 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white focus:outline-none transition-all transform hover:-translate-y-0.5 flex items-center gap-2 ${getColorClasses()} ${isProcessing ? 'opacity-75 cursor-not-allowed transform-none' : ''}`}
          >
            {isProcessing ? (
                <>
                    <RefreshCw size={18} className="animate-spin" />
                    Processing...
                </>
            ) : (
                <>
                     {confirmColor === 'green' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                     {confirmText}
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const SuccessModal = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-green-100 p-3 rounded-full shadow-sm">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
        </div>
        <p className="text-gray-600 mb-8 text-lg leading-relaxed">{message}</p>
        <div className="flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 border border-transparent rounded-xl shadow-lg shadow-green-200 text-sm font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none transition-all transform hover:-translate-y-0.5"
          >
            Okay, Got it
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, title = "Delete Category", isProcessing }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-red-100 p-3 rounded-full shadow-sm">
            <Trash2 className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
        </div>
        <p className="text-gray-600 mb-8 text-lg leading-relaxed">
          Are you sure you want to delete <span className="font-bold text-gray-900">"{itemName}"</span>? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-6 py-2.5 border border-transparent rounded-xl shadow-lg shadow-red-200 text-sm font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none transition-all transform hover:-translate-y-0.5 flex items-center gap-2 ${isProcessing ? 'opacity-75 cursor-not-allowed transform-none' : ''}`}
          >
            {isProcessing ? (
                <>
                    <RefreshCw size={18} className="animate-spin" />
                    Processing...
                </>
            ) : (
                <>
                    <Trash2 size={18} />
                    Delete
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const StatsCard = ({ title, value, icon: Icon, color, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300 group ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2' : ''}`}
  >
    <div className="p-4">
      <div className="flex items-center">
        <div className={`flex-shrink-0 rounded-xl p-3 ${color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4 w-0 flex-1">
          <dl>
            <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate mb-0.5">{title}</dt>
            <dd className="text-xl font-bold text-gray-900 tracking-tight">{value}</dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

const CustomSelect = ({ label, icon: Icon, ...props }) => (
  <div className="group">
    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
      {Icon && <Icon size={12} />} {label}
    </label>
    <div className="relative">
      <select
        {...props}
        className={`w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 appearance-none transition-colors hover:bg-gray-100 cursor-pointer ${props.className || ''}`}
      >
        {props.children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 group-hover:text-blue-600 transition-colors">
        <ChevronDown size={16} strokeWidth={2.5} />
      </div>
    </div>
  </div>
);

const AddBankModal = ({ isOpen, onClose, onAdd, companies, user, isProcessing }) => {
  const [form, setForm] = useState({ bank_name: '', account_number: '', company_id: '', initial_balance: '' });

  const formatAmount = (value) => {
    let num = value.replace(/[^0-9.]/g, '');
    const parts = num.split('.');
    if (parts[0]) {
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    return parts.slice(0, 2).join('.');
  };

  const handleAmountChange = (e) => {
      setForm({...form, initial_balance: formatAmount(e.target.value)});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(form);
    setForm({ bank_name: '', account_number: '', company_id: '', initial_balance: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-lg shadow-blue-200"><Building size={18} /></div>
                Add Bank Account
            </h3>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bank Name</label>
              <input 
                type="text" 
                required
                value={form.bank_name}
                onChange={e => setForm({...form, bank_name: e.target.value})}
                className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all"
                placeholder="e.g. BDO, BPI"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account Number</label>
              <input 
                type="text" 
                required
                value={form.account_number}
                onChange={e => setForm({...form, account_number: e.target.value})}
                className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all font-mono"
                placeholder="e.g. 1234-5678-90"
              />
            </div>
            
            <CustomSelect 
                label="Company" 
                icon={Building}
                required
                value={form.company_id || user.company_id || ''}
                onChange={e => setForm({...form, company_id: e.target.value})}
                disabled={!!user.company_id}
            >
                <option value="">Select Company</option>
                {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </CustomSelect>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Initial Balance</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₱</span>
                <input 
                    type="text" 
                    value={form.initial_balance}
                    onChange={handleAmountChange}
                    className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pl-8 transition-all font-mono font-bold"
                    placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isProcessing}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
              <button 
                type="submit" 
                disabled={isProcessing}
                className={`px-5 py-2.5 border border-transparent rounded-xl shadow-lg shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 ${isProcessing ? 'opacity-75 cursor-not-allowed transform-none' : ''}`}
                >
                    {isProcessing ? (
                        <>
                            <RefreshCw size={18} className="animate-spin" />
                            Processing...
                        </>
                    ) : (
                        'Add Account'
                    )}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

const VoucherDetailsModal = ({ isOpen, onClose, voucher }) => {
  if (!isOpen || !voucher) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl transform transition-all scale-100 border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-3 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="bg-blue-600 p-1 rounded-lg text-white shadow-lg shadow-blue-200">
                <FileText size={18} />
              </div>
              Voucher Details
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar space-y-3">
          
          {/* Top Row: Basic Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Voucher No</label>
              <div className="text-sm font-mono font-bold text-gray-900">{voucher.voucher_no}</div>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Date</label>
              <div className="text-sm font-medium text-gray-900">{new Date(voucher.date).toLocaleDateString()}</div>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Status</label>
              <span className={`text-xs font-bold ${
                  voucher.status === 'Issued' ? 'text-green-700' : 
                  voucher.status === 'Pending Admin' ? 'text-purple-700' :
                  voucher.status === 'Pending Liaison' ? 'text-orange-700' :
                  voucher.status === 'Void Pending Approval' ? 'text-red-700' :
                  voucher.status === 'Voided' ? 'text-gray-500' :
                  voucher.status === 'Bounced' ? 'text-red-800' :
                  voucher.status === 'Cancelled' ? 'text-gray-500' :
                  'text-yellow-700'
              }`}>
                  {voucher.status}
              </span>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Urgency</label>
              <span className={`text-xs font-bold ${
                  voucher.urgency === 'Critical' ? 'text-red-700' :
                  voucher.urgency === 'Urgent' ? 'text-orange-700' :
                  'text-green-700'
              }`}>
                  {voucher.urgency || 'Normal'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
             <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Created By</label>
              <div className="text-sm font-medium text-gray-900 truncate">{voucher.created_by_name || voucher.created_by_user || 'System'}</div>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Certified By</label>
              <div className="text-sm font-medium text-gray-900 truncate">{voucher.certified_by || '-'}</div>
            </div>
          </div>

          {/* Payee & Amount */}
          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex flex-col md:flex-row justify-between items-center gap-2">
            <div className="w-full md:w-auto">
              <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Payee</label>
              <div className="text-base font-bold text-gray-900">{voucher.payee}</div>
            </div>
            <div className="w-full md:w-auto text-left md:text-right">
              <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Amount</label>
              <div className="text-xl font-bold text-gray-900 font-mono">
                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(voucher.amount)}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Particulars / Description</label>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto custom-scrollbar">{voucher.description || 'No description provided.'}</p>
          </div>

          {/* Void Reason */}
          {voucher.void_reason && (
            <div className="bg-red-50 p-2 rounded-lg border border-red-100">
              <label className="block text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Void Reason</label>
              <p className="text-sm text-red-700 font-medium">{voucher.void_reason}</p>
            </div>
          )}

          {/* Attachments */}
          {(voucher.attachment_paths || voucher.attachment_path) && (
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Paperclip size={12} /> Attachments
                </label>
                <div className="space-y-1">
                    {/* Handle legacy single attachment */}
                    {voucher.attachment_path && !voucher.attachment_paths && (
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                    <FileText size={18} />
                                </div>
                                <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                                    {voucher.attachment_path.split('/').pop()}
                                </span>
                            </div>
                            <a 
                                href={`${voucher.attachment_path}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1 hover:underline"
                            >
                                View / Download <ExternalLink size={12} />
                            </a>
                        </div>
                    )}

                    {/* Handle multiple attachments */}
                    {voucher.attachment_paths && voucher.attachment_paths.split('||').map((path, index) => {
                        const name = voucher.attachment_names ? voucher.attachment_names.split('||')[index] : path.split('/').pop();
                        return (
                            <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                        <FileText size={18} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                                        {name}
                                    </span>
                                </div>
                                <a 
                                    href={`${path}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1 hover:underline"
                                >
                                    View / Download <ExternalLink size={12} />
                                </a>
                            </div>
                        );
                    })}
                </div>
            </div>
          )}

          {/* Bank Details (if issued or check payment) */}
          {(voucher.bank_name || voucher.payment_type === 'Check') && (
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                <Building size={16} className="text-gray-400" /> Bank Details
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Bank</label>
                  <div className="font-medium text-sm text-gray-900">{voucher.bank_name || '-'}</div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Check No.</label>
                  <div className="font-mono font-medium text-sm text-gray-900">{voucher.check_no || '-'}</div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Check Date</label>
                  <div className="font-medium text-sm text-gray-900">{voucher.check_date ? new Date(voucher.check_date).toLocaleDateString() : '-'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="grid grid-cols-3 gap-4 text-xs text-gray-500 border-t border-gray-100 pt-4">
            <div>
              <span className="font-bold block text-gray-400 uppercase text-[10px] mb-0.5">Company</span> 
              <span className="text-gray-700 font-medium">{voucher.company_name}</span>
            </div>
            <div>
              <span className="font-bold block text-gray-400 uppercase text-[10px] mb-0.5">Category</span> 
              <span className="text-gray-700 font-medium">{voucher.category || '-'}</span>
            </div>
            {voucher.deadline_date && (
               <div>
                <span className="font-bold block text-gray-400 uppercase text-[10px] mb-0.5">Deadline</span> 
                <span className="text-gray-700 font-medium">{new Date(voucher.deadline_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer Actions - Fixed */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-lg text-sm transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ApproveVoucherModal = ({ isOpen, onClose, onConfirm, voucher, user, isProcessing }) => {
  if (!isOpen || !voucher) return null;
  
  const isLiaison = user?.role === 'liaison';
  const isCheckOrEncashment = voucher.payment_type === 'Check' || voucher.payment_type === 'Encashment';

  const handleConfirm = () => {
      onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl transform transition-all scale-100 border border-gray-100 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
             <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg text-green-600 shadow-sm">
                    <CheckCircle size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900">{isLiaison ? 'Process Issuance Details' : 'Approve Issuance'}</h3>
                    <p className="text-xs text-gray-500 font-medium">Review details before {isLiaison ? 'submitting' : 'approving'}</p>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
            {/* Header Info - Minimized */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y md:divide-y-0 md:divide-x divide-gray-200 grid grid-cols-1 md:grid-cols-4">
                <div className="p-2 md:p-3 text-center md:text-left">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Voucher No</label>
                    <div className="font-mono font-bold text-sm text-gray-900">{voucher.voucher_no}</div>
                </div>
                <div className="p-2 md:p-3 text-center md:text-left">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Date</label>
                    <div className="text-sm font-medium text-gray-900">{new Date(voucher.date).toLocaleDateString()}</div>
                </div>
                <div className="p-2 md:p-3 text-center md:text-left">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Created By</label>
                    <div className="text-sm font-medium text-gray-900 truncate">{voucher.created_by_name || voucher.created_by_user || 'System'}</div>
                </div>
                <div className="p-2 md:p-3 text-center md:text-left">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Certified By</label>
                    <div className="text-sm font-medium text-gray-900 truncate">{voucher.certified_by || '-'}</div>
                </div>
            </div>

            {/* Amount & Payee */}
            <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-200"></div>
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Amount to Issue</div>
                <div className="text-4xl font-bold text-gray-900 font-mono mb-2 tracking-tight">
                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(voucher.amount)}
                </div>
                <div className="text-sm font-medium text-gray-600">To: <span className="font-bold text-gray-900 text-lg ml-1">{voucher.payee}</span></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Transaction Details */}
                <div className="space-y-4">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm border-b border-gray-100 pb-2">
                        <FileText size={16} className="text-gray-500" /> Transaction Details
                    </h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Company</label>
                            <div className="font-medium text-sm text-gray-900">{voucher.company_name}</div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                            <div className="font-medium text-sm text-gray-900">{voucher.category || '-'}</div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Particulars</label>
                            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                                {voucher.description || 'No description'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Payment Details */}
                <div className="space-y-4">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm border-b border-gray-100 pb-2">
                        <CreditCard size={16} className="text-gray-500" /> Payment Details
                    </h4>
                    <div className="space-y-3">
                        
                        {(isCheckOrEncashment && (voucher.check_no || voucher.bank_name)) && (
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Bank</label>
                                    <div className="font-medium text-sm text-gray-900">{voucher.bank_name || '-'}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Check No</label>
                                        <div className="font-mono font-bold text-sm text-blue-600">{voucher.check_no || '-'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Date</label>
                                        <div className="font-medium text-sm text-gray-900">{voucher.check_date ? new Date(voucher.check_date).toLocaleDateString() : '-'}</div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Type</label>
                                    <div className="font-medium text-sm text-gray-900">{voucher.check_date ? 'Post Dated Check' : 'Standard Check'}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Attachments */}
            {(voucher.attachment_paths || voucher.attachment_path) && (
                <div className="border-t border-gray-100 pt-4">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm mb-3">
                        <Paperclip size={16} className="text-gray-500" /> Attachments
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        {/* Helper to render attachment item */}
                        {(() => {
                            const paths = voucher.attachment_paths ? voucher.attachment_paths.split('||') : [voucher.attachment_path];
                            const names = voucher.attachment_names ? voucher.attachment_names.split('||') : (voucher.attachment_paths ? [] : [voucher.attachment_path.split('/').pop()]);
                            
                            return paths.map((path, index) => {
                                const name = names[index] || path.split('/').pop();
                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(path);
                                const fileUrl = `${path}`;
                                
                                return (
                                    <div key={index} className="bg-gray-50 rounded-xl border border-gray-200 p-3 flex flex-col items-center group hover:border-blue-300 transition-colors">
                                        {isImage ? (
                                            <div className="h-32 w-full flex items-center justify-center mb-2 bg-white rounded-lg overflow-hidden border border-gray-100">
                                                <img 
                                                    src={fileUrl} 
                                                    alt={name} 
                                                    className="h-full w-full object-contain cursor-pointer hover:scale-105 transition-transform"
                                                    onClick={() => window.open(fileUrl, '_blank')}
                                                    onError={(e) => {e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=File';}}
                                                />
                                            </div>
                                        ) : (
                                            <div 
                                                className="h-32 w-full flex items-center justify-center mb-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors"
                                                onClick={() => window.open(fileUrl, '_blank')}
                                            >
                                                <FileText size={48} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                                            </div>
                                        )}
                                        <span className="text-xs text-gray-600 font-medium truncate w-full text-center mb-2" title={name}>{name}</span>
                                        <a 
                                            href={fileUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider flex items-center gap-1 hover:underline"
                                        >
                                            View / Download <ExternalLink size={10} />
                                        </a>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            )}
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end gap-3">
            <button 
                onClick={onClose}
                disabled={isProcessing}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-white hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Cancel
            </button>
            <button 
                onClick={handleConfirm}
                disabled={isProcessing}
                className={`px-6 py-2.5 border border-transparent rounded-xl shadow-lg shadow-green-200 text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 ${isProcessing ? 'opacity-75 cursor-not-allowed transform-none' : ''}`}
            >
                {isProcessing ? (
                    <>
                        <RefreshCw size={18} className="animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <CheckCircle size={18} />
                        {isLiaison ? 'Submit for Admin Approval' : 'Confirm Approval'}
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

const VoidReasonModal = ({ isOpen, onClose, onSubmit, isProcessing }) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onSubmit(reason);
    setReason('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="bg-red-100 p-1.5 rounded-lg text-red-600 shadow-sm"><AlertTriangle size={18} /></div>
                Request Void
            </h3>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-4">
                <p className="text-sm text-red-800 font-medium">
                    Please provide a reason for voiding this voucher. This action will require admin approval.
                </p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Void Reason</label>
              <textarea 
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-3 transition-all min-h-[100px] resize-none"
                placeholder="e.g. Check printing error, Wrong amount, etc."
              />
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isProcessing}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                  type="submit" 
                  disabled={isProcessing}
                  className={`px-5 py-2.5 border border-transparent rounded-xl shadow-lg shadow-red-200 text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 ${isProcessing ? 'opacity-75 cursor-not-allowed transform-none' : ''}`}
              >
                  {isProcessing ? (
                      <>
                          <RefreshCw size={18} className="animate-spin" />
                          Processing...
                      </>
                  ) : (
                      'Submit Request'
                  )}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};

const VoidReviewModal = ({ isOpen, onClose, onApprove, onReject, voucher, isProcessing }) => {
  if (!isOpen || !voucher) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-orange-100 p-3 rounded-full shadow-sm">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Review Void Request</h3>
        </div>
        
        <div className="mb-8">
            <p className="text-gray-600 mb-4 text-lg">
                Reviewing void request for voucher <span className="font-bold text-gray-900">{voucher.voucher_no}</span>.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Reason for Void</label>
                <p className="text-sm text-gray-800 font-medium italic">"{voucher.void_reason}"</p>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onReject}
            disabled={isProcessing}
            className={`px-4 py-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors flex items-center justify-center gap-2 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <X size={18} />
            Reject Request
          </button>
          <button 
            onClick={onApprove}
            disabled={isProcessing}
            className={`px-4 py-3 border border-transparent rounded-xl shadow-lg shadow-red-200 text-sm font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 ${isProcessing ? 'opacity-75 cursor-not-allowed transform-none' : ''}`}
          >
            {isProcessing ? (
                <>
                    <RefreshCw size={18} className="animate-spin" />
                    Processing...
                </>
            ) : (
                <>
                    <CheckCircle size={18} />
                    Approve Void
                </>
            )}
          </button>
        </div>
        <button 
            onClick={onClose}
            className="w-full mt-3 text-center text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
        >
            Cancel
        </button>
      </div>
    </div>
  );
};

const DeleteCompanyModal = ({ isOpen, onClose, onConfirm, companyName, password, setPassword, isProcessing }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-red-100 p-3 rounded-full shadow-sm">
            <Trash2 className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Delete Company</h3>
        </div>
        <p className="text-gray-600 mb-6 text-lg leading-relaxed">
          Are you sure you want to delete <span className="font-bold text-gray-900">"{companyName}"</span>? 
          <br/><span className="text-red-600 text-sm font-bold">Warning: This will delete all associated users, vouchers, and data.</span>
        </p>
        
        <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Admin Password Required</label>
            <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                placeholder="Enter your password"
                autoFocus
            />
        </div>

        <div className="flex justify-end space-x-3">
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={!password || isProcessing}
            className={`px-6 py-2.5 border border-transparent rounded-xl shadow-lg shadow-red-200 text-sm font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none transition-all transform hover:-translate-y-0.5 flex items-center gap-2 ${(!password || isProcessing) ? 'opacity-50 cursor-not-allowed transform-none' : ''}`}
          >
            {isProcessing ? (
                <>
                    <RefreshCw size={18} className="animate-spin" />
                    Processing...
                </>
            ) : (
                <>
                    <Trash2 size={18} />
                    Delete Company
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteBankModal = ({ isOpen, onClose, onConfirm, bankName, password, setPassword, isProcessing }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-red-100 p-3 rounded-full shadow-sm">
            <Trash2 className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Delete Bank Account</h3>
        </div>
        <p className="text-gray-600 mb-6 text-lg leading-relaxed">
          Are you sure you want to delete <span className="font-bold text-gray-900">"{bankName}"</span>? 
          <br/><span className="text-red-600 text-sm font-bold">Warning: This will delete all associated checks and transaction history.</span>
        </p>
        
        <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Admin Password Required</label>
            <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                placeholder="Enter your password"
                autoFocus
            />
        </div>

        <div className="flex justify-end space-x-3">
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={!password || isProcessing}
            className={`px-6 py-2.5 border border-transparent rounded-xl shadow-lg shadow-red-200 text-sm font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none transition-all transform hover:-translate-y-0.5 flex items-center gap-2 ${(!password || isProcessing) ? 'opacity-50 cursor-not-allowed transform-none' : ''}`}
          >
            {isProcessing ? (
                <>
                    <RefreshCw size={18} className="animate-spin" />
                    Processing...
                </>
            ) : (
                <>
                    <Trash2 size={18} />
                    Delete Bank
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const AlertModal = ({ isOpen, onClose, title, message, type }) => {
  if (!isOpen) return null;
  
  const getIcon = () => {
    switch(type) {
      case 'success': return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'error': return <AlertTriangle className="h-8 w-8 text-red-600" />;
      default: return <div className="bg-blue-100 p-3 rounded-full shadow-sm"><FileText className="h-8 w-8 text-blue-600" /></div>;
    }
  };

  const getBgColor = () => {
    switch(type) {
      case 'success': return 'bg-green-100';
      case 'error': return 'bg-red-100';
      default: return 'bg-blue-100';
    }
  };

  const getButtonColor = () => {
    switch(type) {
      case 'success': return 'bg-green-600 hover:bg-green-700 shadow-green-200';
      case 'error': return 'bg-red-600 hover:bg-red-700 shadow-red-200';
      default: return 'bg-blue-600 hover:bg-blue-700 shadow-blue-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className={`${getBgColor()} p-3 rounded-full shadow-sm`}>
            {getIcon()}
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{title || (type === 'error' ? 'Error' : 'Notification')}</h3>
        </div>
        <p className="text-gray-600 mb-8 text-lg leading-relaxed">{message}</p>
        <div className="flex justify-end">
          <button 
            onClick={onClose}
            className={`px-6 py-2.5 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white focus:outline-none transition-all transform hover:-translate-y-0.5 ${getButtonColor()}`}
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ user, onLogout }) => {
  // View State
  const [activeView, setActiveView] = useState(() => localStorage.getItem('dashboard_active_view') || 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [banksExpanded, setBanksExpanded] = useState(true);
  const [issuancesExpanded, setIssuancesExpanded] = useState(true);
  const [settingsTab, setSettingsTab] = useState(() => localStorage.getItem('dashboard_settings_tab') || 'profile');

  // Persistence Effects
  useEffect(() => {
      localStorage.setItem('dashboard_active_view', activeView);
  }, [activeView]);

  useEffect(() => {
      localStorage.setItem('dashboard_settings_tab', settingsTab);
  }, [settingsTab]);

  // Data State
  const [vouchers, setVouchers] = useState([]);
  const [urgentVouchers, setUrgentVouchers] = useState([]);
  const [urgentSort, setUrgentSort] = useState('date'); // 'date' or 'urgency'
  const [stats, setStats] = useState(null);
  
  // Initialize from LocalStorage for instant load
  const [banks, setBanks] = useState(() => {
      try {
          const saved = localStorage.getItem('dashboard_banks');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });
  const [companies, setCompanies] = useState(() => {
      try {
          const saved = localStorage.getItem('dashboard_companies');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });

  const [categories, setCategories] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileRequests, setProfileRequests] = useState([]);
  
  // UI State
  const [showForm, setShowForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [printVoucher, setPrintVoucher] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterValue, setFilterValue] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [voucherToApprove, setVoucherToApprove] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [addBankModalOpen, setAddBankModalOpen] = useState(false);
  const [viewingVoucher, setViewingVoucher] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(null);
  const [recentActivityIndex, setRecentActivityIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voucherToVoid, setVoucherToVoid] = useState(null);
  const [voidReviewVoucher, setVoidReviewVoucher] = useState(null);
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });
  const [deleteCategoryModalOpen, setDeleteCategoryModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [cancelVoucherModalOpen, setCancelVoucherModalOpen] = useState(false);
  const [voucherToCancel, setVoucherToCancel] = useState(null);
  const [deleteCompanyModalOpen, setDeleteCompanyModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [forceDeleteModalOpen, setForceDeleteModalOpen] = useState(false);
  const [voucherToForceDelete, setVoucherToForceDelete] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [fileToImport, setFileToImport] = useState(null);
  const [deleteBankModalOpen, setDeleteBankModalOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState(null);
  const [issuanceTab, setIssuanceTab] = useState('pending'); // 'all', 'pending', 'issued'

  const showAlert = (message, type = 'info') => {
    setAlertModal({ 
        isOpen: true, 
        title: type === 'error' ? 'Error' : (type === 'success' ? 'Success' : 'Notification'), 
        message, 
        type 
    });
  };

  // Calculate slides for Recent Activity Carousel
  const dashboardSlides = useMemo(() => {
    let slides = [{ id: 'all', name: 'All Activity', data: vouchers, pending: 0 }];
    
    if (user.role === 'admin' || user.role === 'liaison' || user.role === 'hr') {
        const companySlides = companies.map(c => {
            const companyVouchers = vouchers.filter(v => v.company_id === c.id);
            const companyStat = stats?.by_company?.find(s => s.id === c.id);
            const pending = user.role === 'liaison' 
                ? (companyStat?.pending_liaison || 0) 
                : (companyStat?.pending_admin || 0);
            
            // Include if there's activity OR pending items
            if (companyVouchers.length === 0 && pending === 0) return null;

            return {
                id: c.id,
                name: c.name,
                data: companyVouchers,
                pending: pending
            };
        }).filter(Boolean);
        
        slides = [...slides, ...companySlides];
    }
    return slides;
  }, [vouchers, companies, stats, user]);

  // Auto-rotate carousel
  useEffect(() => {
    if (activeView !== 'dashboard' || dashboardSlides.length <= 1 || isPaused) return;
    
    const interval = setInterval(() => {
        setRecentActivityIndex(prev => (prev + 1) % dashboardSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeView, dashboardSlides.length, isPaused]);
  
  // Settings Form State
  const [profileForm, setProfileForm] = useState({ username: '', password: '', full_name: '' });
  const [signatureFile, setSignatureFile] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategoryCompany, setSelectedCategoryCompany] = useState('');
  const [selectedIssuanceCompany, setSelectedIssuanceCompany] = useState(() => {
    const saved = localStorage.getItem('dashboard_selected_company');
    return saved ? parseInt(saved) : null;
  });
  const [newCompanyForm, setNewCompanyForm] = useState({ name: '', prefix: '', address: '', contact: '' });

  useEffect(() => {
      if (selectedIssuanceCompany) {
          localStorage.setItem('dashboard_selected_company', selectedIssuanceCompany);
      } else {
          localStorage.removeItem('dashboard_selected_company');
      }
  }, [selectedIssuanceCompany]);

  // User Management State
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'staff', company_id: '' });

  // Print Settings State
  const [printSettings, setPrintSettings] = useState({
    marginTop: '0',
    marginLeft: '0',
    scale: '100',
    showPreparedBy: true,
    headerTitle: '',
    logoUrl: '',
    addressLine1: '',
    addressLine2: '',
    preparedByLabel: 'Prepared By',
    checkedByLabel: 'Checked By',
    approvedByLabel: 'Approved By',
    checkIssuedByLabel: 'Check Issued By',
    receivedByLabel: 'Received By'
  });

  // Offline Approval & Claim State
  const [offlineApproveModalOpen, setOfflineApproveModalOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [approvalAttachment, setApprovalAttachment] = useState(null);
  const [receivedByName, setReceivedByName] = useState('');
  const [voucherToOfflineApprove, setVoucherToOfflineApprove] = useState(null);
  const [voucherToClaim, setVoucherToClaim] = useState(null);

  const componentRef = useRef();
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedSettings = localStorage.getItem('voucher_print_settings');
    if (savedSettings) {
      setPrintSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchBanks();
    fetchCategories();
    if (user.role === 'admin' || user.role === 'liaison' || user.role === 'hr') {
        fetchCompanies();
    }
    // Initial fetch for vouchers if on issuances or dashboard (if we show recent)
    fetchVouchers();
  }, [user]);

  useEffect(() => {
    if (activeView === 'settings') {
        fetchProfile();
        if (user.role === 'admin') {
            fetchProfileRequests();
        }
        if (settingsTab === 'categories') {
            fetchCompanies();
        }
    }
    if (activeView === 'banks-dashboard' && user.role === 'admin') {
        fetchCompanies();
    }
  }, [activeView, user, settingsTab]);

  useEffect(() => {
    if (settingsTab === 'categories') {
        fetchCategories();
    }
  }, [selectedCategoryCompany]);

  useEffect(() => {
    if (activeView === 'issuances' && !selectedIssuanceCompany) {
        fetchUrgentVouchers();
    }
  }, [activeView, selectedIssuanceCompany, urgentSort]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchVouchers();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [filterType, filterValue, searchQuery, filterCategory, selectedIssuanceCompany]);

  const fetchUrgentVouchers = async () => {
    try {
      const res = await axios.get(`/vouchers/urgent?sort=${urgentSort}`);
      setUrgentVouchers(res.data);
    } catch (err) {
      console.error("Error fetching urgent vouchers", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const companyId = user.company_id || selectedCategoryCompany;
      const res = await axios.get(`/categories?company_id=${companyId || ''}`);
      setCategories(res.data || []);
    } catch (err) {
      console.error("Error fetching categories", err);
      setCategories([]);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const companyId = user.company_id || selectedCategoryCompany;
      
      // Admin must select a company for general categories
      if (user.role === 'admin' && !companyId) {
          showAlert("Please select a company first", 'error');
          setIsProcessing(false);
          return;
      }
      
      await axios.post('/categories', { 
          name: newCategory,
          company_id: companyId || null // Send null if empty string
      });
      setNewCategory('');
      fetchCategories();
    } catch (err) {
      showAlert('Error adding category: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleAddCompany = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await axios.post('/companies', newCompanyForm);
      setNewCompanyForm({ name: '', prefix: '', address: '', contact: '' });
      fetchCompanies();
      showAlert('Company added successfully', 'success');
    } catch (err) {
      showAlert('Error adding company: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCategory = (category) => {
    setCategoryToDelete(category);
    setDeleteCategoryModalOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsProcessing(true);
    try {
      await axios.delete(`/categories/${categoryToDelete.id}`);
      fetchCategories();
      setDeleteCategoryModalOpen(false);
      setCategoryToDelete(null);
    } catch (err) {
      showAlert('Error deleting category', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCompany = (company) => {
    setCompanyToDelete(company);
    setAdminPassword('');
    setDeleteCompanyModalOpen(true);
  };

  const confirmDeleteCompany = async () => {
    if (!companyToDelete || !adminPassword) return;
    setIsProcessing(true);
    try {
      await axios.delete(`/companies/${companyToDelete.id}`, {
        data: { 
            password: adminPassword,
            admin_id: user.id 
        }
      });
      fetchCompanies();
      setDeleteCompanyModalOpen(false);
      setCompanyToDelete(null);
      setAdminPassword('');
      showAlert('Company deleted successfully', 'success');
    } catch (err) {
      showAlert('Error deleting company: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    setProfileError(null);
    try {
        const res = await axios.get(`/profile/${user.id}`);
        if (res.data) {
            setProfileData(res.data);
            setProfileForm({ 
                username: res.data.username || '', 
                password: '', 
                full_name: res.data.full_name || '' 
            });
        } else {
            throw new Error("No profile data received");
        }
    } catch (err) {
        console.error(err);
        setProfileError("Failed to load profile data.");
    } finally {
        setIsLoadingProfile(false);
    }
  };

  const fetchProfileRequests = async () => {
    try {
        const res = await axios.get('/profile/requests/pending');
        setProfileRequests(res.data || []);
    } catch (err) {
        console.error(err);
        setProfileRequests([]);
    }
  };

  useEffect(() => {
    if (settingsTab === 'users' && user.role === 'admin') {
        fetchUsers();
        fetchCompanies();
    }
  }, [settingsTab, user]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await axios.post('/users', userForm);
      showAlert('User created successfully', 'success');
      setShowUserModal(false);
      setUserForm({ username: '', password: '', role: 'staff', company_id: '' });
      fetchUsers();
    } catch (err) {
      showAlert('Error saving user', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setDeleteUserModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsProcessing(true);
    try {
      await axios.delete(`/users/${userToDelete.id}`);
      fetchUsers();
      setDeleteUserModalOpen(false);
      setUserToDelete(null);
    } catch (err) {
      showAlert('Error deleting user', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const savePrintSettings = () => {
    localStorage.setItem('voucher_print_settings', JSON.stringify(printSettings));
    showAlert('Print settings saved!', 'success');
  };

  const handleBackup = () => {
    window.open('/backup', '_blank');
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileToImport(file);
      setImportModalOpen(true);
    }
    e.target.value = '';
  };

  const confirmImport = async () => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('database', fileToImport);
      
      // Use direct path as axios instance has baseURL configured
      await axios.post('/restore', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });

      setImportModalOpen(false);
      setFileToImport(null);
      showAlert('Database restored successfully. Reloading...', 'success');
      setTimeout(() => {
          window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Import error:', error);
      let msg = error.response?.data?.error;
      if (!msg) {
          msg = error.message ? `Failed to restore database: ${error.message}` : 'Failed to restore database (Unknown error)';
      }
      showAlert(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteBank = (bank) => {
    setBankToDelete(bank);
    setAdminPassword(''); // Reuse adminPassword state which is already defined
    setDeleteBankModalOpen(true);
  };

  const confirmDeleteBank = async () => {
    if (!bankToDelete || !adminPassword) return;
    setIsProcessing(true);
    try {
      await axios.delete(`/banks/${bankToDelete.id}`, {
        data: { 
            password: adminPassword,
            admin_id: user.id 
        }
      });
      fetchBanks();
      setDeleteBankModalOpen(false);
      setBankToDelete(null);
      setAdminPassword('');
      showAlert('Bank account deleted successfully', 'success');
    } catch (err) {
      showAlert('Error deleting bank account: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setResetModalOpen(true);
  };

  const confirmReset = async () => {
    setIsProcessing(true);
    try {
      await axios.post('/reset');
      setResetModalOpen(false);
      showAlert('System reset successfully', 'success');
      fetchStats();
      fetchVouchers();
    } catch (err) {
      showAlert('Error resetting system', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
        const formData = new FormData();
        formData.append('username', profileForm.username);
        if (profileForm.password) formData.append('password', profileForm.password);
        formData.append('full_name', profileForm.full_name);
        if (signatureFile) formData.append('signature', signatureFile);

        if (user.role === 'admin') {
            await axios.put(`/users/${user.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showAlert('Profile updated successfully.', 'success');
            fetchProfile();
        } else {
            formData.append('user_id', user.id);
            // Rename username/password fields for request endpoint if needed, but endpoint expects new_username etc
            // But wait, the FormData keys need to match what the endpoint expects.
            // Admin PUT expects: username, password, full_name, signature
            // Request POST expects: user_id, new_username, new_password, new_full_name, signature (from file)
            
            // Let's create a NEW FormData for the request to be clean
            const requestData = new FormData();
            requestData.append('user_id', user.id);
            requestData.append('new_username', profileForm.username);
            if (profileForm.password) requestData.append('new_password', profileForm.password);
            requestData.append('new_full_name', profileForm.full_name);
            if (signatureFile) requestData.append('signature', signatureFile);

            await axios.post('/profile/request', requestData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showAlert('Profile update request submitted for Admin approval.', 'success');
        }
        setIsEditingProfile(false);
        setSignatureFile(null); // Reset file input
    } catch (err) {
        console.error(err);
        showAlert('Error submitting request: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleRequestAction = async (id, action) => {
      try {
          await axios.post(`/profile/requests/${id}/${action}`);
          fetchProfileRequests();
          showAlert(`Request ${action}ed`, 'success');
      } catch (err) {
          const errorMessage = err.response?.data?.error || err.message || 'Error processing request';
          showAlert(errorMessage, 'error');
      }
  };

  const fetchVouchers = async () => {
    try {
      const effectiveCompanyId = selectedIssuanceCompany || user.company_id || '';
      let url = `/vouchers?company_id=${effectiveCompanyId}&role=${user.role}`;
      if (filterType !== 'all' && filterValue) {
        url += `&filter_type=${filterType}&filter_value=${filterValue}`;
      }
      if (filterCategory !== 'all') {
        url += `&category=${filterCategory}`;
      }
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      const res = await axios.get(url);
      setVouchers(res.data);
    } catch (err) {
      console.error("Error fetching vouchers", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`/stats?company_id=${user.company_id || ''}&role=${user.role}`);
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching stats", err);
    }
  };

  const fetchBanks = async () => {
    try {
      const res = await axios.get(`/banks?company_id=${user.company_id || ''}`);
      setBanks(res.data || []);
      localStorage.setItem('dashboard_banks', JSON.stringify(res.data || []));
    } catch (err) {
      console.error("Error fetching banks", err);
      // Do not clear banks on error to keep cached data visible
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await axios.get('/companies');
      setCompanies(res.data || []);
      localStorage.setItem('dashboard_companies', JSON.stringify(res.data || []));
    } catch (err) {
      console.error("Error fetching companies", err);
      // Do not clear companies on error
    }
  };

  const handleAddAccount = async (formData) => {
    setIsProcessing(true);
    try {
      await axios.post('/banks', { ...formData, company_id: user.company_id || formData.company_id });
      fetchBanks();
      setAddBankModalOpen(false);
      showAlert('Bank account added successfully', 'success');
    } catch (err) {
      showAlert('Error creating account', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = (voucher) => {
    setPrintVoucher(voucher);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleApprove = (voucher) => {
    setVoucherToApprove(voucher);
    setApproveModalOpen(true);
  };

  const confirmApprove = async (extraData = {}) => {
    if (!voucherToApprove) return;
    setIsProcessing(true);
    try {
      const isLiaison = user.role === 'liaison';
      const targetStatus = isLiaison ? 'Pending Admin' : 'Issued';

      await axios.put(`/vouchers/${voucherToApprove.id}/status`, { 
        status: targetStatus,
        ...extraData
      });
      fetchVouchers();
      fetchStats();
      setApproveModalOpen(false);
      setVoucherToApprove(null);
      if (isLiaison) {
        showAlert('Voucher submitted for Admin approval', 'success');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Error approving voucher';
      showAlert(errorMessage, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOfflineApprove = (voucher) => {
      setVoucherToOfflineApprove(voucher);
      setApprovalAttachment(null);
      setOfflineApproveModalOpen(true);
  };

  const confirmOfflineApprove = async () => {
      if (!voucherToOfflineApprove || !approvalAttachment) {
          showAlert("Please upload the approval document", "error");
          return;
      }
      setIsProcessing(true);
      try {
          const formData = new FormData();
          formData.append('status', 'Issued');
          formData.append('approval_attachment', approvalAttachment);
          // Optional: we could add manually typed approver name if we add an input for it. 
          // For now, let's assume 'Offline Approval' or similar is handled by backend default logic unless we add input.
          // Or let's just add 'Offline Approval (Attachment)' as approved_by if we want.
          formData.append('approved_by', 'Offline Approval');

          await axios.put(`/vouchers/${voucherToOfflineApprove.id}/status`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          fetchVouchers();
          fetchStats();
          setOfflineApproveModalOpen(false);
          setVoucherToOfflineApprove(null);
          setApprovalAttachment(null);
          showAlert('Voucher approved with attachment', 'success');
      } catch (err) {
          console.error(err);
          showAlert(err.response?.data?.error || 'Error processing offline approval', 'error');
      } finally {
          setIsProcessing(false);
      }
  };

  const handleClaim = (voucher) => {
      setVoucherToClaim(voucher);
      setReceivedByName('');
      setClaimModalOpen(true);
  };

  const confirmClaim = async () => {
      if (!voucherToClaim || !receivedByName.trim()) {
          showAlert("Please enter who received the payment", "error");
          return;
      }
      setIsProcessing(true);
      try {
          await axios.put(`/vouchers/${voucherToClaim.id}/status`, {
              status: voucherToClaim.payment_type === 'Check' ? 'Claimed' : 'Issued', // If Encashment, 'Issued' is kinda final unless we have 'Claimed' for it too.
              // Actually, User wants to record 'received_by'.
              // For Checks, status -> 'Claimed' is standard.
              // For Encashment, status -> 'Claimed' might be fine too if we support it.
              // Let's use 'Claimed' for consistent tracking.
              received_by: receivedByName
          });

           // If it was a check, this might need to sync with checks table?
           // The backend logic handles "Claimed" update for checks table if check exists.
           // But wait, my checks code handles 'Claimed' status.

          fetchVouchers();
          setClaimModalOpen(false);
          setVoucherToClaim(null);
          setReceivedByName('');
          showAlert('Voucher marked as claimed', 'success');
      } catch (err) {
          showAlert(err.response?.data?.error || 'Error marking as claimed', 'error');
      } finally {
          setIsProcessing(false);
      }
  };

  const handleRequestVoid = (id) => {
    setVoucherToVoid(id);
    setVoidModalOpen(true);
  };

  const submitVoidRequest = async (reason) => {
    setIsProcessing(true);
    try {
      await axios.put(`/vouchers/${voucherToVoid}/status`, { 
          status: 'Void Pending Approval',
          void_reason: reason
      });
      fetchVouchers();
      fetchStats();
      setVoidModalOpen(false);
      setVoucherToVoid(null);
      setSuccessModal({
        isOpen: true,
        title: 'Request Submitted',
        message: 'The void request has been successfully submitted and is pending admin approval.'
      });
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Error requesting void';
      showAlert(errorMessage, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const processVoidReview = async (approved) => {
    if (!voidReviewVoucher) return;
    setIsProcessing(true);
    try {
        const status = approved ? 'Voided' : 'Issued';
        await axios.put(`/vouchers/${voidReviewVoucher.id}/status`, { status });
        
        fetchVouchers();
        fetchStats();
        setVoidReviewVoucher(null);
        
        setSuccessModal({
            isOpen: true,
            title: approved ? 'Voucher Voided' : 'Request Rejected',
            message: approved 
                ? 'The voucher has been successfully voided.' 
                : 'The void request has been rejected and the voucher is now Issued.'
        });
    } catch (err) {
        const errorMessage = err.response?.data?.error || err.message || 'Error processing void review';
        showAlert(errorMessage, 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCancelVoucher = (id) => {
    setVoucherToCancel(id);
    setCancelVoucherModalOpen(true);
  };

  const confirmCancelVoucher = async () => {
    if (!voucherToCancel) return;
    setIsProcessing(true);
    try {
      await axios.put(`/vouchers/${voucherToCancel}`, { status: 'Cancelled' });
      fetchVouchers();
      fetchStats();
      setCancelVoucherModalOpen(false);
      setVoucherToCancel(null);
      showAlert('Voucher request cancelled.', 'success');
    } catch (err) {
      showAlert('Error cancelling voucher', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForceDelete = (voucher) => {
      setVoucherToForceDelete(voucher);
      setForceDeleteModalOpen(true);
  };

  const confirmForceDelete = async () => {
      if (!voucherToForceDelete) return;
      setIsProcessing(true);
      try {
          await axios.delete(`/vouchers/${voucherToForceDelete.id}`);
          fetchVouchers();
          fetchStats();
          setForceDeleteModalOpen(false);
          setVoucherToForceDelete(null);
          showAlert('Voucher force deleted successfully. Check number is now potentially reusable.', 'success');
      } catch (err) {
          showAlert(err.response?.data?.error || 'Error deleting voucher', 'error');
      } finally {
          setIsProcessing(false);
      }
  };

  const handleProcess = (voucher) => {
    setEditingVoucher(voucher);
    setShowForm(true);
  };

  const renderFilterInput = () => {
    const inputClasses = "block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
    
    switch (filterType) {
      case 'day':
        return (
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            <input type="date" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className={inputClasses} />
          </div>
        );
      case 'week':
        return (
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            <input type="week" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className={inputClasses} />
          </div>
        );
      case 'month':
        return (
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            <input type="month" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className={inputClasses} />
          </div>
        );
      case 'year':
        return (
          <div className="relative rounded-md shadow-sm group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className={`${inputClasses} appearance-none cursor-pointer`}>
              <option value="">Select Year</option>
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 group-hover:text-blue-600 transition-colors">
                <ChevronDown size={16} strokeWidth={2.5} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // --- Views ---

  const renderIssuancesOverview = () => {
    // Map all companies to include their stats (or default to 0)
    const companyCards = companies.map(company => {
        const stat = stats?.by_company?.find(s => s.id === company.id) || { 
            pending_liaison: 0, 
            pending_admin: 0, 
            total_count: 0 
        };
        return { ...company, ...stat };
    });
    
    return (
        <div className="space-y-8 animate-fade-in p-4 md:p-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Issuances Overview</h2>
                    <p className="text-gray-500 mt-1">Select a company to view details or process vouchers.</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {companyCards.map(company => {
                    const pendingCount = user.role === 'liaison' ? company.pending_liaison : company.pending_admin;
                    const label = user.role === 'liaison' ? 'Pending Issuance' : 'Pending Approval';
                    const hasPending = pendingCount > 0;
                    
                    return (
                        <div 
                            key={company.id} 
                            onClick={() => setSelectedIssuanceCompany(company.id)}
                            className={`bg-white overflow-hidden shadow-sm rounded-xl border transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-0.5 group relative ${hasPending ? 'border-orange-200' : 'border-gray-100'}`}
                        >
                            {hasPending && <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full -mr-8 -mt-8 z-0 transition-transform group-hover:scale-110"></div>}
                            
                            <div className="p-4 relative z-10">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`p-2 rounded-lg flex-shrink-0 ${hasPending ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600'} group-hover:scale-110 transition-transform shadow-sm`}>
                                            <Building size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base font-bold text-gray-900 truncate">{company.name}</h3>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{company.prefix || 'No Prefix'}</p>
                                        </div>
                                    </div>
                                    {hasPending ? (
                                        <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200 animate-pulse flex-shrink-0">
                                            Action
                                        </span>
                                    ) : (
                                        <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 flex-shrink-0">
                                            Clear
                                        </span>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                                    <div>
                                        <p className={`text-2xl font-bold tracking-tight ${hasPending ? 'text-orange-600' : 'text-gray-900'}`}>
                                            {pendingCount}
                                        </p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{label}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold tracking-tight text-gray-700">
                                            {company.total_count}
                                        </p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Total</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {companyCards.length === 0 && (
                    <div className="col-span-full text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                        <div className="bg-gray-50 p-4 rounded-full inline-block mb-4">
                            <Building className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No companies found</h3>
                        <p className="text-gray-500 mt-1">There are no companies available.</p>
                    </div>
                )}
            </div>

            <div className="mt-10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="bg-red-100 p-1.5 rounded-lg text-red-600"><AlertTriangle size={20} /></div>
                        Pending Vouchers
                    </h3>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setUrgentSort('date')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${urgentSort === 'date' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Sort by Deadline
                        </button>
                        <button 
                            onClick={() => setUrgentSort('urgency')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${urgentSort === 'urgency' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Sort by Urgency
                        </button>
                    </div>
                </div>
                <div className="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[400px]">
                    <div className="overflow-x-auto custom-scrollbar flex-1">
                        <table className="min-w-full divide-y divide-gray-200 relative">
                            <thead className="bg-gray-50/50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1 whitespace-nowrap bg-gray-50/95 backdrop-blur-sm">Urgency</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50/95 backdrop-blur-sm">Deadline</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50/95 backdrop-blur-sm">Company</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[300px] bg-gray-50/95 backdrop-blur-sm">Payee</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50/95 backdrop-blur-sm">Amount</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1 whitespace-nowrap bg-gray-50/95 backdrop-blur-sm">Status</th>
                                    <th className="px-2 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50/95 backdrop-blur-sm sticky right-0 z-20 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {urgentVouchers.map(v => (
                                    <tr key={v.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full w-max border ${
                                                    v.urgency === 'Critical' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    v.urgency === 'Urgent' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                    'bg-green-50 text-green-700 border-green-100'
                                                }`}>
                                                    {v.urgency}
                                                </span>
                                                {v.check_date && (
                                                    <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100 w-max">
                                                        PDC
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                                            {v.deadline_date ? new Date(v.deadline_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{v.company_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{v.payee}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold font-mono">
                                            {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(v.amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{v.status}</td>
                                        <td className="px-2 py-4 whitespace-nowrap text-center text-sm font-medium sticky right-0 bg-white z-10 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                                            <button 
                                                onClick={() => {
                                                    setSelectedIssuanceCompany(v.company_id);
                                                    setActiveView('issuances');
                                                }}
                                                className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="View Details"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {urgentVouchers.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-400 italic">No urgent vouchers found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const renderBanksDashboardView = () => {
    const totalBalance = banks.reduce((sum, bank) => sum + parseFloat(bank.current_balance || 0), 0);
    const totalUnclaimed = banks.reduce((sum, bank) => sum + parseFloat(bank.unclaimed_balance || 0), 0);
    
    return (
      <div className="space-y-8 animate-fade-in p-4 md:p-0">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Bank Accounts</h2>
                <p className="text-gray-500 mt-1">Manage your company bank accounts and balances.</p>
            </div>
            {(user.role === 'admin' || user.role === 'liaison') && (
                <button 
                    onClick={() => setAddBankModalOpen(true)}
                    className="inline-flex items-center px-5 py-2.5 border border-transparent shadow-lg shadow-blue-200 text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:-translate-y-0.5"
                >
                    <Plus size={18} className="mr-2" /> Add Bank Account
                </button>
            )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {banks.map(bank => (
                <div key={bank.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group relative" onClick={() => setActiveView(`bank-${bank.id}`)}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    
                    {/* Header with Bank Name and Account Number */}
                    <div className="p-6 relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                    <Building size={24} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-xl leading-tight group-hover:text-blue-600 transition-colors">{bank.bank_name}</h3>
                                    <p className="text-sm text-gray-500 font-mono mt-1">{bank.account_number}</p>
                                </div>
                            </div>
                            {user.role === 'admin' && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteBank(bank);
                                    }}
                                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors z-20 relative"
                                    title="Delete Bank Account"
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>

                        {/* Metrics Body */}
                        <div className="space-y-5">
                            {/* Current Balance */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Current Balance</p>
                                <p className="text-3xl font-bold text-gray-900 tracking-tight">
                                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(bank.current_balance)}
                                </p>
                            </div>

                            {(user.role === 'admin' || user.role === 'liaison' || user.role === 'hr') && (
                                <div className="inline-block">
                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                        {bank.company_name}
                                    </span>
                                </div>
                            )}

                            {/* Unclaimed Checks Section */}
                            <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-100 flex items-center justify-between group-hover:bg-orange-50 transition-colors">
                                <div>
                                    <p className="text-xs font-bold text-orange-800 mb-1 flex items-center gap-1">
                                        <AlertTriangle size={12} /> Unclaimed Checks
                                    </p>
                                    <p className="text-lg font-bold text-orange-700">
                                        {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(bank.unclaimed_balance || 0)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="bg-white text-orange-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm border border-orange-100 block">
                                        {bank.unclaimed_count || 0} Pending
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            {banks.length === 0 && (
                <div className="col-span-full text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="bg-gray-50 p-4 rounded-full inline-block mb-4">
                        <Building className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No bank accounts</h3>
                    <p className="text-gray-500 mt-1">Get started by creating a new bank account.</p>
                </div>
            )}
        </div>
      </div>
    );
  };

  const renderDashboardView = () => {
    // Use memoized slides
    const activeSlide = dashboardSlides[recentActivityIndex] || dashboardSlides[0];

    return (
    <div className="flex flex-col gap-6 animate-fade-in p-4 md:p-0 h-auto lg:h-full">
      <div className="flex-shrink-0">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h2>
        <p className="text-gray-500 mt-1">Welcome back, {user.username}. Here's what's happening today.</p>
      </div>
      
      {stats && (
        <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard 
              title="Total Vouchers" 
              value={stats.total_vouchers} 
              icon={FileCheck} 
              color="bg-blue-500" 
          />
          <StatsCard 
              title="Total Amount" 
              value={new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(stats.total_amount)} 
              icon={TrendingUp} 
              color="bg-green-500" 
          />
          <StatsCard 
              title="Pending Approval" 
              value={stats.pending_count} 
              icon={Clock} 
              color="bg-yellow-500"
              onClick={() => {
                  setActiveView('issuances');
                  setSelectedIssuanceCompany(null);
              }}
          />
          <StatsCard 
              title="Issued" 
              value={stats.issued_count} 
              icon={CheckCircle} 
              color="bg-indigo-500" 
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 lg:min-h-0">
        <div 
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[500px] lg:h-full relative overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600 flex-shrink-0"><TrendingUp size={20} /></div>
                    <div className="min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 truncate transition-all duration-300">
                            {activeSlide.name}
                        </h3>
                        {activeSlide.pending > 0 && (
                            <p className="text-xs font-bold text-orange-600 animate-pulse flex items-center gap-1">
                                <AlertTriangle size={10} />
                                {activeSlide.pending} Approval{activeSlide.pending !== 1 ? 's' : ''} Needed
                            </p>
                        )}
                    </div>
                </div>
                <button 
                    onClick={() => setActiveView('issuances')}
                    className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap flex-shrink-0 ml-2"
                >
                    View All
                </button>
            </div>
            
            <div className="space-y-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
                {activeSlide.data.slice(0, 5).map(voucher => (
                    <div key={voucher.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50/50 transition-colors group cursor-pointer" onClick={() => {
                        setViewingVoucher(voucher);
                    }}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${
                                voucher.status === 'Issued' ? 'bg-green-100 text-green-600' :
                                voucher.status === 'Rejected' ? 'bg-red-100 text-red-600' :
                                'bg-yellow-100 text-yellow-600'
                            }`}>
                                {voucher.status === 'Issued' ? <CheckCircle size={18} /> :
                                 voucher.status === 'Rejected' ? <X size={18} /> :
                                 <Clock size={18} />}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors truncate max-w-[180px]">{voucher.payee}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{new Date(voucher.date).toLocaleDateString()}</span>
                                    {(user.role === 'admin' || user.role === 'liaison') && voucher.company_name && (
                                        <>
                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                            <span className="text-blue-600 font-medium truncate max-w-[100px]">{voucher.company_name}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="font-bold text-gray-900 text-sm">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(voucher.amount)}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{voucher.voucher_no}</p>
                        </div>
                    </div>
                ))}
                {activeSlide.data.length === 0 && (
                    <div className="text-center py-12 text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200 h-full flex items-center justify-center">
                        No recent activity found
                    </div>
                )}
            </div>

            {/* Carousel Dots */}
            {dashboardSlides.length > 1 && (
                <div className="flex justify-center gap-2 mt-6 pt-2">
                    {dashboardSlides.map((slide, idx) => (
                        <button
                            key={slide.id}
                            onClick={() => setRecentActivityIndex(idx)}
                            className={`h-2 rounded-full transition-all duration-300 relative ${
                                idx === recentActivityIndex ? 'w-8 bg-blue-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                            }`}
                            title={slide.name}
                        >
                            {slide.pending > 0 && idx !== recentActivityIndex && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white"></span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-2xl shadow-lg text-white relative overflow-hidden h-auto lg:h-full">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-black opacity-10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm"><LayoutDashboard size={20} /></div>
                    Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => {
                            setEditingVoucher(null);
                            setShowForm(true);
                        }}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-6 rounded-xl border border-white/10 transition-all transform hover:-translate-y-1 text-left group"
                    >
                        <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Plus size={24} />
                        </div>
                        <span className="font-bold text-lg block">New Voucher</span>
                        <span className="text-blue-100 text-sm">Create payment voucher</span>
                    </button>
                    
                    <button 
                        onClick={() => setActiveView('issuances')}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-6 rounded-xl border border-white/10 transition-all transform hover:-translate-y-1 text-left group"
                    >
                        <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <FileText size={24} />
                        </div>
                        <span className="font-bold text-lg block">View All</span>
                        <span className="text-blue-100 text-sm">Browse all vouchers</span>
                    </button>

                    {(user.role === 'admin' || user.role === 'liaison' || user.role === 'hr') && (
                        <>
                            <button 
                                onClick={() => setActiveView('banks-dashboard')}
                                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-6 rounded-xl border border-white/10 transition-all transform hover:-translate-y-1 text-left group"
                            >
                                <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Building size={24} />
                                </div>
                                <span className="font-bold text-lg block">Banks</span>
                                <span className="text-blue-100 text-sm">Manage accounts</span>
                            </button>
                            
                            <button 
                                onClick={() => setActiveView('settings')}
                                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-6 rounded-xl border border-white/10 transition-all transform hover:-translate-y-1 text-left group"
                            >
                                <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Settings size={24} />
                                </div>
                                <span className="font-bold text-lg block">Settings</span>
                                <span className="text-blue-100 text-sm">System config</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
  };

  const renderIssuancesView = () => {
    const selectedCompanyName = companies.find(c => c.id == selectedIssuanceCompany)?.name;

    // If no company selected and user is Admin/Liaison, show Overview Dashboard
    if (!selectedIssuanceCompany && (user.role === 'admin' || user.role === 'liaison' || user.role === 'hr')) {
        return renderIssuancesOverview();
    }

    const filteredVouchersByTab = vouchers.filter(v => {
        if (issuanceTab === 'all') return true;
        if (issuanceTab === 'pending') {
            if (user.role === 'liaison') return v.status === 'Pending Liaison';
            if (user.role === 'admin') return v.status === 'Pending Admin';
            return ['Pending', 'Pending Liaison', 'Pending Admin'].includes(v.status);
        }
        if (issuanceTab === 'issued') {
            return v.status === 'Issued';
        }
        return true;
    });

    return (
    <div className="flex flex-col h-auto lg:h-full gap-4 animate-fade-in p-4 md:p-0">
      <div className="flex-none flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
            {selectedCompanyName ? (
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                        {selectedCompanyName}
                    </h2>
                    <p className="text-lg font-medium text-gray-500 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg"><FileText size={18} /></span>
                        Issuance of Voucher
                    </p>
                </div>
            ) : (
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                        Issuances of Voucher
                    </h2>
                    <p className="text-gray-500 mt-1">Manage and track voucher issuances.</p>
                </div>
            )}
        </div>

        {/* Status Tabs */}
        {(user.role === 'admin' || user.role === 'liaison') && (
            <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                    onClick={() => setIssuanceTab('pending')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${issuanceTab === 'pending' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Clock size={16} />
                    For Issuance
                </button>
                <button 
                    onClick={() => setIssuanceTab('issued')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${issuanceTab === 'issued' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <CheckCircle size={16} />
                    Issued
                </button>
                <button 
                    onClick={() => setIssuanceTab('all')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${issuanceTab === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <List size={16} />
                    All Vouchers
                </button>
            </div>
        )}
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto bg-white p-2 rounded-xl shadow-sm border border-gray-100">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
              placeholder="Search vouchers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <Filter className="h-3 w-3 text-gray-500" />
              </div>
              <select 
                value={filterType} 
                onChange={(e) => { setFilterType(e.target.value); setFilterValue(''); }} 
                className="block w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium cursor-pointer transition-all appearance-none hover:bg-gray-100"
              >
                <option value="all">All Time</option>
                <option value="day">By Day</option>
                <option value="week">By Week</option>
                <option value="month">By Month</option>
                <option value="year">By Year</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 group-hover:text-blue-600 transition-colors">
                <ChevronDown size={14} strokeWidth={2.5} />
              </div>
            </div>
            {filterType !== 'all' && <div className="w-full sm:w-48">{renderFilterInput()}</div>}
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-auto relative group">
             <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)} 
                className="block w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium cursor-pointer transition-all appearance-none hover:bg-gray-100"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 group-hover:text-blue-600 transition-colors">
                <ChevronDown size={14} strokeWidth={2.5} />
              </div>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

          <button onClick={() => { fetchVouchers(); fetchStats(); }} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Refresh">
            <RefreshCw size={18} />
          </button>
          
          {user.role !== 'admin' && user.role !== 'liaison' && (
            <button 
                onClick={() => { setEditingVoucher(null); setShowForm(true); }} 
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-lg shadow-blue-200 text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={18} className="mr-2" /> Create
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-x-auto custom-scrollbar relative">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50/50 sticky top-0 z-30 shadow-sm">
                <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-[140px] whitespace-nowrap bg-gray-50/95 backdrop-blur-sm">Voucher No</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-[120px] whitespace-nowrap bg-gray-50/95 backdrop-blur-sm">Urgency</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-[120px] whitespace-nowrap bg-gray-50/95 backdrop-blur-sm">Deadline</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-[120px] whitespace-nowrap bg-gray-50/95 backdrop-blur-sm">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[300px] bg-gray-50/95 backdrop-blur-sm">Payee</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-[150px] whitespace-nowrap bg-gray-50/95 backdrop-blur-sm">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-[140px] whitespace-nowrap bg-gray-50/95 backdrop-blur-sm">Status</th>
                <th className="px-2 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-[100px] whitespace-nowrap sticky right-0 z-40 bg-gray-50/95 backdrop-blur-sm shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
                {filteredVouchersByTab.map((voucher) => (
                <tr key={voucher.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-gray-700 text-sm">
                        <button  
                            onClick={() => setViewingVoucher(voucher)}
                            className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
                        >
                            {voucher.voucher_no}
                        </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full w-max border ${
                                voucher.urgency === 'Critical' ? 'bg-red-50 text-red-700 border-red-100' :
                                voucher.urgency === 'Urgent' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                'bg-green-50 text-green-700 border-green-100'
                            }`}>
                                {voucher.urgency || 'Normal'}
                            </span>
                            {voucher.check_date && (
                                <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100 w-max">
                                    PDC
                                </span>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                        {voucher.deadline_date ? new Date(voucher.deadline_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{voucher.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{voucher.payee}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold font-mono">
                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(voucher.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${
                        voucher.status === 'Issued' ? 'bg-green-50 text-green-700 border-green-100' : 
                        voucher.status === 'Pending Admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                        voucher.status === 'Pending Liaison' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        voucher.status === 'Void Pending Approval' ? 'bg-red-50 text-red-700 border-red-100' :
                        voucher.status === 'Voided' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                        voucher.status === 'Bounced' ? 'bg-red-100 text-red-800 border-red-200' :
                        voucher.status === 'Cancelled' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                        'bg-yellow-50 text-yellow-700 border-yellow-100'
                    }`}>
                        {voucher.status}
                    </span>
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-center text-sm font-medium sticky right-0 bg-white z-10 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                    {user.role === 'admin' && (voucher.status === 'Pending' || voucher.status === 'Pending Admin') && (
                        <div className="flex justify-center gap-0.5 items-center">
                            <button onClick={() => handleApprove(voucher)} className="text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                                <CheckCircle size={18} />
                            </button>
                            {voucher.history_count > 0 && (
                                <button onClick={() => setViewingHistory(voucher)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View History">
                                    <Clock size={18} />
                                </button>
                            )}
                            <button onClick={() => handleForceDelete(voucher)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Force Delete (Admin Only)">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                    {user.role === 'admin' && voucher.status === 'Void Pending Approval' && (
                        <div className="flex justify-center gap-0.5 items-center">
                            <button onClick={() => setVoidReviewVoucher(voucher)} className="text-orange-600 hover:text-orange-800 p-2 hover:bg-orange-50 rounded-lg transition-colors" title="Review Request">
                                <AlertTriangle size={18} />
                            </button>
                            {voucher.history_count > 0 && (
                                <button onClick={() => setViewingHistory(voucher)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View History">
                                    <Clock size={18} />
                                </button>
                            )}
                            <button onClick={() => handleForceDelete(voucher)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Force Delete (Admin Only)">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                    {user.role === 'liaison' && voucher.status === 'Pending Liaison' && (
                        <div className="flex justify-center gap-0.5 items-center">
                            <button onClick={() => handleProcess(voucher)} className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                <Edit size={18} />
                            </button>
                            {voucher.history_count > 0 && (
                                <button onClick={() => setViewingHistory(voucher)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View History">
                                    <Clock size={18} />
                                </button>
                            )}
                        </div>
                    )}
                    {user.role === 'liaison' && voucher.status === 'Pending Admin' && (
                        <div className="flex justify-center gap-0.5 items-center">
                            <button onClick={() => handleProcess(voucher)} className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                <Edit size={18} />
                            </button>
                            <button onClick={() => handleApprove(voucher)} className="text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                                <CheckCircle size={18} />
                            </button>
                            <button onClick={() => handleOfflineApprove(voucher)} className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Offline Approval (Upload)">
                                <Upload size={18} />
                            </button>
                             {voucher.history_count > 0 && (
                                <button onClick={() => setViewingHistory(voucher)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View History">
                                    <Clock size={18} />
                                </button>
                            )}
                        </div>
                    )}
                    {user.role === 'staff' && voucher.status === 'Pending Liaison' && voucher.created_by_role !== 'hr' && (
                        <div className="flex gap-0.5 justify-center items-center">
                            <button onClick={() => handleProcess(voucher)} className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                <Edit size={18} />
                            </button>
                            <button onClick={() => handleCancelVoucher(voucher.id)} className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
                                <X size={18} />
                            </button>
                            {voucher.history_count > 0 && (
                                <button onClick={() => setViewingHistory(voucher)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View History">
                                    <Clock size={18} />
                                </button>
                            )}
                        </div>
                    )}
                    {user.role === 'hr' && voucher.status === 'Pending Liaison' && voucher.created_by === user.id && (
                        <div className="flex gap-0.5 justify-center items-center">
                            <button onClick={() => handleProcess(voucher)} className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                <Edit size={18} />
                            </button>
                            <button onClick={() => handleCancelVoucher(voucher.id)} className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
                                <X size={18} />
                            </button>
                            {voucher.history_count > 0 && (
                                <button onClick={() => setViewingHistory(voucher)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View History">
                                    <Clock size={18} />
                                </button>
                            )}
                        </div>
                    )}
                    {voucher.status === 'Issued' && (
                        <div className="flex justify-center gap-0.5 items-center">
                            <button onClick={() => handlePrint(voucher)} className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Print">
                                <Printer size={18} />
                            </button>
                            {user.role === 'liaison' && !voucher.received_by && (
                                <button onClick={() => handleClaim(voucher)} className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Mark as Claimed/Received">
                                    <CheckCircle size={18} />
                                </button>
                            )}
                            {user.role === 'liaison' && (
                                <button onClick={() => handleRequestVoid(voucher.id)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Void">
                                    <Trash2 size={18} />
                                </button>
                            )}
                            {voucher.history_count > 0 && (
                                <button onClick={() => setViewingHistory(voucher)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View History">
                                    <Clock size={18} />
                                </button>
                            )}
                            {user.role === 'admin' && (
                                <button onClick={() => handleForceDelete(voucher)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Force Delete (Admin Only)">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    )}
                    {user.role === 'admin' && !['Pending', 'Pending Admin', 'Void Pending Approval', 'Issued'].includes(voucher.status) && (
                        <div className="flex justify-center gap-0.5 items-center">
                            {voucher.history_count > 0 && (
                                <button onClick={() => setViewingHistory(voucher)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View History">
                                    <Clock size={18} />
                                </button>
                            )}
                            <button onClick={() => handleForceDelete(voucher)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Force Delete (Admin Only)">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                    </td>
                </tr>
                ))}
                {filteredVouchersByTab.length === 0 && (
                <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-gray-400 italic">No vouchers found</td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
  };

  const renderSettingsView = () => (
    <div className="space-y-8 w-full animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h2>
        <p className="text-gray-500 mt-1">Manage your profile, categories, and system preferences.</p>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSettingsTab('profile')}
            className={`${
              settingsTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors`}
          >
            <User size={18} />
            Profile
          </button>
          
          <button
            onClick={() => setSettingsTab('categories')}
            className={`${
              settingsTab === 'categories'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors`}
          >
            <FileText size={18} />
            Categories
          </button>

          {user.role === 'admin' && (
            <button
                onClick={() => setSettingsTab('companies')}
                className={`${
                settingsTab === 'companies'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors`}
            >
                <Building size={18} />
                Companies
            </button>
          )}

          <button
            onClick={() => setSettingsTab('print')}
            className={`${
              settingsTab === 'print'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors`}
          >
            <Printer size={18} />
            Print Template
          </button>
          
          {user.role === 'admin' && (
            <>
                <button
                    onClick={() => setSettingsTab('users')}
                    className={`${
                    settingsTab === 'users'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors`}
                >
                    <Users size={18} />
                    Users
                </button>

                <button
                    onClick={() => setSettingsTab('database')}
                    className={`${
                    settingsTab === 'database'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors`}
                >
                    <Database size={18} />
                    Database
                </button>

                <button
                    onClick={() => setSettingsTab('approvals')}
                    className={`${
                    settingsTab === 'approvals'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors`}
                >
                    <CheckCircle size={18} />
                    Approvals
                    {profileRequests.length > 0 && (
                        <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded-full ml-2 animate-pulse">
                            {profileRequests.length}
                        </span>
                    )}
                </button>
            </>
          )}
        </nav>
      </div>
      
      {/* Profile Section */}
      {settingsTab === 'profile' && (
        <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-4 md:p-8 w-full animate-fade-in">
          {isLoadingProfile ? (
             <div className="flex justify-center items-center py-12">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                 <span className="ml-3 text-gray-500 font-medium">Loading profile...</span>
             </div>
          ) : profileError ? (
             <div className="text-center py-12">
                 <div className="bg-red-100 p-3 rounded-full inline-block mb-3">
                     <AlertTriangle className="h-6 w-6 text-red-600" />
                 </div>
                 <p className="text-red-600 font-medium">{profileError}</p>
                 <button onClick={fetchProfile} className="mt-4 text-blue-600 hover:underline text-sm font-bold">Try Again</button>
             </div>
          ) : profileData ? (
            <>
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><User size={24} /></div>
                    Profile Information
                </h3>
                {!isEditingProfile && (
                    <button 
                        onClick={() => setIsEditingProfile(true)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-bold hover:underline"
                    >
                        Edit Profile
                    </button>
                )}
              </div>
              
              {isEditingProfile ? (
                <form onSubmit={handleProfileUpdate} className="space-y-6 w-full">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Full Name (for Vouchers)</label>
                        <input 
                            type="text" 
                            value={profileForm.full_name}
                            onChange={e => setProfileForm({...profileForm, full_name: e.target.value})}
                            className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
                        <input 
                            type="text" 
                            value={profileForm.username}
                            onChange={e => setProfileForm({...profileForm, username: e.target.value})}
                            className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">New Password (leave blank to keep current)</label>
                        <input 
                            type="password" 
                            value={profileForm.password}
                            onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                            className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="********"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">E-Signature</label>
                         {profileData.signature_path && !signatureFile && (
                            <div className="mb-2">
                                <p className="text-xs text-gray-500 mb-1">Current Signature:</p>
                                <img src={`${profileData.signature_path}`} alt="Signature" className="h-16 object-contain border border-gray-200 rounded p-1 bg-white" />
                            </div>
                        )}
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={e => setSignatureFile(e.target.files[0])}
                            className="w-full border border-gray-300 p-2 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="text-xs text-gray-500 mt-1">Upload an image of your signature (PNG or JPG).</p>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={() => setIsEditingProfile(false)}
                            className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-5 py-2.5 border border-transparent rounded-xl shadow-lg shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:-translate-y-0.5"
                        >
                            {user.role === 'admin' ? 'Save Changes' : 'Submit for Approval'}
                        </button>
                    </div>
                </form>
              ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                            <div className="text-lg font-medium text-gray-900">{profileData.full_name || 'Not set'}</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Username</label>
                            <div className="text-lg font-medium text-gray-900">{profileData.username}</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Role</label>
                            <div className="text-lg font-medium text-gray-900 uppercase">{profileData.role}</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Company</label>
                            <div className="text-lg font-medium text-gray-900">{user.company_name || 'All Companies'}</div>
                        </div>
                    </div>
                    {profileData.signature_path && (
                        <div className="mt-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm inline-block">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">E-Signature</label>
                            <img 
                                src={`${profileData.signature_path}`} 
                                alt="Your Signature" 
                                className="h-20 object-contain"
                            />
                        </div>
                    )}
                </>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">No profile data available.</div>
          )}
        </div>
      )}

      {/* Categories Section */}
      {settingsTab === 'categories' && (
        <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-4 md:p-8 w-full animate-fade-in">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FileText size={24} /></div>
            Manage Categories
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 sticky top-6">
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Select Company</label>
                            <div className="relative group">
                                <select 
                                    value={selectedCategoryCompany} 
                                    onChange={e => setSelectedCategoryCompany(e.target.value)}
                                    className="w-full border border-gray-300 p-3 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white hover:bg-gray-50 cursor-pointer"
                                    disabled={user.role !== 'admin' && user.role !== 'hr'}
                                >
                                    <option value="">{user.role === 'admin' ? 'All Companies (View Only)' : 'Global HR Categories'}</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 group-hover:text-blue-600 transition-colors">
                                    <ChevronDown size={16} strokeWidth={2.5} />
                                </div>
                            </div>
                            {!selectedCategoryCompany && user.role === 'admin' && (
                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                    <AlertTriangle size={12} /> Select a specific company to add new categories.
                                </p>
                            )}
                         </div>
                    
                    <form onSubmit={handleAddCategory} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">New Category Name</label>
                            <input 
                                type="text" 
                                required
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value)}
                                className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400"
                                placeholder="e.g. Office Supplies"
                                disabled={user.role === 'admin' && !selectedCategoryCompany}
                            />
                        </div>
                        <button 
                            type="submit" 
                            className={`w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 disabled:shadow-none flex items-center justify-center gap-2 ${isProcessing ? 'opacity-75 cursor-not-allowed transform-none' : ''}`}
                            disabled={(user.role === 'admin' && !selectedCategoryCompany) || isProcessing}
                        >
                            {isProcessing ? <RefreshCw size={18} className="animate-spin" /> : null}
                            {isProcessing ? 'Adding...' : 'Add Category'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                        {(categories || []).map(cat => (
                            <li key={cat.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="bg-gray-100 p-2 rounded-lg text-gray-500">
                                        <FileText size={16} />
                                    </div>
                                    <div>
                                        <span className="text-gray-900 font-bold block">{cat.name}</span>
                                        {((user.role === 'admin' || user.role === 'hr') && !selectedCategoryCompany) && (
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 mt-1 inline-block">
                                                {cat.company_name || 'Global / ' + (cat.role ? cat.role.toUpperCase() : 'General')}
                                            </span>
                                        )}
                                        {cat.role === 'hr' && cat.company_name && (
                                            <span className="ml-2 text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 mt-1 inline-block font-bold">
                                                HR Only
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDeleteCategory(cat)}
                                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Category"
                                >
                                    <X size={18} />
                                </button>
                            </li>
                        ))}
                        {categories.length === 0 && (
                            <li className="p-8 text-center text-gray-400 italic">No categories found</li>
                        )}
                    </ul>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Companies Section (Admin) */}
      {settingsTab === 'companies' && user.role === 'admin' && (
        <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-4 md:p-8 max-w-full animate-fade-in">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Building size={24} /></div>
                Manage Companies
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section - Left Side */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleAddCompany} className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100 sticky top-6">
                        <h4 className="font-bold text-gray-900 mb-4">Add New Company</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Company Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={newCompanyForm.name}
                                    onChange={e => setNewCompanyForm({...newCompanyForm, name: e.target.value})}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. ACME Corp"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Prefix (Unique)</label>
                                <input 
                                    type="text" 
                                    required
                                    value={newCompanyForm.prefix}
                                    onChange={e => setNewCompanyForm({...newCompanyForm, prefix: e.target.value.toUpperCase()})}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase"
                                    placeholder="e.g. ACME"
                                    maxLength={5}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Address</label>
                                <textarea 
                                    value={newCompanyForm.address}
                                    onChange={e => setNewCompanyForm({...newCompanyForm, address: e.target.value})}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Company Address"
                                    rows="3"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contact Info</label>
                                <input 
                                    type="text" 
                                    value={newCompanyForm.contact}
                                    onChange={e => setNewCompanyForm({...newCompanyForm, contact: e.target.value})}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Phone or Email"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button 
                                type="submit" 
                                disabled={isProcessing}
                                className={`w-full bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 ${isProcessing ? 'opacity-75 cursor-not-allowed transform-none' : ''}`}
                            >
                                {isProcessing ? <RefreshCw size={18} className="animate-spin" /> : null}
                                {isProcessing ? 'Adding...' : 'Add Company'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* List Section - Right Side */}
                <div className="lg:col-span-2">
                    <div className="border border-gray-200 rounded-xl overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Prefix</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Address</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {(companies || []).map(company => (
                                    <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">{company.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-blue-600 font-bold">{company.prefix}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm truncate max-w-xs">{company.address || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button 
                                                onClick={() => handleDeleteCompany(company)}
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete Company"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {companies.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-400 italic">No companies found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Print Settings Section */}
      {settingsTab === 'print' && (
        <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-4 md:p-8 max-w-full animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Printer size={24} /></div>
                    Print Configuration
                </h3>
                <button onClick={savePrintSettings} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5">
                    <Save size={18} /> Save Settings
                </button>
            </div>

            <div className="flex flex-col xl:flex-row gap-8">
                {/* Controls */}
                <div className="w-full xl:w-1/3 space-y-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Layout & Margins</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Top Margin (mm)</label>
                                <input 
                                type="number" 
                                value={printSettings.marginTop} 
                                onChange={(e) => setPrintSettings({...printSettings, marginTop: e.target.value})}
                                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Left Margin (mm)</label>
                                <input 
                                type="number" 
                                value={printSettings.marginLeft} 
                                onChange={(e) => setPrintSettings({...printSettings, marginLeft: e.target.value})}
                                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Scale (%)</label>
                                <input 
                                type="number" 
                                value={printSettings.scale} 
                                onChange={(e) => setPrintSettings({...printSettings, scale: e.target.value})}
                                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Header Information</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Header Title</label>
                                <input 
                                type="text" 
                                placeholder="Default: Company Name"
                                value={printSettings.headerTitle} 
                                onChange={(e) => setPrintSettings({...printSettings, headerTitle: e.target.value})}
                                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Logo URL</label>
                                <input 
                                type="text" 
                                placeholder="https://..."
                                value={printSettings.logoUrl} 
                                onChange={(e) => setPrintSettings({...printSettings, logoUrl: e.target.value})}
                                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Address Line 1</label>
                                <input 
                                type="text" 
                                value={printSettings.addressLine1} 
                                onChange={(e) => setPrintSettings({...printSettings, addressLine1: e.target.value})}
                                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Address Line 2</label>
                                <input 
                                type="text" 
                                value={printSettings.addressLine2} 
                                onChange={(e) => setPrintSettings({...printSettings, addressLine2: e.target.value})}
                                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Signature Labels</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Prepared By Label</label>
                                <input 
                                type="text" 
                                value={printSettings.preparedByLabel} 
                                onChange={(e) => setPrintSettings({...printSettings, preparedByLabel: e.target.value})}
                                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Checked By Label</label>
                                <input 
                                type="text" 
                                value={printSettings.checkedByLabel} 
                                onChange={(e) => setPrintSettings({...printSettings, checkedByLabel: e.target.value})}
                                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Check Issued By Label</label>
                                <input 
                                type="text" 
                                value={printSettings.checkIssuedByLabel} 
                                onChange={(e) => setPrintSettings({...printSettings, checkIssuedByLabel: e.target.value})}
                                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Approved By Label</label>
                                <input 
                                type="text" 
                                value={printSettings.approvedByLabel} 
                                onChange={(e) => setPrintSettings({...printSettings, approvedByLabel: e.target.value})}
                                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Received By Label</label>
                                <input 
                                type="text" 
                                value={printSettings.receivedByLabel} 
                                onChange={(e) => setPrintSettings({...printSettings, receivedByLabel: e.target.value})}
                                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex items-center pt-2">
                                <input 
                                type="checkbox" 
                                id="showPreparedBy"
                                checked={printSettings.showPreparedBy} 
                                onChange={(e) => setPrintSettings({...printSettings, showPreparedBy: e.target.checked})}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="showPreparedBy" className="ml-2 block text-sm text-gray-900 font-medium">
                                Show "Prepared By" Name
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Preview */}
                <div className="w-full xl:w-2/3">
                    <div className="sticky top-6">
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Eye size={18} className="text-blue-600" /> Live Preview
                        </h4>
                        <div className="bg-gray-200 p-8 rounded-xl border border-gray-300 overflow-auto flex justify-center items-start min-h-[600px] custom-scrollbar">
                            <div className="bg-white shadow-2xl transform scale-[0.65] origin-top mt-4">
                                <VoucherTemplate 
                                    data={{
                                        voucher_no: 'SAMPLE-00001',
                                        date: new Date().toISOString().split('T')[0],
                                        payee: 'John Doe Enterprises',
                                        amount: 12500.50,
                                        amount_in_words: 'Twelve Thousand Five Hundred Pesos and 50/100 Only',
                                        description: 'Payment for office supplies and equipment maintenance for the month of January.',
                                        company_name: 'ACME Corporation',
                                        payment_type: 'Check',
                                        bank_name: 'Bank of Commerce',
                                        check_no: '1234567890',
                                        check_date: new Date().toISOString().split('T')[0],
                                        created_by_user: 'Admin User'
                                    }} 
                                    settings={printSettings}
                                />
                            </div>
                        </div>
                        <p className="text-center text-xs text-gray-500 mt-2">Preview is scaled down. Actual print will use full size.</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Users Section (Admin) */}
      {settingsTab === 'users' && user.role === 'admin' && (
        <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-4 md:p-8 w-full animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Users size={24} /></div>
                    User Management
                </h3>
                <button 
                    onClick={() => {
                        setUserForm({ username: '', password: '', role: 'staff', company_id: '' });
                        setShowUserModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5"
                >
                    <UserPlus size={18} /> Add User
                </button>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider sticky right-0 z-20 bg-gray-50 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(users || []).map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{u.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap capitalize text-gray-600">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                              u.role === 'liaison' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                          }`}>
                              {u.role}
                          </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{u.company_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right sticky right-0 bg-white z-10 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                        {u.username !== 'admin' && (
                          <button onClick={() => handleDeleteUser(u)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      )}

      {/* Database Section (Admin) */}
      {settingsTab === 'database' && user.role === 'admin' && (
        <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-4 md:p-8 w-full animate-fade-in">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Database size={24} /></div>
                Database Management
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-2">Backup Data</h4>
                    <p className="text-sm text-gray-500 mb-4">Download a copy of the current database file.</p>
                    <button onClick={handleBackup} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition-all transform hover:-translate-y-0.5">
                        <Download size={18} /> Download Backup
                    </button>
                </div>

                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-900 mb-2">Import Data</h4>
                    <p className="text-sm text-blue-700 mb-4">Restore database from a backup file (requires restart).</p>
                    <button onClick={handleImportClick} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5">
                        <Upload size={18} /> Import Database
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept=".db" 
                    />
                </div>

                <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                    <h4 className="font-bold text-red-900 mb-2">Reset System</h4>
                    <p className="text-sm text-red-700 mb-4">WARNING: This will delete all vouchers. Users and companies will be preserved.</p>
                    <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all transform hover:-translate-y-0.5">
                        <AlertTriangle size={18} /> Reset Data
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Approvals Section (Admin Only) */}
      {settingsTab === 'approvals' && user.role === 'admin' && (
          <div className="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden animate-fade-in">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="text-lg font-bold text-gray-900">Pending Profile Updates</h3>
              </div>
              <ul className="divide-y divide-gray-100">
                  {(profileRequests || []).map(req => (
                      <li key={req.id} className="p-6 hover:bg-blue-50/30 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                  <div className="flex items-center gap-2 mb-2">
                                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">REQUEST</span>
                                      <p className="text-sm font-bold text-gray-900">
                                          From: <span className="text-blue-600">{req.current_username}</span>
                                      </p>
                                  </div>
                                  <div className="space-y-1 ml-1">
                                      {req.new_full_name && <p className="text-sm text-gray-600">New Name: <span className="font-bold text-gray-900">{req.new_full_name}</span></p>}
                                      {req.new_username && <p className="text-sm text-gray-600">New Username: <span className="font-bold text-gray-900">{req.new_username}</span></p>}
                                      {req.new_password && <p className="text-sm text-gray-600">New Password: <span className="font-bold text-gray-900">********</span></p>}
                                  </div>
                                  <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                                      <Clock size={12} /> Requested on {new Date(req.created_at).toLocaleDateString()}
                                  </p>
                              </div>
                              <div className="flex gap-3">
                                  <button 
                                      onClick={() => handleRequestAction(req.id, 'approve')}
                                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 transition-all transform hover:-translate-y-0.5"
                                  >
                                      <CheckCircle size={16} className="mr-2" /> Approve
                                  </button>
                                  <button 
                                      onClick={() => handleRequestAction(req.id, 'reject')}
                                      className="inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                                  >
                                      <X size={16} className="mr-2" /> Reject
                                  </button>
                              </div>
                          </div>
                      </li>
                  ))}
                  {profileRequests.length === 0 && (
                      <li className="p-12 text-center text-gray-400 italic">No pending requests</li>
                  )}
              </ul>
          </div>
      )}
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex font-sans text-gray-900">
      {/* Print Template */}
      <div className="hidden print:block fixed inset-0 bg-white z-[100]">
        {printVoucher && <VoucherTemplate data={printVoucher} ref={componentRef} />}
      </div>

      <ApproveVoucherModal 
        isOpen={approveModalOpen}
        onClose={() => { setApproveModalOpen(false); setVoucherToApprove(null); }}
        onConfirm={confirmApprove}
        voucher={voucherToApprove}
        user={user}
        banks={banks}
        isProcessing={isProcessing}
      />

      <VoidReasonModal 
        isOpen={voidModalOpen}
        onClose={() => {
            setVoidModalOpen(false);
            setVoucherToVoid(null);
        }}
        onSubmit={submitVoidRequest}
        isProcessing={isProcessing}
      />

      <VoidReviewModal 
        isOpen={!!voidReviewVoucher}
        voucher={voidReviewVoucher}
        onClose={() => setVoidReviewVoucher(null)}
        onApprove={() => processVoidReview(true)}
        onReject={() => processVoidReview(false)}
        isProcessing={isProcessing}
      />

      <SuccessModal 
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
        title={successModal.title}
        message={successModal.message}
      />

      <DeleteConfirmationModal 
        isOpen={deleteCategoryModalOpen}
        onClose={() => setDeleteCategoryModalOpen(false)}
        onConfirm={confirmDeleteCategory}
        itemName={categoryToDelete?.name}
        isProcessing={isProcessing}
      />

      <DeleteCompanyModal 
        isOpen={deleteCompanyModalOpen}
        onClose={() => {
            setDeleteCompanyModalOpen(false);
            setCompanyToDelete(null);
            setAdminPassword('');
        }}
        onConfirm={confirmDeleteCompany}
        companyName={companyToDelete?.name}
        password={adminPassword}
        setPassword={setAdminPassword}
        isProcessing={isProcessing}
      />

      <DeleteBankModal 
        isOpen={deleteBankModalOpen}
        onClose={() => {
            setDeleteBankModalOpen(false);
            setBankToDelete(null);
            setAdminPassword('');
        }}
        onConfirm={confirmDeleteBank}
        bankName={bankToDelete?.bank_name}
        password={adminPassword}
        setPassword={setAdminPassword}
        isProcessing={isProcessing}
      />

      <DeleteConfirmationModal 
        isOpen={deleteUserModalOpen}
        onClose={() => setDeleteUserModalOpen(false)}
        onConfirm={confirmDeleteUser}
        itemName={userToDelete?.username}
        title="Delete User"
        isProcessing={isProcessing}
      />

      <ConfirmationModal 
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={confirmReset}
        title="System Reset"
        message="WARNING: This will delete all voucher data. Are you sure?"
        confirmText="Reset Data"
        confirmColor="red"
        isProcessing={isProcessing}
      />

      <ConfirmationModal 
        isOpen={importModalOpen}
        onClose={() => {
            setImportModalOpen(false);
            setFileToImport(null);
        }}
        onConfirm={confirmImport}
        title="Import Database"
        message="WARNING: This will overwrite the current database with the imported file. The system will restart. Are you sure?"
        confirmText="Import & Restart"
        confirmColor="red"
        isProcessing={isProcessing}
      />

      <ConfirmationModal 
        isOpen={cancelVoucherModalOpen}
        onClose={() => setCancelVoucherModalOpen(false)}
        onConfirm={confirmCancelVoucher}
        title="Cancel Voucher"
        message="Are you sure you want to cancel this voucher request?"
        confirmText="Cancel Voucher"
        confirmColor="red"
        isProcessing={isProcessing}
      />

      <AlertModal 
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      <VoucherDetailsModal 
        isOpen={!!viewingVoucher} 
        onClose={() => setViewingVoucher(null)} 
        voucher={viewingVoucher} 
      />

      {viewingHistory && (
        <VoucherHistory 
          voucher={viewingHistory} 
          onClose={() => setViewingHistory(null)} 
        />
      )}

      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 w-72 flex-shrink-0 flex flex-col transition-[margin-left] duration-300 print:hidden shadow-xl z-20 ${sidebarOpen ? '' : '-ml-72'}`}>
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700 text-white relative group">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight">VMS</h1>
                <span className="text-[10px] bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-white font-bold uppercase border border-white/10 shadow-sm">{user.role}</span>
            </div>
            <button 
                onClick={() => setSidebarOpen(false)}
                className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 p-1.5 rounded-lg hidden lg:block"
                title="Collapse Sidebar"
            >
                <ChevronLeft size={16} />
            </button>
          </div>
          <p className="text-[11px] text-blue-50 opacity-90 font-medium tracking-wide whitespace-nowrap">Voucher Management System</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-0.5 custom-scrollbar">
            <div className="mb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Main Menu</div>
            
            <button 
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 group ${
                activeView === 'dashboard' 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            >
            <div className={`p-2 rounded-lg mr-3 transition-colors ${activeView === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm'}`}>
                <LayoutDashboard size={18} />
            </div>
            Dashboard
            </button>

            {/* Issuances Accordion */}
            <div className="space-y-0.5">
                <div 
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer group ${
                        (activeView === 'issuances' && !selectedIssuanceCompany) 
                        ? 'bg-blue-50 text-blue-700 shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => {
                        if (user.role === 'admin' || user.role === 'liaison' || user.role === 'hr') {
                            setIssuancesExpanded(!issuancesExpanded);
                        } else {
                            setActiveView('issuances');
                        }
                    }}
                >
                    <div className="flex items-center flex-1" onClick={(e) => {
                        if (user.role === 'admin' || user.role === 'liaison' || user.role === 'hr') {
                             // Do nothing, let parent handle expand
                        } else {
                             e.stopPropagation();
                             setActiveView('issuances');
                        }
                    }}>
                        <div className={`p-2 rounded-lg mr-3 transition-colors ${activeView === 'issuances' ? 'bg-white text-blue-600 shadow-sm' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm'}`}>
                            <FileText size={18} />
                        </div>
                        Issuances
                    </div>
                    {(user.role === 'admin' || user.role === 'liaison' || user.role === 'hr') && (
                        <div className={`p-1 rounded-md transition-transform duration-200 ${issuancesExpanded ? 'rotate-180 bg-blue-100 text-blue-600' : 'text-gray-400'}`}>
                            <ChevronDown size={14} />
                        </div>
                    )}
                </div>

                {/* Submenu for Issuances */}
                {(user.role === 'admin' || user.role === 'liaison' || user.role === 'hr') && issuancesExpanded && (
                    <div className="pl-4 space-y-0.5 animate-fade-in-down">
                        <button 
                            onClick={() => {
                                setActiveView('issuances');
                                setSelectedIssuanceCompany(null);
                            }}
                            className={`w-full flex items-center text-left px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                                activeView === 'issuances' && !selectedIssuanceCompany 
                                ? 'bg-blue-50/50 text-blue-700' 
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full mr-3 flex-shrink-0 ${
                                (user.role === 'liaison' ? stats?.pending_liaison_total : stats?.pending_admin_total) > 0 
                                ? 'bg-orange-500 ring-2 ring-orange-200' 
                                : 'bg-current opacity-50'
                            }`}></div>
                            All Companies
                        </button>
                        {companies.map(company => {
                            const stat = stats?.by_company?.find(s => s.id === company.id);
                            const hasPending = user.role === 'liaison' 
                                ? (stat?.pending_liaison > 0) 
                                : (stat?.pending_admin > 0);
                            
                            return (
                                <button 
                                    key={company.id}
                                    onClick={() => {
                                        setActiveView('issuances');
                                        setSelectedIssuanceCompany(company.id);
                                    }}
                                    className={`w-full flex items-center text-left px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                                        activeView === 'issuances' && selectedIssuanceCompany == company.id 
                                        ? 'bg-blue-50/50 text-blue-700' 
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full mr-3 flex-shrink-0 ${
                                        hasPending 
                                        ? 'bg-orange-500 ring-2 ring-orange-200' 
                                        : 'bg-current opacity-50'
                                    }`}></div>
                                    {company.name}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {/* Bank Accounts Accordion */}
            <div className="space-y-0.5">
                <div 
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer group ${
                        activeView === 'banks-dashboard' 
                        ? 'bg-blue-50 text-blue-700 shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => setBanksExpanded(!banksExpanded)}
                >
                    <div className="flex items-center flex-1">
                        <div className={`p-2 rounded-lg mr-3 transition-colors ${activeView === 'banks-dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm'}`}>
                            <Building size={18} />
                        </div>
                        Bank Accounts
                    </div>
                    <div className={`p-1 rounded-md transition-transform duration-200 ${banksExpanded ? 'rotate-180 bg-blue-100 text-blue-600' : 'text-gray-400'}`}>
                        <ChevronDown size={14} />
                    </div>
                </div>
                
                {banksExpanded && (
                    <div className="pl-4 space-y-0.5 animate-fade-in-down">
                        <button 
                            onClick={() => setActiveView('banks-dashboard')}
                            className={`w-full flex items-center text-left px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                                activeView === 'banks-dashboard' 
                                ? 'bg-blue-50/50 text-blue-700' 
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-current mr-3 opacity-50 flex-shrink-0"></div>
                            Overview
                        </button>
                        {banks.map(bank => (
                            <button 
                                key={bank.id}
                                onClick={() => setActiveView(`bank-${bank.id}`)}
                                className={`w-full flex items-center text-left px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                                    activeView === `bank-${bank.id}` 
                                    ? 'bg-blue-50/50 text-blue-700' 
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-current mr-3 opacity-50 flex-shrink-0"></div>
                                {bank.bank_name}
                            </button>
                        ))}
                        {banks.length === 0 && (
                            <div className="px-4 py-2 text-xs text-gray-400 italic pl-8">No banks added</div>
                        )}
                    </div>
                )}
            </div>
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-0.5">
            <div className="mb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">System</div>
            
            <button 
                onClick={() => setActiveView('settings')}
                className={`w-full flex items-center px-4 py-2.5 text-sm font-bold rounded-xl transition-colors group ${
                    activeView === 'settings' 
                    ? 'bg-white text-blue-700 shadow-sm border border-gray-100' 
                    : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                }`}
            >
                <Settings size={18} className="mr-3 text-gray-400 group-hover:text-blue-600 transition-colors" />
                Settings
            </button>
            
            <button 
                onClick={onLogout}
                className="w-full flex items-center px-4 py-2.5 text-sm font-bold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors group"
            >
                <LogOut size={18} className="mr-3 text-gray-400 group-hover:text-red-500 transition-colors" />
                Logout
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden print:w-full relative">
        {/* Desktop Sidebar Toggle */}
        {!sidebarOpen && (
            <div className="hidden lg:block absolute top-4 left-4 z-50">
                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="bg-white p-2 rounded-lg shadow-md border border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-gray-50 transition-all transform hover:scale-105"
                    title="Expand Sidebar"
                >
                    <Menu size={20} />
                </button>
            </div>
        )}

        {/* Mobile Header */}
        <header className="bg-white shadow-sm z-10 flex items-center justify-between p-4 lg:hidden">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 p-2 hover:bg-gray-100 rounded-lg">
            <Menu size={24} />
          </button>
          <span className="font-bold text-gray-800 text-lg">Voucher System</span>
          <div className="w-10"></div> {/* Spacer for centering */}
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
          <div className={`max-w-[98%] mx-auto ${['dashboard', 'issuances'].includes(activeView) || activeView.startsWith('bank-') ? 'h-auto lg:h-full' : ''}`}>
            {activeView === 'dashboard' && renderDashboardView()}
            {activeView === 'issuances' && renderIssuancesView()}
            {activeView === 'settings' && renderSettingsView()}
            {activeView === 'banks-dashboard' && renderBanksDashboardView()}
            {activeView.startsWith('bank-') && (
                <BankDetails 
                account={banks.find(b => `bank-${b.id}` === activeView)} 
                user={user} 
                onUpdate={fetchBanks}
                showAlert={showAlert}
                />
            )}
          </div>
        </main>
      </div>

      {/* Offline Approval Modal */}
      {offlineApproveModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <div className="bg-green-600 p-1.5 rounded-lg text-white shadow-lg shadow-green-200"><Upload size={18} /></div>
                          Offline Approval
                      </h3>
                      <button onClick={() => setOfflineApproveModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"><X size={20} /></button>
                  </div>
                  <p className="text-gray-600 mb-6 text-sm">
                      Upload the signed approval document (Proprietor/Admin signature).
                      <br/>
                      <span className="font-bold text-green-700">This will mark the voucher as ISSUED (Approved).</span>
                  </p>
                  
                  <div className="mb-6">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Approval Attachment (PDF/Image)</label>
                      <input 
                         type="file"
                         accept="image/*,application/pdf"
                         onChange={(e) => setApprovalAttachment(e.target.files[0])}
                         className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2.5 file:px-4
                            file:rounded-xl file:border-0
                            file:text-sm file:font-bold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100
                            transition-all cursor-pointer"
                      />
                  </div>

                  <div className="flex justify-end space-x-3">
                      <button 
                          onClick={() => setOfflineApproveModalOpen(false)}
                          className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmOfflineApprove}
                          disabled={!approvalAttachment}
                          className="px-6 py-2.5 border border-transparent rounded-xl shadow-lg shadow-green-200 text-sm font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none transition-all transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          <CheckCircle size={18} />
                          Approve & Issue
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Claim Modal */}
      {claimModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-lg shadow-blue-200"><CheckCircle size={18} /></div>
                          Mark as Claimed/Received
                      </h3>
                      <button onClick={() => setClaimModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"><X size={20} /></button>
                  </div>
                  
                  <div className="mb-6">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Received By (Name)</label>
                      <input 
                          type="text" 
                          placeholder="Name of person who received payment"
                          value={receivedByName}
                          onChange={(e) => setReceivedByName(e.target.value)}
                          className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
                  </div>

                  <div className="flex justify-end space-x-3">
                      <button 
                          onClick={() => setClaimModalOpen(false)}
                          className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmClaim}
                          disabled={!receivedByName.trim()}
                          className="px-6 py-2.5 border border-transparent rounded-xl shadow-lg shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-all transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          <Save size={18} />
                          Confirm
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Force Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={forceDeleteModalOpen}
        onClose={() => setForceDeleteModalOpen(false)}
        onConfirm={confirmForceDelete}
        title="Force Delete Voucher"
        message={`WARNING: This will permanently delete voucher ${voucherToForceDelete?.voucher_no} and remove all related records (checks, attachments, history). The check number will be reusable. This action CANNOT be undone.`}
        confirmText="Force Delete"
        confirmColor="red"
        isProcessing={isProcessing}
      />

      <AddBankModal 
        isOpen={addBankModalOpen}
        onClose={() => setAddBankModalOpen(false)}
        onAdd={handleAddAccount}
        companies={companies}
        user={user}
        isProcessing={isProcessing}
      />

      {/* User Modal */}
      {showUserModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-lg shadow-blue-200"><UserPlus size={18} /></div>
                          Add User
                      </h3>
                      <button onClick={() => setShowUserModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleUserSubmit} className="space-y-4">
                      <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Username</label>
                          <input 
                              type="text" required
                              className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all"
                              value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Password</label>
                          <input 
                              type="password" required
                              className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all"
                              value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})}
                          />
                      </div>
                      
                      <div className="group">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <User size={12} /> Role
                          </label>
                          <div className="relative">
                            <select 
                                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 appearance-none transition-colors hover:bg-gray-100 cursor-pointer"
                                value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}
                            >
                                <option value="staff">Staff</option>
                                <option value="liaison">Liaison</option>
                                <option value="hr">HR</option>
                                <option value="admin">Admin</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 group-hover:text-blue-600 transition-colors">
                                <ChevronDown size={16} strokeWidth={2.5} />
                            </div>
                          </div>
                      </div>

                      {userForm.role === 'staff' && (
                          <div className="group">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <Building size={12} /> Company
                              </label>
                              <div className="relative">
                                <select 
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 appearance-none transition-colors hover:bg-gray-100 cursor-pointer" required
                                    value={userForm.company_id} onChange={e => setUserForm({...userForm, company_id: e.target.value})}
                                >
                                    <option value="">Select Company</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 group-hover:text-blue-600 transition-colors">
                                    <ChevronDown size={16} strokeWidth={2.5} />
                                </div>
                              </div>
                          </div>
                      )}
                      
                      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                          <button type="button" onClick={() => setShowUserModal(false)} disabled={isProcessing} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                          <button type="submit" disabled={isProcessing} className={`px-5 py-2.5 border border-transparent rounded-xl shadow-lg shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 ${isProcessing ? 'opacity-75 cursor-not-allowed transform-none' : ''}`}>
                            {isProcessing ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create User'
                            )}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {showForm && (
        <VoucherForm 
          user={user} 
          initialData={editingVoucher}
          showAlert={showAlert}
          onSuccess={() => {
            setShowForm(false);
            setEditingVoucher(null);
            fetchVouchers();
            fetchStats();
            showAlert(editingVoucher ? 'Voucher updated successfully' : 'Voucher created successfully', 'success');
          }} 
          onCancel={() => {
            setShowForm(false);
            setEditingVoucher(null);
          }} 
        />
      )}
    </div>
  );
};

export default Dashboard;
