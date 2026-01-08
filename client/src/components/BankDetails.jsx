import React, { useState, useEffect, useRef } from 'react';
import axios from '../api';
import { History, BookOpen, ArrowDownLeft, ArrowUpRight, Plus, CheckSquare, FileText, ChevronDown, X, Edit } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", confirmColor = "green" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">{title}</h3>
        <p className="text-gray-600 mb-8 text-lg leading-relaxed">{message}</p>
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white ${confirmColor === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const BankDetails = ({ account, user, onUpdate, showAlert }) => {
  const [activeTab, setActiveTab] = useState('checkbook');
  const [transactions, setTransactions] = useState([]);
  const [checks, setChecks] = useState([]);
  const [checkbooks, setCheckbooks] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Optimistic Balance State
  const [displayBalance, setDisplayBalance] = useState(0);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  // Modals
  const [showAddCheckbook, setShowAddCheckbook] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false); // New Claim Modal
  const [selectedCheckId, setSelectedCheckId] = useState(null);
  const [receivedByName, setReceivedByName] = useState(''); // New State for Claim
  const [clearDate, setClearDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Edit Date State
  const [showEditDateModal, setShowEditDateModal] = useState(false);
  const [selectedCheckForDateEdit, setSelectedCheckForDateEdit] = useState(null);
  const [newDateIssued, setNewDateIssued] = useState('');

  // Edit Transaction Date State
  const [showEditTransactionDateModal, setShowEditTransactionDateModal] = useState(false);
  const [selectedTransactionForEdit, setSelectedTransactionForEdit] = useState(null);
  const [newTransactionDate, setNewTransactionDate] = useState('');
  const [newTransactionAmount, setNewTransactionAmount] = useState('');
  
  // Confirmation State
  const [confirmation, setConfirmation] = useState({ isOpen: false, title: '', message: '', action: null, confirmColor: 'green', confirmText: 'Confirm' });

  // Forms
  const [checkbookForm, setCheckbookForm] = useState({ series_start: '', series_end: '' });
  const [transactionForm, setTransactionForm] = useState({ 
    type: 'Deposit', 
    amount: '', 
    description: '', 
    category: '',
    check_no: '',
    date: new Date().toISOString().split('T')[0]
  });

  const formatAmount = (value) => {
    let num = value.toString().replace(/[^0-9.]/g, '');
    const parts = num.split('.');
    if (parts[0]) {
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    return parts.slice(0, 2).join('.');
  };

  const [isCompact, setIsCompact] = useState(false);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (account) {
      setDisplayBalance(account.current_balance || 0);
      fetchTransactions(account.id);
      fetchCheckbooks(account.id);
      fetchChecks(account.id);
      if (account.company_id) {
          fetchCategories(account.company_id);
      }
    }
  }, [account]);

  const activeCheckbook = checkbooks.find(cb => cb.status === 'Active');

  const handleTableScroll = (e) => {
      const scrollTop = e.target.scrollTop;
      // Threshold set to 150px (approx height of card) to ensure it's scrolled out before shrinking header
      if (scrollTop > 150 && !isCompact) {
          setIsCompact(true);
          // Auto-scroll to bottom when card shrinks (showing most recent)
          if (scrollContainerRef.current) {
              setTimeout(() => {
                  const { scrollHeight, clientHeight } = scrollContainerRef.current;
                  scrollContainerRef.current.scrollTo({
                      top: scrollHeight - clientHeight,
                      behavior: 'smooth'
                  });
              }, 100);
          }
      } else if (scrollTop < 100 && isCompact) {
          setIsCompact(false);
      }
  };

  const fetchCategories = async (companyId) => {
      try {
          const res = await axios.get(`/categories?company_id=${companyId}`);
          setCategories(res.data || []);
          if (res.data && res.data.length > 0) {
              setTransactionForm(prev => ({ ...prev, category: res.data[0].name }));
          }
      } catch (err) {
          console.error("Error fetching categories", err);
          setCategories([]);
      }
  };

  const fetchTransactions = async (id) => {
    try {
      const res = await axios.get(`/banks/${id}/transactions`);
      setTransactions(res.data || []);
    } catch (err) {
      console.error(err);
      setTransactions([]);
    }
  };

  const fetchCheckbooks = async (id) => {
    try {
      const res = await axios.get(`/banks/${id}/checkbooks`);
      setCheckbooks(res.data || []);
    } catch (err) {
      console.error(err);
      setCheckbooks([]);
    }
  };

  const fetchChecks = async (id) => {
    try {
      const res = await axios.get(`/banks/${id}/checks`);
      setChecks(res.data || []);
    } catch (err) {
      console.error(err);
      setChecks([]);
    }
  };

  const handleAddCheckbook = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/banks/${account.id}/checkbooks`, checkbookForm);
      setShowAddCheckbook(false);
      setCheckbookForm({ series_start: '', series_end: '' });
      fetchCheckbooks(account.id);
    } catch (err) {
      showAlert('Error adding checkbook', 'error');
    }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    try {
      // Optimistic UI Update
      const amount = parseFloat(transactionForm.amount.replace(/,/g, ''));
      if (!isNaN(amount)) {
          const newBal = transactionForm.type === 'Deposit' 
              ? displayBalance + amount 
              : displayBalance - amount;
          setDisplayBalance(newBal);
      }

      await axios.post(`/banks/${account.id}/transaction`, transactionForm);
      setShowTransactionModal(false);
      setTransactionForm({ 
          type: 'Deposit', 
          amount: '', 
          description: '', 
          category: 'Sales', 
          check_no: '',
          date: new Date().toISOString().split('T')[0]
      });
      fetchTransactions(account.id);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
      // Revert optimistic update on error if needed, or rely on next fetch
      if (account) setDisplayBalance(account.current_balance);
      showAlert('Error recording transaction', 'error');
    }
  };

  const handleCheckAction = async (id, action) => {
      setSelectedCheckId(id);

      if (action === 'Cleared') {
          setClearDate(new Date().toISOString().split('T')[0]);
          setShowClearModal(true);
          return;
      }
      
      if (action === 'Claimed') {
          setReceivedByName('');
          setShowClaimModal(true);
          return;
      }

      try {
          // action: 'Cancelled' (Voided handled separately via confirmation)
          await axios.post(`/checks/${id}/status`, { status: action });
          fetchChecks(account.id);
      } catch (err) {
          showAlert('Error updating check status', 'error');
      }
  };

  const handleConfirmClaim = async (e) => {
      e.preventDefault();
      if (!receivedByName.trim()) {
          showAlert("Please enter who received the check", "error");
          return;
      }
      try {
          await axios.post(`/checks/${selectedCheckId}/status`, { 
              status: 'Claimed',
              received_by: receivedByName
          });
          setShowClaimModal(false);
          fetchChecks(account.id);
          if (onUpdate) onUpdate(); // Refresh parent stats if needed
          showAlert('Check marked as claimed', 'success');
      } catch (err) {
          showAlert('Error marking check as claimed', 'error');
      }
  };

  const handleConfirmClear = async (e) => {
      e.preventDefault();
      try {
          await axios.post(`/checks/${selectedCheckId}/status`, { 
              status: 'Cleared',
              date: clearDate 
          });
          setShowClearModal(false);
          fetchChecks(account.id);
          fetchTransactions(account.id);
          if (onUpdate) onUpdate();
      } catch (err) {
          showAlert('Error clearing check', 'error');
      }
  };

  const handleEditDate = (check) => {
      setSelectedCheckForDateEdit(check);
      setNewDateIssued(check.date_issued.split('T')[0]);
      setShowEditDateModal(true);
  };

  const handleSaveDate = async (e) => {
      e.preventDefault();
      try {
          await axios.put(`/checks/${selectedCheckForDateEdit.id}`, {
              date_issued: newDateIssued
          });
          setShowEditDateModal(false);
          fetchChecks(account.id);
          showAlert('Date issued updated successfully', 'success');
      } catch (err) {
          showAlert('Error updating date issued', 'error');
      }
  };

  const handleEditTransactionDate = (tx) => {
      setSelectedTransactionForEdit(tx);
      setNewTransactionDate(tx.transaction_date.split('T')[0]);
      setNewTransactionAmount(formatAmount(tx.amount));
      setShowEditTransactionDateModal(true);
  };

  const handleSaveTransactionDate = async (e) => {
      e.preventDefault();
      console.log('Starting transaction update...', selectedTransactionForEdit);
      try {
          await axios.put(`/transactions/${selectedTransactionForEdit.id}`, {
              transaction_date: newTransactionDate,
              amount: newTransactionAmount
          });
          console.log('Transaction update successful');
          setShowEditTransactionDateModal(false);
          fetchTransactions(account.id);
          fetchChecks(account.id); // Refresh checks too as balance might affect logic? No, but good practice.
          // We need to refresh account balance in parent component
          if (onUpdate) onUpdate();
          
          showAlert('Transaction updated successfully', 'success');
      } catch (err) {
          console.error('Error updating transaction:', err);
          showAlert('Error updating transaction: ' + (err.response?.data?.error || err.message), 'error');
      }
  };

  const filteredChecks = (checks || []).filter(c => 
    (c.check_number.includes(searchTerm) || 
     c.payee.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))) &&
    (!filterDate || c.date_issued.startsWith(filterDate))
  ).sort((a, b) => new Date(a.date_issued) - new Date(b.date_issued) || a.id - b.id);

  const filteredTransactions = (transactions || []).filter(t => 
    (t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (t.check_no && t.check_no.includes(searchTerm))) &&
    (!filterDate || t.transaction_date.startsWith(filterDate))
  ).sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date) || a.id - b.id);

  // Auto-scroll to bottom on load/update if showing passbook
  useEffect(() => {
    if (activeTab === 'passbook' && scrollContainerRef.current) {
         // Use setTimeout to allow render to complete
        setTimeout(() => {
            const { scrollHeight, clientHeight } = scrollContainerRef.current;
            scrollContainerRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: 'smooth'
            });
        }, 100);
    }
  }, [activeTab, transactions, filteredTransactions.length]);

  if (!account) return <div className="text-gray-500">Select an account</div>;

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-hidden">
      {/* Header */}
      <div className={`flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-800 rounded-b-2xl shadow-lg text-white relative overflow-hidden transition-all duration-500 ease-in-out ${isCompact ? 'p-4' : 'p-6 md:p-8 rounded-t-2xl'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black opacity-10 rounded-full -ml-10 -mb-10 blur-2xl"></div>
        
        <div className={`relative z-10 flex ${isCompact ? 'items-center justify-between' : 'flex-col md:flex-row justify-between items-start md:items-center gap-6'}`}>
            <div className={isCompact ? 'flex items-center gap-6' : ''}>
                <div className={`flex items-center gap-3 ${isCompact ? 'mb-0' : 'mb-2'}`}>
                    <h2 className={`${isCompact ? 'text-xl' : 'text-3xl'} font-bold tracking-tight transition-all`}>{account.bank_name}</h2>
                    {account.company_name && !isCompact && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm border border-white/10">
                        {account.company_name}
                        </span>
                    )}
                </div>
                {!isCompact && (
                    <p className="text-blue-100 font-mono text-lg opacity-90 flex items-center gap-2">
                        <span className="opacity-60">ACCT</span> {account.account_number}
                    </p>
                )}
                <div className={isCompact ? '' : 'mt-6'}>
                    {!isCompact && <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-1">Current Balance</p>}
                    <p className={`${isCompact ? 'text-2xl' : 'text-5xl'} font-bold tracking-tight transition-all`}>
                        {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(displayBalance)}
                    </p>
                </div>
                
                {/* Active Series Widget in Header */}
                {activeCheckbook && isCompact && (
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl flex items-center gap-3 transition-all px-3 py-1.5 ml-4">
                        <div className="bg-white/20 rounded-lg flex items-center justify-center p-1">
                            <BookOpen size={14} className="text-white" />
                        </div>
                        <div>
                            <div className="text-[10px] text-blue-200 uppercase font-bold tracking-wider">Active Series</div>
                            <div className="font-mono font-bold text-white text-sm">
                                {activeCheckbook.series_start} <span className="opacity-50">→</span> {activeCheckbook.series_end}
                            </div>
                        </div>
                        <div className="border-l border-white/20 pl-3 hidden md:block">
                            <div className="text-[10px] text-blue-200 uppercase font-bold tracking-wider">Next</div>
                            <div className="font-mono font-bold text-green-300 text-sm">{activeCheckbook.next_check_no}</div>
                        </div>
                    </div>
                )}
            </div>

            <div className={`flex gap-3 ${isCompact ? '' : 'w-full md:w-auto'}`}>
                <button 
                    onClick={() => {
                        setTransactionForm({ ...transactionForm, type: 'Deposit', category: 'Sales' });
                        setShowTransactionModal(true);
                    }}
                    className={`bg-white text-green-700 hover:bg-green-50 font-bold shadow-lg shadow-black/10 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-1 ${isCompact ? 'px-4 py-2 rounded-lg text-sm' : 'flex-1 md:flex-none px-6 py-3 rounded-xl'}`}
                >
                    <div className={isCompact ? 'hidden' : 'bg-green-100 p-1 rounded-full'}><ArrowDownLeft size={18} /></div>
                    Deposit
                </button>
                <button 
                    onClick={() => {
                        setTransactionForm({ ...transactionForm, type: 'Withdrawal', category: 'Wages' });
                        setShowTransactionModal(true);
                    }}
                    className={`bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 font-bold flex items-center justify-center gap-2 transition-all ${isCompact ? 'px-4 py-2 rounded-lg text-sm' : 'flex-1 md:flex-none px-6 py-3 rounded-xl'}`}
                >
                    <div className={isCompact ? 'hidden' : 'bg-white/20 p-1 rounded-full'}><ArrowUpRight size={18} /></div>
                    Withdraw
                </button>
            </div>
        </div>
      </div>

      {/* Toolbar (Tabs + Search) */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white z-10 flex flex-col md:flex-row justify-between items-end md:items-center px-4 md:px-0 gap-2 md:gap-0">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('checkbook')}
            className={`${
              activeTab === 'checkbook'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors`}
          >
            <BookOpen size={18} />
            Checkbook Management
          </button>
          <button
            onClick={() => setActiveTab('passbook')}
            className={`${
              activeTab === 'passbook'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors`}
          >
            <History size={18} />
            Passbook & History
          </button>
        </nav>

        {/* Search Inputs moved here */}
        <div className="flex items-center gap-2 pb-2 md:pb-0 md:pr-4 w-full md:w-auto">
            <input 
                type="date" 
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
            />
            <div className="relative flex-1 md:w-64">
                <input 
                    type="text" 
                    placeholder="Search..." 
                    className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 pl-8"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <FileText size={12} className="text-gray-400" />
                </div>
            </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-gray-50">
        <div 
            ref={scrollContainerRef}
            className="h-full overflow-auto custom-scrollbar"
            onScroll={handleTableScroll}
        >
            {/* Checkbook Tab */}
            {activeTab === 'checkbook' && (
                <div className="flex flex-col gap-6 min-h-full p-4 md:p-6">
                    {/* Series Info */}
                    <div className={`flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-fade-in transition-all duration-500`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                                <BookOpen className="text-blue-600" size={20} />
                                Checkbook Series
                            </h3>
                            <button 
                                onClick={() => setShowAddCheckbook(true)}
                                className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                            >
                                <Plus size={16} /> Add Series
                            </button>
                        </div>
                        <div className="flex overflow-x-auto gap-4 pb-4 snap-x custom-scrollbar">
                            {(checkbooks || []).map(cb => (
                                <div key={cb.id} className="min-w-[280px] flex-shrink-0 border border-gray-200 rounded-xl p-4 bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-shadow relative overflow-hidden snap-start">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between mb-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${cb.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                            {cb.status}
                                            </span>
                                        </div>
                                        <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Series Range</div>
                                        <div className="font-mono font-bold text-xl text-gray-800 tracking-tight">{cb.series_start} <span className="text-gray-400">→</span> {cb.series_end}</div>
                                        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                                            <span className="text-xs text-gray-500">Next Check</span>
                                            <span className="font-mono font-bold text-blue-600">{cb.next_check_no}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {checkbooks.length === 0 && (
                                <div className="w-full text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl flex-shrink-0">
                                    No checkbooks added yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Checks Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider first:rounded-tl-xl">Date Issued</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">PDC Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Check No</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Payee / Description</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider last:rounded-tr-xl">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredChecks.map(check => (
                                        <tr key={check.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    {new Date(check.date_issued).toLocaleDateString()}
                                                    {user.role === 'admin' && (
                                                        <button 
                                                            onClick={() => handleEditDate(check)}
                                                            className="text-blue-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Edit Date Issued"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                {check.check_date ? (
                                                    <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-100">
                                                        {new Date(check.check_date).toLocaleDateString()}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 font-bold">
                                                {check.check_number}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                <div className="font-bold text-gray-800">{check.payee}</div>
                                                <div className="text-gray-500 text-xs mt-0.5">{check.description}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right text-gray-900">
                                                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(check.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${
                                                    check.status === 'Cleared' ? 'bg-green-50 text-green-700 border-green-100' :
                                                    check.status === 'Claimed' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                    check.status === 'Cancelled' || check.status === 'Voided' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    check.status === 'Bounced' ? 'bg-red-100 text-red-800 border-red-200' :
                                                    'bg-yellow-50 text-yellow-700 border-yellow-100'
                                                }`}>
                                                    {check.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {check.status === 'Issued' && (
                                                    <>
                                                        <button onClick={() => handleCheckAction(check.id, 'Claimed')} className="text-blue-600 hover:text-blue-800 mr-3 font-bold">Mark Claimed</button>
                                                        <button onClick={() => {
                                                            setConfirmation({
                                                                isOpen: true,
                                                                title: 'Void Check',
                                                                message: 'Are you sure you want to VOID this check? This will cancel the check.',
                                                                action: () => handleCheckAction(check.id, 'Voided'),
                                                                confirmColor: 'red',
                                                                confirmText: 'Void Check'
                                                            });
                                                        }} className="text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-wider">Void</button>
                                                    </>
                                                )}
                                                {check.status === 'Claimed' && (
                                                    <>
                                                        <button onClick={() => handleCheckAction(check.id, 'Cleared')} className="text-green-600 hover:text-green-800 mr-3 font-bold">Clear (Debit)</button>
                                                        <button onClick={() => {
                                                            setConfirmation({
                                                                isOpen: true,
                                                                title: 'Bounce Check',
                                                                message: 'Are you sure you want to mark this check as Bounced?',
                                                                action: () => handleCheckAction(check.id, 'Bounced'),
                                                                confirmColor: 'red',
                                                                confirmText: 'Bounce Check'
                                                            });
                                                        }} className="text-red-600 hover:text-red-800 font-bold">Bounce</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredChecks.length === 0 && (
                                        <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-400 italic">No checks found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Passbook Tab */}
            {activeTab === 'passbook' && (
                <div className="flex flex-col gap-6 min-h-full p-4 md:p-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider first:rounded-tl-xl">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Check No</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Deposit</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Withdrawal</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider last:rounded-tr-xl">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredTransactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                                <div className="flex items-center gap-2">
                                                    {new Date(tx.transaction_date).toLocaleDateString()}
                                                    {user.role === 'admin' && (
                                                        <button 
                                                            onClick={() => handleEditTransactionDate(tx)}
                                                            className="text-blue-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Edit Transaction Date"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                                                {tx.check_no ? <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">{tx.check_no}</span> : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{tx.description}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full border ${
                                                    tx.type === 'Bounced' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>
                                                    {tx.category || tx.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right text-green-600">
                                                {tx.type === 'Deposit' ? (
                                                    <span className="bg-green-50 px-2 py-1 rounded text-green-700">
                                                        + {new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(tx.amount)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right text-red-600">
                                                {tx.type === 'Withdrawal' ? (
                                                    <span className="bg-red-50 px-2 py-1 rounded text-red-700">
                                                        - {new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(tx.amount)}
                                                    </span>
                                                ) : tx.type === 'Bounced' ? (
                                                    <span className="bg-red-50 px-2 py-1 rounded text-red-700">
                                                        ! {new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(tx.amount)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                                {new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(tx.running_balance)}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTransactions.length === 0 && (
                                        <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-400 italic">No transactions found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Modals */}
      {showAddCheckbook && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl w-96 shadow-2xl transform transition-all scale-100 border border-gray-100">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                        <BookOpen size={18} />
                    </div>
                    Add Checkbook Series
                </h3>
                <button onClick={() => setShowAddCheckbook(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddCheckbook} className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Start Series</label>
                    <input 
                        type="number"
                        placeholder="e.g. 1001" 
                        className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all font-mono"
                        value={checkbookForm.series_start}
                        onChange={e => setCheckbookForm({...checkbookForm, series_start: e.target.value})}
                        required
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">End Series</label>
                    <input 
                        type="number"
                        placeholder="e.g. 1050" 
                        className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all font-mono"
                        value={checkbookForm.series_end}
                        onChange={e => setCheckbookForm({...checkbookForm, series_end: e.target.value})}
                        required
                    />
                </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddCheckbook(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5">
                    Save Series
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl w-96 shadow-2xl transform transition-all scale-100 border border-gray-100">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${transactionForm.type === 'Deposit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {transactionForm.type === 'Deposit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    Record {transactionForm.type}
                </h3>
                <button onClick={() => setShowTransactionModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleTransaction} className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</label>
                    <input 
                        type="date"
                        className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all"
                        value={transactionForm.date}
                        onChange={e => setTransactionForm({...transactionForm, date: e.target.value})}
                        required
                    />
                </div>
                <div className="group">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <FileText size={12} /> Category
                    </label>
                    <div className="relative">
                        <select 
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 appearance-none transition-colors hover:bg-gray-100 cursor-pointer"
                            value={transactionForm.category}
                            onChange={e => setTransactionForm({...transactionForm, category: e.target.value})}
                        >
                            <option value="">Select Category</option>
                            {(categories || []).map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 group-hover:text-blue-600 transition-colors">
                            <ChevronDown size={16} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Amount</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₱</span>
                        <input 
                            type="text"
                            placeholder="0.00" 
                            className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pl-8 transition-all font-mono font-bold"
                            value={transactionForm.amount}
                            onChange={e => setTransactionForm({...transactionForm, amount: formatAmount(e.target.value)})}
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                    <input 
                        placeholder="Enter details..." 
                        className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all"
                        value={transactionForm.description}
                        onChange={e => setTransactionForm({...transactionForm, description: e.target.value})}
                        required
                    />
                </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowTransactionModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className={`px-5 py-2.5 text-white rounded-xl font-bold shadow-lg transition-all transform hover:-translate-y-0.5 ${transactionForm.type === 'Deposit' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}>
                    Record {transactionForm.type}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClearModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl w-96 shadow-2xl transform transition-all scale-100 border border-gray-100">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 text-green-600 rounded-lg">
                        <CheckSquare size={18} />
                    </div>
                    Clear Check
                </h3>
                <button onClick={() => setShowClearModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleConfirmClear} className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date Cleared</label>
                    <input 
                        type="date"
                        className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all"
                        value={clearDate}
                        onChange={e => setClearDate(e.target.value)}
                        required
                    />
                    <p className="mt-2 text-xs text-gray-500">
                        This date will be reflected in the passbook transaction history.
                    </p>
                </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowClearModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition-all transform hover:-translate-y-0.5">
                    Confirm Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClaimModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl w-96 shadow-2xl transform transition-all scale-100 border border-gray-100">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                        <CheckSquare size={18} />
                    </div>
                    Mark as Claimed
                </h3>
                <button onClick={() => setShowClaimModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleConfirmClaim} className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Received By</label>
                    <input 
                        type="text"
                        placeholder="Enter name of recipient"
                        className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all"
                        value={receivedByName}
                        onChange={e => setReceivedByName(e.target.value)}
                        autoFocus
                        required
                    />
                    <p className="mt-2 text-xs text-gray-500">
                        This name will be recorded on the voucher.
                    </p>
                </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowClaimModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5">
                    Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditDateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl w-96 shadow-2xl transform transition-all scale-100 border border-gray-100">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                        <Edit size={18} />
                    </div>
                    Edit Date Issued
                </h3>
                <button onClick={() => setShowEditDateModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveDate} className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">New Date Issued</label>
                    <input 
                        type="date"
                        className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all"
                        value={newDateIssued}
                        onChange={e => setNewDateIssued(e.target.value)}
                        required
                    />
                </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditDateModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5">
                    Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditTransactionDateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl w-96 shadow-2xl transform transition-all scale-100 border border-gray-100">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                        <Edit size={18} />
                    </div>
                    Edit Transaction
                </h3>
                <button onClick={() => setShowEditTransactionDateModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveTransactionDate} className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Transaction Date</label>
                    <input 
                        type="date"
                        className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all"
                        value={newTransactionDate}
                        onChange={e => setNewTransactionDate(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Amount</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₱</span>
                        <input 
                            type="text"
                            placeholder="0.00"
                            className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pl-8 transition-all font-mono font-bold"
                            value={newTransactionAmount}
                            onChange={e => setNewTransactionAmount(formatAmount(e.target.value))}
                            required
                        />
                    </div>
                    <p className="mt-2 text-xs text-red-500 font-medium">
                        Warning: Changing the amount will recalculate the running balance for all subsequent transactions.
                    </p>
                </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditTransactionDateModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5">
                    Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={confirmation.isOpen}
        onClose={() => setConfirmation({ ...confirmation, isOpen: false })}
        onConfirm={() => {
            if (confirmation.action) confirmation.action();
            setConfirmation({ ...confirmation, isOpen: false });
        }}
        title={confirmation.title}
        message={confirmation.message}
        confirmText={confirmation.confirmText}
        confirmColor={confirmation.confirmColor}
      />
    </div>
  );
};

export default BankDetails;
