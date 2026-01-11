import React, { useState, useEffect } from 'react';
import axios from '../api';
import { PiggyBank, Plus, Edit, Trash2, Search, X, Calendar, AlertCircle } from 'lucide-react';

const Budgets = ({ user, showAlert }) => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    amount: '',
    start_date: '',
    end_date: '',
    status: 'Active'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [budgetsRes, categoriesRes] = await Promise.all([
        axios.get('/budgets'),
        axios.get(`/categories?company_id=${user.company_id || ''}`)
      ]);
      setBudgets(budgetsRes.data || []);
      setCategories(categoriesRes.data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchBudgets = async () => {
    try {
      const res = await axios.get('/budgets');
      setBudgets(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBudget) {
        await axios.put(`/budgets/${editingBudget.id}`, formData);
        showAlert('Budget updated successfully', 'success');
      } else {
        await axios.post('/budgets', { ...formData, company_id: user.company_id });
        showAlert('Budget created successfully', 'success');
      }
      setShowModal(false);
      setEditingBudget(null);
      setFormData({ name: '', category: '', amount: '', start_date: '', end_date: '', status: 'Active' });
      fetchBudgets();
    } catch (err) {
      showAlert(err.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setFormData({
      name: budget.name,
      category: budget.category,
      amount: budget.amount,
      start_date: budget.start_date || '',
      end_date: budget.end_date || '',
      status: budget.status || 'Active'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;
    try {
      await axios.delete(`/budgets/${id}`);
      showAlert('Budget deleted successfully', 'success');
      fetchBudgets();
    } catch (err) {
      showAlert('Error deleting budget', 'error');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const calculateProgress = (spent, total) => {
    if (!total) return 0;
    const progress = (spent / total) * 100;
    return Math.min(progress, 100);
  };

  const filteredBudgets = budgets.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-hidden bg-gray-50/50">
      {/* Header */}
      <div className="p-6 md:p-8 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <PiggyBank className="text-blue-600" />
              Budgeting System
            </h1>
            <p className="text-gray-500 mt-1">Track expenses against allocated budgets</p>
          </div>
          <button 
            onClick={() => {
              setEditingBudget(null);
              setFormData({ name: '', category: '', amount: '', start_date: '', end_date: '', status: 'Active' });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus size={18} /> New Budget
          </button>
        </div>

        {/* Search */}
        <div className="mt-6 flex max-w-md relative">
          <input
            type="text"
            placeholder="Search budgets..."
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
        ) : filteredBudgets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <PiggyBank className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No budgets set</h3>
            <p className="text-gray-500 mt-1">Create a budget to start tracking expenses.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBudgets.map(budget => {
                const spent = budget.spent || 0;
                const progress = calculateProgress(spent, budget.amount);
                const isOverBudget = spent > budget.amount;
                
                return (
              <div key={budget.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{budget.name}</h3>
                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs uppercase font-semibold tracking-wide">{budget.category}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(budget)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(budget.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm font-medium mb-1.5">
                            <span className="text-gray-500">Spent: <span className={isOverBudget ? "text-red-600" : "text-gray-900"}>{formatCurrency(spent)}</span></span>
                            <span className="text-gray-500">Limit: <span className="text-gray-900">{formatCurrency(budget.amount)}</span></span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                    isOverBudget ? 'bg-red-500' : progress > 80 ? 'bg-yellow-500' : 'bg-green-500'
                                }`} 
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            ></div>
                        </div>
                        <div className="mt-1 text-xs text-right text-gray-400">
                            {progress.toFixed(1)}% Used
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-50 pt-3">
                        {budget.start_date && (
                             <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>{budget.start_date} to {budget.end_date || 'Inifinite'}</span>
                            </div>
                        )}
                         <div className={`ml-auto px-2 py-1 rounded text-xs font-bold ${
                             budget.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                         }`}>
                             {budget.status}
                         </div>
                    </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-800">
                {editingBudget ? 'Edit Budget' : 'Create New Budget'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Budget Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-gray-800"
                    placeholder="e.g. Q4 Marketing Budget"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
              </div>

               <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category *</label>
                   <select
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                </div>

                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Budget Amount *</label>
                   <div className="relative">
                        <span className="absolute left-4 top-2 text-gray-500">₱</span>
                        <input
                            type="number"
                            required
                            step="0.01"
                            className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={e => setFormData({...formData, amount: e.target.value})}
                        />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Start Date</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                            value={formData.start_date}
                            onChange={e => setFormData({...formData, start_date: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">End Date</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                            value={formData.end_date}
                            onChange={e => setFormData({...formData, end_date: e.target.value})}
                        />
                    </div>
                </div>
                
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                   <select
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="Active">Active</option>
                      <option value="Closed">Closed</option>
                    </select>
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
                  {editingBudget ? 'Save Changes' : 'Create Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;

