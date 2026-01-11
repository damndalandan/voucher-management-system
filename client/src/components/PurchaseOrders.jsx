import React, { useState, useEffect } from 'react';
import axios from '../api';
import { ShoppingCart, Plus, Edit, Trash2, Search, X, CheckCircle, FileText, ArrowRight } from 'lucide-react';

const PurchaseOrders = ({ user, showAlert }) => {
  const [pos, setPos] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewingPO, setViewingPO] = useState(null);
  
  const [formData, setFormData] = useState({
    vendor_id: '',
    date: new Date().toISOString().split('T')[0],
    expected_date: '',
    notes: '',
    items: [{ description: '', quantity: 1, unit_price: 0 }]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [posRes, vendorsRes] = await Promise.all([
        axios.get('/purchase-orders'),
        axios.get('/vendors')
      ]);
      setPos(posRes.data || []);
      setVendors(vendorsRes.data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchPOs = async () => {
    try {
      const res = await axios.get('/purchase-orders');
      setPos(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit_price: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/purchase-orders', formData);
      showAlert('Purchase Order created successfully', 'success');
      setShowModal(false);
      setFormData({
        vendor_id: '',
        date: new Date().toISOString().split('T')[0],
        expected_date: '',
        notes: '',
        items: [{ description: '', quantity: 1, unit_price: 0 }]
      });
      fetchPOs();
    } catch (err) {
      showAlert(err.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await axios.put(`/purchase-orders/${id}/status`, { status });
      showAlert(`PO Status updated to ${status}`, 'success');
      fetchPOs();
      if (viewingPO) setViewingPO({...viewingPO, status});
    } catch (err) {
      showAlert('Failed to update status', 'error');
    }
  };

  const handleGenerateVoucher = async (id) => {
    if (!window.confirm("Generate a payment voucher for this PO?")) return;
    try {
      await axios.post(`/purchase-orders/${id}/generate-voucher`);
      showAlert('Voucher generated successfully', 'success');
    } catch (err) {
      showAlert(err.response?.data?.error || 'Failed to generate voucher', 'error');
    }
  };

  const onViewPO = async (po) => {
    try {
        const res = await axios.get(`/purchase-orders/${po.id}`);
        setViewingPO(res.data);
    } catch (err) {
        console.error(err);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const filteredPOs = pos.filter(po => 
    po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (po.vendor_name && po.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-hidden bg-gray-50/50">
      {/* Header */}
      <div className="p-6 md:p-8 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ShoppingCart className="text-blue-600" />
              Purchase Orders
            </h1>
            <p className="text-gray-500 mt-1">Manage vendor orders and procurement</p>
          </div>
          <button 
            onClick={() => {
              setFormData({
                vendor_id: '',
                date: new Date().toISOString().split('T')[0],
                expected_date: '',
                notes: '',
                items: [{ description: '', quantity: 1, unit_price: 0 }]
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus size={18} /> New Order
          </button>
        </div>

        {/* Search */}
        <div className="mt-6 flex max-w-md relative">
          <input
            type="text"
            placeholder="Search PO number, vendor..."
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
        ) : filteredPOs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No purchase orders found</h3>
            <p className="text-gray-500 mt-1">Create a new purchase order to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPOs.map(po => (
              <div key={po.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">{po.po_number}</h3>
                        <div className="text-sm text-gray-500">{po.vendor_name}</div>
                        <div className="text-xs text-gray-400 mt-1">{po.date}</div>
                    </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                        <div className="font-bold text-gray-800">{formatCurrency(po.total_amount)}</div>
                        <div className={`text-xs font-bold px-2 py-0.5 rounded inline-block mt-1 ${
                            po.status === 'Draft' ? 'bg-gray-100 text-gray-600' :
                            po.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                            po.status === 'Received' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                            {po.status}
                        </div>
                    </div>
                    
                    <button 
                         onClick={() => onViewPO(po)}
                         className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <ArrowRight size={20} />
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

       {/* View Modal */}
       {viewingPO && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{viewingPO.po_number}</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    viewingPO.status === 'Draft' ? 'bg-gray-100 text-gray-600' :
                    viewingPO.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                    viewingPO.status === 'Received' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>{viewingPO.status}</span>
              </div>
              <button onClick={() => setViewingPO(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Vendor</h4>
                        <p className="font-bold text-lg text-gray-800">{viewingPO.vendor_name}</p>
                        <p className="text-gray-600 text-sm whitespace-pre-line">{viewingPO.vendor_address}</p>
                        <p className="text-gray-600 text-sm mt-1">{viewingPO.vendor_email} • {viewingPO.vendor_phone}</p>
                    </div>
                    <div className="text-right">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Details</h4>
                        <p className="text-sm text-gray-600"><strong>Date:</strong> {viewingPO.date}</p>
                        <p className="text-sm text-gray-600"><strong>Expected:</strong> {viewingPO.expected_date || 'N/A'}</p>
                         {viewingPO.notes && <p className="text-sm text-gray-500 mt-2 italic">"{viewingPO.notes}"</p>}
                    </div>
                </div>

                <table className="w-full text-left text-sm mb-8">
                    <thead className="bg-gray-50 border-y border-gray-100 text-gray-500">
                        <tr>
                            <th className="py-3 px-4 font-semibold">Description</th>
                            <th className="py-3 px-4 font-semibold text-right">Qty</th>
                            <th className="py-3 px-4 font-semibold text-right">Unit Price</th>
                            <th className="py-3 px-4 font-semibold text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {viewingPO.items && viewingPO.items.map((item, i) => (
                            <tr key={i}>
                                <td className="py-3 px-4 font-medium text-gray-800">{item.description}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{item.quantity}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                                <td className="py-3 px-4 text-right font-bold text-gray-800">{formatCurrency(item.total_price)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t border-gray-200">
                         <tr>
                            <td colSpan="3" className="py-4 px-4 text-right font-bold text-gray-600">Total Amount</td>
                            <td className="py-4 px-4 text-right font-bold text-xl text-blue-600">{formatCurrency(viewingPO.total_amount)}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                     {viewingPO.status === 'Draft' && (
                        <button 
                            onClick={() => handleStatusUpdate(viewingPO.id, 'Approved')}
                            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                        >
                            Approve Order
                        </button>
                    )}
                    {viewingPO.status === 'Approved' && (
                        <>
                             <button 
                                onClick={() => handleGenerateVoucher(viewingPO.id)}
                                className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                                <CheckCircle size={18} /> Generate Voucher
                            </button>
                            <button 
                                onClick={() => handleStatusUpdate(viewingPO.id, 'Received')}
                                className="bg-gray-800 text-white px-6 py-2 rounded-xl font-bold hover:bg-gray-900 transition-colors"
                            >
                                Mark Received
                            </button>
                        </>
                    )}
                </div>
            </div>
          </div>
        </div>
       )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-800">New Purchase Order</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Vendor *</label>
                         <select
                            required
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                            value={formData.vendor_id}
                            onChange={e => setFormData({...formData, vendor_id: e.target.value})}
                         >
                            <option value="">Select Vendor</option>
                            {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                         </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Order Date</label>
                            <input
                                type="date"
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Expected</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                value={formData.expected_date}
                                onChange={e => setFormData({...formData, expected_date: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">items</label>
                         <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                            {formData.items.map((item, index) => (
                                <div key={index} className="flex gap-3 items-start">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Item Description"
                                            required
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                            value={item.description}
                                            onChange={e => handleItemChange(index, 'description', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-20">
                                        <input
                                            type="number"
                                            placeholder="Qty"
                                            required
                                            min="1"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                            value={item.quantity}
                                            onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-28 relative">
                                        <input
                                            type="number"
                                            placeholder="Price"
                                            required
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                            value={item.unit_price}
                                            onChange={e => handleItemChange(index, 'unit_price', e.target.value)}
                                        />
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            <button 
                                type="button" 
                                onClick={handleAddItem}
                                className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1"
                            >
                                <Plus size={14} /> Add Item
                            </button>
                         </div>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
                        <textarea
                            rows="2"
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none"
                            placeholder="Delivery instructions, etc."
                            value={formData.notes}
                            onChange={e => setFormData({...formData, notes: e.target.value})}
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
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
