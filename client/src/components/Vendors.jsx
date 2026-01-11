import React, { useState, useEffect } from 'react';
import axios from '../api';
import { Users, Plus, Edit, Trash2, Search, X, Building, Mail, Phone, MapPin } from 'lucide-react';

const Vendors = ({ user, showAlert }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    tax_id: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    status: 'Active'
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await axios.get('/vendors');
      setVendors(res.data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVendor) {
        await axios.put(`/vendors/${editingVendor.id}`, formData);
        showAlert('Vendor updated successfully', 'success');
      } else {
        await axios.post('/vendors', formData);
        showAlert('Vendor created successfully', 'success');
      }
      setShowModal(false);
      setEditingVendor(null);
      setFormData({ name: '', tax_id: '', contact_person: '', email: '', phone: '', address: '', status: 'Active' });
      fetchVendors();
    } catch (err) {
      showAlert(err.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      tax_id: vendor.tax_id || '',
      contact_person: vendor.contact_person || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      status: vendor.status || 'Active'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await axios.delete(`/vendors/${id}`);
      showAlert('Vendor deleted successfully', 'success');
      fetchVendors();
    } catch (err) {
      showAlert('Error deleting vendor', 'error');
    }
  };

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.contact_person && v.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-hidden bg-gray-50/50">
      {/* Header */}
      <div className="p-6 md:p-8 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-blue-600" />
              Vendor Management
            </h1>
            <p className="text-gray-500 mt-1">Manage your suppliers and payees directory</p>
          </div>
          <button 
            onClick={() => {
              setEditingVendor(null);
              setFormData({ name: '', tax_id: '', contact_person: '', email: '', phone: '', address: '', status: 'Active' });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus size={18} /> Add New Vendor
          </button>
        </div>

        {/* Search */}
        <div className="mt-6 flex max-w-md relative">
          <input
            type="text"
            placeholder="Search vendors..."
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
        ) : filteredVendors.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No vendors found</h3>
            <p className="text-gray-500 mt-1">Get started by creating a new vendor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.map(vendor => (
              <div key={vendor.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0">
                      {vendor.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 line-clamp-1">{vendor.name}</h3>
                      <p className="text-xs text-gray-500 font-mono">{vendor.tax_id || 'No Tax ID'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(vendor)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(vendor.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm text-gray-600">
                  {vendor.contact_person && (
                    <div className="flex items-center gap-2.5">
                      <Users size={14} className="text-gray-400 shrink-0" />
                      <span className="truncate">{vendor.contact_person}</span>
                    </div>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-2.5">
                      <Mail size={14} className="text-gray-400 shrink-0" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone size={14} className="text-gray-400 shrink-0" />
                      <span className="truncate">{vendor.phone}</span>
                    </div>
                  )}
                   {vendor.address && (
                    <div className="flex items-start gap-2.5">
                      <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 text-xs">{vendor.address}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                    vendor.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {vendor.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-800">
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Company/Vendor Name *</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      required
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-gray-800"
                      placeholder="e.g. Acme Supplies Inc."
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tax ID (TIN)</label>
                   <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-mono"
                      placeholder="000-000-000"
                      value={formData.tax_id}
                      onChange={e => setFormData({...formData, tax_id: e.target.value})}
                    />
                </div>
                
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                   <select
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact Person</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      placeholder="Name of representative"
                      value={formData.contact_person}
                      onChange={e => setFormData({...formData, contact_person: e.target.value})}
                    />
                  </div>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="email"
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
                  <div className="relative">
                     <Phone className="absolute left-3 top-2.5 text-gray-400" size={16} />
                     <input
                      type="text"
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      placeholder="+63 900 000 0000"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Address</label>
                  <textarea
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none"
                    placeholder="Business Address"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  ></textarea>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5"
                >
                  {editingVendor ? 'Save Changes' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
