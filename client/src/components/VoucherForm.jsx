import React, { useState, useEffect } from 'react';
import axios from '../api';
import { 
  X, Calendar, User, FileText, DollarSign, CreditCard, 
  Building, AlertTriangle, Clock, CheckCircle, ChevronDown,
  AlignLeft, Hash, Tag, List, ListOrdered, Paperclip
} from 'lucide-react';

const VoucherForm = ({ user, initialData, onSuccess, onCancel, showAlert }) => {
  const [formData, setFormData] = useState({
    company_id: user.company_id || '',
    date: new Date().toISOString().split('T')[0],
    payee: '',
    description: '',
    amount: '',
    amount_in_words: '',
    payment_type: 'Check',
    check_no: '',
    check_date: '', // PDC Date
    check_issued_date: new Date().toISOString().split('T')[0], // New Check Issue Date
    bank_name: '',
    category: 'Sales',
    urgency: 'Normal',
    deadline_date: '',
    is_pdc: false,
    attachments: [] // New files to upload
  });

  const [existingAttachments, setExistingAttachments] = useState([]);
  const [removedAttachments, setRemovedAttachments] = useState([]);

  const [banks, setBanks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loadingCheckNo, setLoadingCheckNo] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        company_id: initialData.company_id || '',
        date: initialData.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0],
        payee: initialData.payee || '',
        description: initialData.description || '',
        amount: initialData.amount || '',
        amount_in_words: initialData.amount_in_words || '',
        payment_type: initialData.payment_type || 'Check',
        check_no: initialData.check_no || '',
        check_date: initialData.check_date ? initialData.check_date.split('T')[0] : '',
        check_issued_date: initialData.check_issued_date ? initialData.check_issued_date.split('T')[0] : (initialData.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]),
        bank_name: initialData.bank_name || '',
        category: initialData.category || 'Sales',
        urgency: initialData.urgency || 'Normal',
        deadline_date: initialData.deadline_date ? initialData.deadline_date.split('T')[0] : '',
        is_pdc: !!initialData.check_date,
        attachments: [] 
      });

      // Parse existing attachments
      if (initialData.attachment_ids && initialData.attachment_paths && initialData.attachment_names) {
          const ids = initialData.attachment_ids.toString().split('||');
          const paths = initialData.attachment_paths.split('||');
          const names = initialData.attachment_names.split('||');
          
          const attachments = ids.map((id, index) => ({
              id,
              path: paths[index],
              name: names[index]
          }));
          setExistingAttachments(attachments);
      } else {
          setExistingAttachments([]);
      }
    }
    
    // Fetch companies if user is HR, Liaison or Admin
    if (['hr', 'liaison', 'admin'].includes(user.role)) {
        fetchCompanies();
    }

    // Fetch banks if user is Liaison or Admin (who might need to see/edit)
    if (user.role === 'liaison' || user.role === 'admin') {
      fetchBanks();
    }
  }, [initialData, user.role]);

  // Fetch categories whenever company_id changes
  useEffect(() => {
      if (formData.company_id) {
          fetchCategories();
      }
  }, [formData.company_id]);

  const fetchCompanies = async () => {
      try {
          const res = await axios.get('http://localhost:5000/api/companies');
          setCompanies(res.data);
          // If creating new and no company selected yet, select first one
          if (!initialData && !formData.company_id && res.data.length > 0) {
              setFormData(prev => ({ ...prev, company_id: res.data[0].id }));
          }
      } catch (err) {
          console.error("Error fetching companies", err);
      }
  };

  const fetchCategories = async () => {
    try {
      const companyIdToUse = formData.company_id || user.company_id;
      if (!companyIdToUse) return;

      const res = await axios.get(`http://localhost:5000/api/categories?company_id=${companyIdToUse}`);
      setCategories(res.data);
      // Set default category if not set and we have categories
      // Only if we are not editing an existing voucher (initialData is null) OR if the current category is not in the new list
      if (!initialData && res.data.length > 0) {
          setFormData(prev => ({ ...prev, category: res.data[0].name }));
      }
    } catch (err) {
      console.error("Error fetching categories", err);
    }
  };

  const fetchBanks = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/banks?company_id=${user.company_id || ''}`);
      setBanks(res.data);
    } catch (err) {
      console.error("Error fetching banks", err);
    }
  };

  const handleBankChange = async (e) => {
    const selectedBankName = e.target.value;
    setFormData(prev => ({ ...prev, bank_name: selectedBankName }));

    if (selectedBankName) {
      const bank = banks.find(b => b.bank_name === selectedBankName);
      if (bank) {
        setLoadingCheckNo(true);
        try {
          const res = await axios.get(`http://localhost:5000/api/banks/${bank.id}/checkbooks`);
          const activeCheckbook = res.data.find(cb => cb.status === 'Active');
          if (activeCheckbook) {
            setFormData(prev => ({ ...prev, check_no: String(activeCheckbook.next_check_no || '') }));
          }
        } catch (err) {
          console.error("Error fetching checkbooks", err);
        } finally {
          setLoadingCheckNo(false);
        }
      }
    }
  };

  const insertAtCursor = (text) => {
    const textarea = document.querySelector('textarea[name="description"]');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = formData.description || '';
    
    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
    setFormData({ ...formData, description: newValue });
    
    // Restore focus and cursor position
    setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
    }, 0);
  };

  const handleChange = (e) => {
    if (e.target.type === 'file') {
        const newFiles = Array.from(e.target.files);
        setFormData(prev => ({
            ...prev,
            attachments: [...prev.attachments, ...newFiles]
        }));
        e.target.value = ''; // Reset input to allow adding more files
    } else {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        let newFormData = { ...formData, [e.target.name]: value };
        
        // Auto-set is_pdc if check_date is set
        if (e.target.name === 'check_date') {
            newFormData.is_pdc = !!value;
        }
        
        setFormData(newFormData);
    }
  };

  const handleRemoveAttachment = (id) => {
      setRemovedAttachments(prev => [...prev, id]);
      setExistingAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleRemoveNewAttachment = (index) => {
      setFormData(prev => ({
          ...prev,
          attachments: prev.attachments.filter((_, i) => i !== index)
      }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate Company ID
    const effectiveCompanyId = formData.company_id || user.company_id;
    if (!effectiveCompanyId) {
        showAlert("Please select a company.", 'error');
        return;
    }

    try {
      const data = new FormData();
      
      // Append basic fields
      Object.keys(formData).forEach(key => {
          if (key === 'company_id') return; // Skip, handled manually
          if (key === 'attachments') {
              if (formData.attachments && formData.attachments.length > 0) {
                  formData.attachments.forEach(file => {
                      data.append('attachments', file);
                  });
              }
          } else {
              const value = formData[key];
              data.append(key, value === null || value === undefined ? '' : value);
          }
      });
      
      data.append('company_id', effectiveCompanyId);
      data.append('created_by', user.id); // For creation
      data.append('user_id', user.id); // For history logging
      data.append('role', user.role);

      if (initialData) {
        // Update existing voucher
        let newStatus = initialData.status;
        
        // Reset status based on role to ensure proper approval flow
        if (user.role === 'staff') {
            newStatus = 'Pending Liaison';
        } else if (user.role === 'liaison') {
            newStatus = 'Pending Admin';
        }
        
        data.append('status', newStatus);
        
        if (removedAttachments.length > 0) {
            data.append('removed_attachments', JSON.stringify(removedAttachments));
        }

        await axios.put(`http://localhost:5000/api/vouchers/${initialData.id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Create new voucher
        await axios.post('http://localhost:5000/api/vouchers', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      onSuccess();
    } catch (err) {
      showAlert('Error saving voucher: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const isLiaisonProcessing = user.role === 'liaison' && initialData;
  const isStaffCreating = user.role === 'staff' && !initialData;
  const canSelectCompany = ['hr', 'liaison', 'admin'].includes(user.role) && !initialData; // Only on creation
  
  // Liaison can edit check details, but check_no is restricted if status is 'Issued' (Admin Approved)
  const canEditCheckDetails = user.role === 'liaison' || user.role === 'admin';
  const canEditCheckNo = canEditCheckDetails && !(user.role === 'liaison' && initialData?.status === 'Issued');

  // Disabled specialized view to allow full editing for Liaison
  if (isLiaisonProcessing) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <div className="bg-blue-600 p-1 rounded-lg text-white shadow-lg shadow-blue-200">
                    <CreditCard size={16} />
                </div>
                Process Voucher Issuance
            </h2>
            <button 
                onClick={onCancel}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-700"
            >
                <X size={18} />
            </button>
          </div>

          {/* Content - Side by Side */}
          <div className="p-5 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left Column: Voucher Summary */}
                <div className="md:col-span-7 space-y-4">
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Pay To</h3>
                                <div className="text-lg font-bold text-gray-900 leading-tight">{formData.payee}</div>
                            </div>
                            <div className="text-right">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Amount</h3>
                                <div className="text-xl font-bold text-gray-900 font-mono text-blue-600">
                                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(formData.amount)}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-200 mb-3">
                            <div>
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Issued Date</span>
                                <div className="font-medium text-xs text-gray-900">{formData.date}</div>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Created By</span>
                                <div className="font-medium text-xs text-gray-900">{initialData?.created_by_name || 'System'}</div>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Category</span>
                                <div className="font-medium text-xs text-gray-900">{formData.category}</div>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Urgency</span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    formData.urgency === 'Critical' ? 'bg-red-100 text-red-800' :
                                    formData.urgency === 'Urgent' ? 'bg-orange-100 text-orange-800' :
                                    'bg-green-100 text-green-800'
                                }`}>
                                    {formData.urgency}
                                </span>
                            </div>
                        </div>

                        <div>
                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</span>
                            <div className="text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-200 whitespace-pre-wrap max-h-[120px] overflow-y-auto custom-scrollbar">
                                {formData.description || 'No description provided.'}
                            </div>
                        </div>
                    </div>

                    {/* Attachments Compact View */}
                    {(existingAttachments.length > 0) && (
                        <div className="bg-white rounded-xl border border-gray-200 p-3">
                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Paperclip size={10} /> Attachments
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                {existingAttachments.map(att => (
                                    <a key={att.id} href={`http://localhost:5000${att.path}`} target="_blank" rel="noopener noreferrer" 
                                    className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-100 transition-all group">
                                        <div className="bg-white p-1 rounded border border-gray-200 text-blue-500">
                                            <FileText size={12} />
                                        </div>
                                        <span className="text-xs text-gray-600 group-hover:text-blue-700 truncate font-medium">
                                            {att.name}
                                        </span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Issuance Form */}
                <div className="md:col-span-5">
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 h-full">
                        <h3 className="text-blue-800 text-xs font-bold mb-4 flex items-center gap-2 uppercase tracking-wider border-b border-blue-100 pb-2">
                            <CreditCard size={14} /> Issuance Details
                        </h3>
                        
                        <div className="space-y-4">
                            <CustomSelect 
                                label="Payment Type" 
                                icon={CreditCard}
                                name="payment_type" 
                                disabled={true}
                                value={formData.payment_type} 
                                onChange={handleChange}
                                className="bg-white"
                            >
                                <option value="Encashment">Encashment</option>
                                <option value="Check">Check</option>
                            </CustomSelect>

                            <CustomSelect 
                                label="Bank Name" 
                                icon={Building}
                                name="bank_name" 
                                required
                                value={formData.bank_name} 
                                onChange={handleBankChange}
                                className="bg-white"
                            >
                                <option value="">Select Bank</option>
                                {banks.map(bank => (
                                <option key={bank.id} value={bank.bank_name}>
                                    {bank.bank_name} ({bank.account_number})
                                </option>
                                ))}
                            </CustomSelect>

                            <div className="group">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <Hash size={12} /> Check No
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        name="check_no" 
                                        required
                                        disabled={!canEditCheckNo}
                                        className={`w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all font-mono ${!canEditCheckNo ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                        value={formData.check_no} 
                                        onChange={handleChange} 
                                        placeholder="0000000000"
                                    />
                                    {loadingCheckNo && (
                                        <div className="absolute right-3 top-2.5 text-[10px] font-bold text-blue-500 animate-pulse">Loading...</div>
                                    )}
                                </div>
                            </div>

                            <CustomInput 
                                type="date" 
                                label="Date Check Issued" 
                                icon={Calendar}
                                name="check_issued_date" 
                                required={isLiaisonProcessing}
                                value={formData.check_issued_date} 
                                onChange={handleChange} 
                                className="bg-white"
                            />

                             <CustomInput 
                                type="date" 
                                label="Check Date (PDC)" 
                                icon={Calendar}
                                name="check_date" 
                                value={formData.check_date} 
                                onChange={handleChange} 
                                title="Leave empty for Standard Check"
                                className="bg-white"
                            />
                        </div>
                    </div>
                </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button type="button" onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-white hover:shadow-sm transition-all">
              Cancel
              </button>
              <button onClick={handleSubmit}
              className="px-4 py-2 border border-transparent rounded-lg shadow-lg shadow-blue-200 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
              <CheckCircle size={14} />
              Issue Voucher
              </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-gray-100 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-lg shadow-blue-200">
                  {initialData ? <CreditCard size={18} /> : <FileText size={18} />}
              </div>
              {initialData ? 'Process Voucher' : 'Create New Voucher'}
          </h2>
          <button 
              onClick={onCancel}
              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-700"
          >
              <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-12 gap-4">
              {/* Row 1: Date & Deadline */}
              <div className="col-span-12 md:col-span-6">
                <CustomInput 
                    type="date" 
                    label="Issued Date" 
                    icon={Calendar}
                    name="date" 
                    required 
                    value={formData.date} 
                    onChange={handleChange} 
                />
              </div>

              <div className="col-span-12 md:col-span-6">
                <CustomInput 
                    type="date" 
                    label="Deadline" 
                    icon={Clock}
                    name="deadline_date" 
                    value={formData.deadline_date} 
                    onChange={handleChange} 
                />
              </div>

              {/* Row 2: Payee, Company, Category */}
              <div className={`col-span-12 ${canSelectCompany ? 'md:col-span-6' : 'md:col-span-8'}`}>
                <CustomInput 
                    type="text" 
                    label="Payee" 
                    icon={User}
                    name="payee" 
                    required 
                    placeholder="Enter payee name"
                    value={formData.payee} 
                    onChange={handleChange} 
                />
              </div>

              {canSelectCompany && (
                  <div className="col-span-12 md:col-span-3">
                    <CustomSelect 
                        label="Company" 
                        icon={Building}
                        name="company_id" 
                        required
                        value={formData.company_id} 
                        onChange={handleChange}
                    >
                        <option value="">Select Company</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </CustomSelect>
                  </div>
              )}

              <div className={`col-span-12 ${canSelectCompany ? 'md:col-span-3' : 'md:col-span-4'}`}>
                <CustomSelect 
                    label="Category" 
                    icon={Tag}
                    name="category" 
                    value={formData.category} 
                    onChange={handleChange}
                >
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                </CustomSelect>
              </div>

              {/* Row 3: Amount & Words */}
              <div className="col-span-12 md:col-span-4">
                <div className="group">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <DollarSign size={12} /> Amount
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₱</span>
                        <input 
                            type="number" 
                            name="amount" 
                            step="0.01" 
                            required 
                            className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pl-8 transition-all font-mono font-bold"
                            placeholder="0.00"
                            value={formData.amount} 
                            onChange={handleChange} 
                        />
                    </div>
                </div>
              </div>

              <div className="col-span-12 md:col-span-8">
                <CustomInput 
                    type="text" 
                    label="Amount in Words" 
                    icon={AlignLeft}
                    name="amount_in_words" 
                    required 
                    placeholder="e.g. One Thousand Pesos Only"
                    value={formData.amount_in_words} 
                    onChange={handleChange} 
                />
              </div>

              {/* Row 4: Payment Type, Urgency, PDC */}
              <div className="col-span-12 md:col-span-4">
                <CustomSelect 
                    label="Payment Type" 
                    icon={CreditCard}
                    name="payment_type" 
                    value={formData.payment_type} 
                    onChange={handleChange}
                >
                    <option value="Encashment">Encashment</option>
                    <option value="Check">Check</option>
                </CustomSelect>
              </div>

              <div className="col-span-12 md:col-span-4">
                <CustomSelect 
                    label="Urgency" 
                    icon={AlertTriangle}
                    name="urgency" 
                    value={formData.urgency} 
                    onChange={handleChange}
                    className={
                        formData.urgency === 'Critical' ? 'text-red-600 font-bold bg-red-50' : 
                        formData.urgency === 'Urgent' ? 'text-orange-600 font-bold bg-orange-50' : ''
                    }
                >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Critical">Critical</option>
                </CustomSelect>
              </div>

              <div className="col-span-12 md:col-span-4">
                <CustomInput 
                    type="date" 
                    label="Check Date (PDC)" 
                    icon={Calendar}
                    name="check_date" 
                    value={formData.check_date} 
                    onChange={handleChange} 
                    title="Leave empty for Standard Check"
                />
              </div>

              {/* Row 5: Description */}
              <div className="col-span-12">
                <div className="flex justify-between items-end mb-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText size={12} /> Description
                    </label>
                </div>
                <div className="relative">
                    <textarea 
                        name="description" 
                        rows="5" 
                        className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-16 transition-all resize-none font-mono leading-relaxed"
                        placeholder="Enter voucher description..."
                        value={formData.description} 
                        onChange={handleChange}
                    ></textarea>
                    {(
                        <div className="absolute top-2 right-2 flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                            <button type="button" onClick={() => insertAtCursor('• ')} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 hover:text-blue-600 transition-all" title="Bullet List">
                                <List size={14} />
                            </button>
                            <button type="button" onClick={() => insertAtCursor('1. ')} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 hover:text-blue-600 transition-all" title="Numbered List">
                                <ListOrdered size={14} />
                            </button>
                        </div>
                    )}
                </div>
              </div>

              {/* Attachment */}
              <div className="col-span-12">
                <div className="group">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Paperclip size={12} /> Attachments (Invoice, Receipt, etc.)
                    </label>
                    
                    {/* Existing Attachments */}
                    {existingAttachments.length > 0 && (
                        <div className="mb-3 space-y-2">
                            {existingAttachments.map(att => (
                                <div key={att.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    <a href={`http://localhost:5000${att.path}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate max-w-[80%]">
                                        {att.name}
                                    </a>
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveAttachment(att.id)}
                                        className="text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors"
                                        title="Remove Attachment"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* New Attachments List */}
                    {formData.attachments && formData.attachments.length > 0 && (
                        <div className="mb-3 space-y-2">
                            {formData.attachments.map((file, index) => (
                                <div key={index} className="flex items-center justify-between bg-blue-50 p-2 rounded-lg border border-blue-100">
                                    <span className="text-sm text-blue-700 truncate max-w-[80%] flex items-center gap-2">
                                        <FileText size={14} /> {file.name} <span className="text-xs text-blue-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                    </span>
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveNewAttachment(index)}
                                        className="text-red-500 hover:bg-red-100 p-1 rounded-full transition-colors"
                                        title="Remove File"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <input 
                        type="file" 
                        name="attachments" 
                        multiple
                        onChange={handleChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all"
                    />
                    <div className="mt-1 text-xs text-gray-400">
                        Click to add more files.
                    </div>
                </div>
              </div>
              
              {/* Check Details Section */}
              {canEditCheckDetails && (formData.payment_type === 'Check' || formData.payment_type === 'Encashment') && (
                <div className="col-span-12 bg-blue-50/50 p-4 rounded-xl border border-blue-100 animate-fade-in">
                  <h3 className="text-blue-800 text-xs font-bold mb-3 flex items-center gap-2 uppercase tracking-wider">
                      <CreditCard size={14} /> Check Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <CustomSelect 
                            label="Bank Name" 
                            icon={Building}
                            name="bank_name" 
                            required={isLiaisonProcessing}
                            value={formData.bank_name} 
                            onChange={handleBankChange}
                        >
                            <option value="">Select Bank</option>
                            {banks.map(bank => (
                            <option key={bank.id} value={bank.bank_name}>
                                {bank.bank_name} ({bank.account_number})
                            </option>
                            ))}
                        </CustomSelect>
                        <div className="mt-4">
                            <CustomInput 
                                type="date" 
                                label="Date Check Issued" 
                                icon={Calendar}
                                name="check_issued_date" 
                                value={formData.check_issued_date} 
                                onChange={handleChange} 
                            />
                        </div>
                    </div>
                    <div>
                        <div className="group">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <Hash size={12} /> Check No
                            </label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    name="check_no" 
                                    required={isLiaisonProcessing}
                                    disabled={!canEditCheckNo}
                                    className={`w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all font-mono ${!canEditCheckNo ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    value={formData.check_no} 
                                    onChange={handleChange} 
                                    placeholder="0000000000"
                                />
                                {loadingCheckNo && (
                                    <div className="absolute right-3 top-2.5 text-[10px] font-bold text-blue-500 animate-pulse">Loading...</div>
                                )}
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
            <button type="button" onClick={onCancel}
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-white hover:shadow-sm transition-all">
            Cancel
            </button>
            <button onClick={handleSubmit}
            className="px-5 py-2.5 border border-transparent rounded-xl shadow-lg shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
            {initialData ? <CheckCircle size={16} /> : <FileText size={16} />}
            {initialData ? 'Submit for Approval' : 'Create Voucher'}
            </button>
        </div>
      </div>
    </div>
  );
};

// Custom Dropdown Component
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

// Custom Input Component
const CustomInput = ({ label, icon: Icon, ...props }) => (
  <div>
    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
      {Icon && <Icon size={12} />} {label}
    </label>
    <input
      {...props}
      className={`w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all ${props.className || ''}`}
    />
  </div>
);

export default VoucherForm;
