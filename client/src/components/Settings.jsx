import React, { useState, useEffect, useRef } from 'react';
import axios from '../api';
import { Trash2, UserPlus, Save, Download, Upload, RefreshCw, AlertTriangle, Printer, Layout, Database, Users, Edit, Building, Check, X, Eye, ChevronDown, Tag } from 'lucide-react';
import { VoucherCopy } from './VoucherTemplate';

const AlertModal = ({ isOpen, onClose, message, type }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className={`${type === 'error' ? 'bg-red-100' : 'bg-green-100'} p-3 rounded-full shadow-sm`}>
            {type === 'error' ? <AlertTriangle className="h-8 w-8 text-red-600" /> : <Check className="h-8 w-8 text-green-600" />}
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{type === 'error' ? 'Error' : 'Success'}</h3>
        </div>
        <p className="text-gray-600 mb-8 text-lg leading-relaxed">{message}</p>
        <div className="flex justify-end">
          <button 
            onClick={onClose}
            className={`px-6 py-2.5 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white focus:outline-none transition-all transform hover:-translate-y-0.5 ${type === 'error' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}`}
          >
            Okay, Got it
          </button>
        </div>
      </div>
    </div>
  );
};

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

const dummyData = {
    voucher_no: '0000001',
    date: new Date().toLocaleDateString(),
    amount: 15000.00,
    payee: 'John Doe Enterprises',
    amount_in_words: 'Fifteen Thousand Pesos Only',
    description: 'Payment for office supplies and equipment maintenance services for the month of January.',
    payment_type: 'Check',
    bank_name: 'BDO',
    check_no: '123456789',
    created_by_user: 'Admin User',
    company_name: 'My Hardware Store'
};

const Settings = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Modals
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'success' });
  const [confirmation, setConfirmation] = useState({ isOpen: false, title: '', message: '', action: null, confirmColor: 'green', confirmText: 'Confirm' });

  const showAlert = (message, type = 'success') => {
    setAlertModal({ isOpen: true, message, type });
  };
  
  // User Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'staff', company_id: '' });

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', company_id: '', role: '' });

  // Company Requests State (Admin)
  const [requests, setRequests] = useState([]);

  // Company Profile State (Staff/Liaison)
  const [companyProfile, setCompanyProfile] = useState({ name: '', address: '', contact: '' });
  const [profileForm, setProfileForm] = useState({ new_name: '', new_address: '', new_contact: '' });

  // Print Settings State
  const [printSettings, setPrintSettings] = useState({
    marginTop: '0',
    marginLeft: '0',
    scale: '100',
    showPreparedBy: true,
    headerTitle: '', // Default to company name if empty
    logoUrl: '',
    addressLine1: '',
    addressLine2: '',
    preparedByLabel: 'Prepared By',
    checkedByLabel: 'Checked By',
    approvedByLabel: 'Approved By',
    checkIssuedByLabel: 'Check Issued By',
    receivedByLabel: 'Received By'
  });

  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('database', file);

    setConfirmation({
        isOpen: true,
        title: 'Import Database',
        message: 'WARNING: This will overwrite the current database. The system will restart. Are you sure?',
        confirmColor: 'red',
        confirmText: 'Import & Restart',
        action: async () => {
            try {
                await axios.post('http://localhost:5000/api/restore', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showAlert('Database restored. Reloading...', 'success');
                setTimeout(() => window.location.reload(), 3000);
            } catch (err) {
                showAlert('Error restoring: ' + (err.response?.data?.error || err.message), 'error');
            }
        }
    });
    e.target.value = '';
  };

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
    fetchCategories();
    
    // Load print settings
    const savedSettings = localStorage.getItem('voucher_print_settings');
    if (savedSettings) {
      setPrintSettings({ ...printSettings, ...JSON.parse(savedSettings) });
    }

    if (user.role === 'admin') {
        fetchRequests();
    } else if (user.company_id) {
        // Fetch current company info
        // We need an endpoint for single company or filter from companies list
        // For now, we can filter from companies list after it loads, but let's do it in fetchCompanies or separate
    }
  }, [user]);

  useEffect(() => {
      if (user.company_id && companies.length > 0) {
          const myCompany = companies.find(c => c.id === user.company_id);
          if (myCompany) {
              setCompanyProfile({
                  name: myCompany.name,
                  address: myCompany.address || '',
                  contact: myCompany.contact || ''
              });
              setProfileForm({
                  new_name: myCompany.name,
                  new_address: myCompany.address || '',
                  new_contact: myCompany.contact || ''
              });
          }
      }
  }, [companies, user.company_id]);

  const savePrintSettings = () => {
    localStorage.setItem('voucher_print_settings', JSON.stringify(printSettings));
    showAlert('Print settings saved!', 'success');
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/companies');
      setCompanies(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
      try {
          // Fetch all categories visible to user
          const res = await axios.get('http://localhost:5000/api/categories');
          setCategories(res.data);
      } catch (err) {
          console.error(err);
      }
  };

  const fetchRequests = async () => {
      try {
          const res = await axios.get('http://localhost:5000/api/company/requests');
          setRequests(res.data);
      } catch (err) {
          console.error(err);
      }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    
    // Prepare payload: Ensure company_id is null if not staff or empty
    const payload = { ...userForm };
    if (payload.role !== 'staff' || payload.company_id === '') {
        payload.company_id = null;
    }

    try {
      if (editingUser) {
          await axios.put(`http://localhost:5000/api/users/${editingUser.id}`, payload);
          showAlert('User updated successfully', 'success');
      } else {
          await axios.post('http://localhost:5000/api/users', payload);
          showAlert('User created successfully', 'success');
      }
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ username: '', password: '', role: 'staff', company_id: '' });
      fetchUsers();
    } catch (err) {
      console.error(err);
      showAlert('Error saving user: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleEditUser = (u) => {
      setEditingUser(u);
      setUserForm({ 
          username: u.username, 
          password: '', // Don't show password
          role: u.role, 
          company_id: u.company_id || '' 
      });
      setShowUserModal(true);
  };

  const handleDeleteUser = async (id) => {
    setConfirmation({
        isOpen: true,
        title: 'Delete User',
        message: 'Are you sure you want to delete this user?',
        confirmColor: 'red',
        confirmText: 'Delete',
        action: async () => {
            try {
                await axios.delete(`http://localhost:5000/api/users/${id}`);
                fetchUsers();
            } catch (err) {
                showAlert('Error deleting user', 'error');
            }
        }
    });
  };

  const handleCategorySubmit = async (e) => {
      e.preventDefault();
      try {
          await axios.post('http://localhost:5000/api/categories', categoryForm);
          showAlert('Category added successfully', 'success');
          setShowCategoryModal(false);
          setCategoryForm({ name: '', company_id: '', role: '' });
          fetchCategories();
      } catch (err) {
          showAlert('Error adding category: ' + (err.response?.data?.error || err.message), 'error');
      }
  };

  const handleDeleteCategory = async (id) => {
      setConfirmation({
          isOpen: true,
          title: 'Delete Category',
          message: 'Are you sure you want to delete this category?',
          confirmColor: 'red',
          confirmText: 'Delete',
          action: async () => {
              try {
                  await axios.delete(`http://localhost:5000/api/categories/${id}`);
                  fetchCategories();
              } catch (err) {
                  showAlert('Error deleting category', 'error');
              }
          }
      });
  };

  const handleRequestSubmit = async (e) => {
      e.preventDefault();
      try {
          await axios.post('http://localhost:5000/api/company/request', {
              company_id: user.company_id,
              requested_by: user.id,
              ...profileForm
          });
          showAlert('Update request submitted for approval', 'success');
      } catch (err) {
          showAlert('Error submitting request', 'error');
      }
  };

  const handleRequestAction = async (id, action) => {
      try {
          await axios.post(`http://localhost:5000/api/company/requests/${id}/${action}`);
          fetchRequests();
          fetchCompanies(); // Refresh company data if approved
      } catch (err) {
          showAlert('Error processing request', 'error');
      }
  };

  const handleBackup = () => {
    window.open('http://localhost:5000/api/backup', '_blank');
  };

  const handleReset = async () => {
    setConfirmation({
        isOpen: true,
        title: 'System Reset',
        message: 'WARNING: This will delete all voucher data. Are you sure?',
        confirmColor: 'red',
        confirmText: 'Reset System',
        action: async () => {
            try {
                await axios.post('http://localhost:5000/api/reset');
                showAlert('System reset successfully', 'success');
            } catch (err) {
                showAlert('Error resetting system', 'error');
            }
        }
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                <Users size={20} /> User Management
                </h2>
                <button 
                    onClick={() => {
                        setEditingUser(null);
                        setUserForm({ username: '', password: '', role: 'staff', company_id: '' });
                        setShowUserModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                >
                    <UserPlus size={16} /> Add User
                </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{u.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap capitalize">{u.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{u.company_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right flex justify-end gap-2">
                        <button onClick={() => handleEditUser(u)} className="text-blue-600 hover:text-blue-900">
                            <Edit size={16} />
                        </button>
                        {u.username !== 'admin' && (
                          <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-900">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'company':
          return (
              <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Building size={20} /> {user.role === 'admin' ? 'Company Requests' : 'Company Profile'}
                  </h2>
                  
                  {user.role === 'admin' ? (
                      <div>
                          {requests.length === 0 ? (
                              <p className="text-gray-500">No pending requests.</p>
                          ) : (
                              <div className="space-y-4">
                                  {requests.map(req => (
                                      <div key={req.id} className="border p-4 rounded bg-gray-50">
                                          <div className="flex justify-between items-start">
                                              <div>
                                                  <h3 className="font-bold text-lg">{req.current_name}</h3>
                                                  <p className="text-sm text-gray-600">Requested by: {req.requester}</p>
                                              </div>
                                              <div className="flex gap-2">
                                                  <button onClick={() => handleRequestAction(req.id, 'approve')} className="bg-green-600 text-white p-2 rounded hover:bg-green-700"><Check size={16} /></button>
                                                  <button onClick={() => handleRequestAction(req.id, 'reject')} className="bg-red-600 text-white p-2 rounded hover:bg-red-700"><X size={16} /></button>
                                              </div>
                                          </div>
                                          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                              <div>
                                                  <span className="block font-bold text-gray-500">New Name</span>
                                                  <div>{req.new_name || '-'}</div>
                                              </div>
                                              <div>
                                                  <span className="block font-bold text-gray-500">New Address</span>
                                                  <div>{req.new_address || '-'}</div>
                                              </div>
                                              <div>
                                                  <span className="block font-bold text-gray-500">New Contact</span>
                                                  <div>{req.new_contact || '-'}</div>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  ) : (
                      <form onSubmit={handleRequestSubmit} className="max-w-lg">
                          <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700">Company Name</label>
                              <input 
                                  type="text" 
                                  value={profileForm.new_name} 
                                  onChange={e => setProfileForm({...profileForm, new_name: e.target.value})}
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                              />
                          </div>
                          <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700">Address</label>
                              <textarea 
                                  value={profileForm.new_address} 
                                  onChange={e => setProfileForm({...profileForm, new_address: e.target.value})}
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                  rows="3"
                              />
                          </div>
                          <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700">Contact Info</label>
                              <input 
                                  type="text" 
                                  value={profileForm.new_contact} 
                                  onChange={e => setProfileForm({...profileForm, new_contact: e.target.value})}
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                              />
                          </div>
                          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                              Request Update
                          </button>
                          <p className="mt-2 text-xs text-gray-500">Changes require admin approval.</p>
                      </form>
                  )}
              </div>
          );
      case 'categories':
          return (
              <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                          <Tag size={20} /> Category Management
                      </h2>
                      <button 
                          onClick={() => {
                              setCategoryForm({ name: '', company_id: '', role: '' });
                              setShowCategoryModal(true);
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                      >
                          <UserPlus size={16} /> Add Category
                      </button>
                  </div>

                  <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                              <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category Name</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                              {categories.map(cat => (
                                  <tr key={cat.id}>
                                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{cat.name}</td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          {cat.role ? (
                                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                  cat.role === 'hr' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                                              }`}>
                                                  {cat.role.toUpperCase()} Only
                                              </span>
                                          ) : (
                                              <span className="text-gray-600 flex items-center gap-1">
                                                  <Building size={14} /> {cat.company_name || 'Unknown Company'}
                                              </span>
                                          )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right">
                                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600 hover:text-red-900">
                                              <Trash2 size={16} />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                              {categories.length === 0 && (
                                  <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500 italic">No categories found</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          );
      case 'database':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Database size={20} /> Database Management
            </h2>
            <div className="flex gap-4">
              <button onClick={handleBackup} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                <Download size={16} /> Backup Database
              </button>
              <button onClick={handleImportClick} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                <Upload size={16} /> Import Database
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".db,.sqlite,.sqlite3"
              />
              <button onClick={handleReset} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                <AlertTriangle size={16} /> Reset Data
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Backup downloads the current database. Import restores a previous backup (overwrites all data). Reset clears all voucher data.
            </p>
          </div>
        );
      case 'print':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Printer size={20} /> Print Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-700 border-b pb-2">Layout & Margins</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Top Margin (mm)</label>
                        <input 
                        type="number" 
                        value={printSettings.marginTop} 
                        onChange={(e) => setPrintSettings({...printSettings, marginTop: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Left Margin (mm)</label>
                        <input 
                        type="number" 
                        value={printSettings.marginLeft} 
                        onChange={(e) => setPrintSettings({...printSettings, marginLeft: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Scale (%)</label>
                        <input 
                        type="number" 
                        value={printSettings.scale} 
                        onChange={(e) => setPrintSettings({...printSettings, scale: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-gray-700 border-b pb-2">Header & Labels</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Header Title (Optional)</label>
                        <input 
                        type="text" 
                        placeholder="Leave empty to use Company Name"
                        value={printSettings.headerTitle} 
                        onChange={(e) => setPrintSettings({...printSettings, headerTitle: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Logo URL (Optional)</label>
                        <input 
                        type="text" 
                        placeholder="https://example.com/logo.png"
                        value={printSettings.logoUrl} 
                        onChange={(e) => setPrintSettings({...printSettings, logoUrl: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Address Line 1</label>
                        <input 
                        type="text" 
                        value={printSettings.addressLine1} 
                        onChange={(e) => setPrintSettings({...printSettings, addressLine1: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Company Details</label>
                        <input 
                        type="text" 
                        value={printSettings.addressLine2} 
                        onChange={(e) => setPrintSettings({...printSettings, addressLine2: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                    </div>
                </div>

                <div className="space-y-4 md:col-span-2">
                    <h3 className="font-bold text-gray-700 border-b pb-2">Signature Labels</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Prepared By</label>
                            <input 
                            type="text" 
                            value={printSettings.preparedByLabel} 
                            onChange={(e) => setPrintSettings({...printSettings, preparedByLabel: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Checked By</label>
                            <input 
                            type="text" 
                            value={printSettings.checkedByLabel} 
                            onChange={(e) => setPrintSettings({...printSettings, checkedByLabel: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Check Issued By</label>
                            <input 
                            type="text" 
                            value={printSettings.checkIssuedByLabel} 
                            onChange={(e) => setPrintSettings({...printSettings, checkIssuedByLabel: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Approved By</label>
                            <input 
                            type="text" 
                            value={printSettings.approvedByLabel} 
                            onChange={(e) => setPrintSettings({...printSettings, approvedByLabel: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Received By</label>
                            <input 
                            type="text" 
                            value={printSettings.receivedByLabel} 
                            onChange={(e) => setPrintSettings({...printSettings, receivedByLabel: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                    </div>
                    <div className="flex items-center mt-4">
                        <input 
                        type="checkbox" 
                        id="showPreparedBy"
                        checked={printSettings.showPreparedBy} 
                        onChange={(e) => setPrintSettings({...printSettings, showPreparedBy: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="showPreparedBy" className="ml-2 block text-sm text-gray-900">
                        Show "Prepared By" Name (User who created voucher)
                        </label>
                    </div>
                </div>
            </div>

            {/* Preview Section */}
            <div className="mt-8 border-t pt-6">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Eye size={20} /> Live Preview
                </h3>
                <div className="border bg-gray-200 p-4 overflow-auto">
                    <div className="transform scale-75 origin-top-left bg-white shadow-lg mx-auto relative" style={{ width: '216mm', height: '330mm' }}>
                         {/* Top Half */}
                         <div className="absolute top-0 left-0 w-full h-1/2 pt-4">
                            <VoucherCopy data={dummyData} title="PAYEE'S COPY" settings={printSettings} />
                         </div>
                         {/* Cut Line */}
                         <div className="absolute top-1/2 left-0 w-full border-t-2 border-dashed border-gray-300 -mt-[1px] z-10">
                            <span className="absolute left-1/2 -top-3 bg-white px-2 text-gray-400 text-xs -translate-x-1/2">CUT HERE</span>
                         </div>
                         {/* Bottom Half */}
                         <div className="absolute top-1/2 left-0 w-full h-1/2 pt-4">
                            <VoucherCopy data={dummyData} title="FILE COPY" settings={printSettings} />
                         </div>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <button onClick={savePrintSettings} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2">
                    <Save size={16} /> Save Settings
                </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md min-h-screen flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${activeTab === 'users' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Users size={20} /> Users
          </button>
          <button 
            onClick={() => setActiveTab('company')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${activeTab === 'company' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Building size={20} /> {user.role === 'admin' ? 'Requests' : 'Company Profile'}
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${activeTab === 'categories' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Tag size={20} /> Categories
          </button>
          <button 
            onClick={() => setActiveTab('database')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${activeTab === 'database' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Database size={20} /> Database
          </button>
          <button 
            onClick={() => setActiveTab('print')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${activeTab === 'print' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Printer size={20} /> Print Template
          </button>
        </nav>
        <div className="p-4 border-t">
          <button onClick={onBack} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        {renderContent()}
      </div>

      {/* User Modal */}
      {showUserModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-lg shadow-blue-200"><UserPlus size={18} /></div>
                          {editingUser ? 'Edit User' : 'Create User'}
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
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Password {editingUser && '(Leave blank to keep)'}</label>
                          <input 
                              type="password" 
                              required={!editingUser}
                              className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all"
                              value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})}
                          />
                      </div>
                      
                      <div className="group">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Users size={12} /> Role
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
                          <button type="button" onClick={() => setShowUserModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                          <button type="submit" className="px-5 py-2.5 border border-transparent rounded-xl shadow-lg shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:-translate-y-0.5">Save</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all scale-100 border border-gray-100">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-lg shadow-blue-200"><Tag size={18} /></div>
                          Add Category
                      </h3>
                      <button onClick={() => setShowCategoryModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                      <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category Name</label>
                          <input 
                              type="text" required
                              className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all"
                              value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})}
                              placeholder="e.g. Office Supplies"
                          />
                      </div>
                      
                      {user.role === 'admin' && (
                          <div className="group">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <Users size={12} /> Assign To
                              </label>
                              <div className="relative">
                                <select 
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 appearance-none transition-colors hover:bg-gray-100 cursor-pointer"
                                    value={categoryForm.role || (categoryForm.company_id ? 'company' : '')} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === 'hr' || val === 'liaison') {
                                            setCategoryForm({...categoryForm, role: val, company_id: ''});
                                        } else if (val === 'company') {
                                            setCategoryForm({...categoryForm, role: '', company_id: companies.length > 0 ? companies[0].id : ''});
                                        } else {
                                            setCategoryForm({...categoryForm, role: '', company_id: ''});
                                        }
                                    }}
                                >
                                    <option value="">Select Assignment</option>
                                    <option value="company">Specific Company</option>
                                    <option value="hr">HR Only</option>
                                    <option value="liaison">Liaison Only</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 group-hover:text-blue-600 transition-colors">
                                    <ChevronDown size={16} strokeWidth={2.5} />
                                </div>
                              </div>
                          </div>
                      )}

                      {/* Show Company Select if Admin selected 'company' OR if user is HR/Liaison and wants to assign to company (optional) */}
                      {/* But prompt says HR/Liaison create for themselves (no company). So hide company select for them unless we want to allow it. */}
                      {/* Let's stick to prompt: HR/Liaison create for themselves. Admin can do both. */}
                      
                      {(user.role === 'admin' && !categoryForm.role && categoryForm.company_id !== undefined) && (
                          <div className="group">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <Building size={12} /> Company
                              </label>
                              <div className="relative">
                                <select 
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 appearance-none transition-colors hover:bg-gray-100 cursor-pointer" required
                                    value={categoryForm.company_id} onChange={e => setCategoryForm({...categoryForm, company_id: e.target.value})}
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

                      {/* For HR/Liaison, show a note that it's for their role */}
                      {(user.role === 'hr' || user.role === 'liaison') && (
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-700">
                              This category will be available only for <strong>{user.role.toUpperCase()}</strong> role.
                          </div>
                      )}
                      
                      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                          <button type="button" onClick={() => setShowCategoryModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                          <button type="submit" className="px-5 py-2.5 border border-transparent rounded-xl shadow-lg shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:-translate-y-0.5">Save</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <AlertModal 
        isOpen={alertModal.isOpen} 
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        message={alertModal.message}
        type={alertModal.type}
      />

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

export default Settings;
