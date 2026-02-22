import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Product, User, UserRole } from '../types';
import {
  Trash2, Edit2, Plus, Package, Users, Settings,
  Upload, Search, Database, RefreshCcw, ShieldCheck,
  Terminal, Cloud, Code, Copy, AlertTriangle, X
} from 'lucide-react';

const Admin = () => {
  const {
    products, addProduct, updateProduct, deleteProduct,
    users, addUser, deleteUser, user: currentUser,
    companyLogo, setCompanyLogo, isSyncing, databaseError, refreshDatabase,
    currentView
  } = useApp();

  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'USERS'>(currentView === 'USERS' ? 'USERS' : 'PRODUCTS');

  useEffect(() => {
    if (currentView === 'USERS') setActiveTab('USERS');
    if (currentView === 'PRODUCTS') setActiveTab('PRODUCTS');
  }, [currentView]);
  const [syncLog, setSyncLog] = useState<{ msg: string, time: string }[]>([]);
  const [showSqlGuide, setShowSqlGuide] = useState(databaseError);

  // Product Form State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pUnit, setPUnit] = useState('sqm');
  const [pCategory, setPCategory] = useState('Clear Glass');

  // User Form State
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uRole, setURole] = useState<UserRole>(UserRole.USER);

  useEffect(() => {
    if (isSyncing) {
      setSyncLog(prev => [{
        msg: `Synchronizing with remote cloud...`,
        time: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 5));
    }
  }, [isSyncing]);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    const list = Array.from(cats);
    if (!list.includes('Clear Glass')) list.push('Clear Glass');
    if (!list.includes('Toughened')) list.push('Toughened');
    if (!list.includes('Mirrors')) list.push('Mirrors');
    return ['All', ...list.sort()];
  }, [products]);

  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const nameMatch = String(p.name).toLowerCase().includes(productSearch.toLowerCase());
      const idMatch = String(p.id).toLowerCase().includes(productSearch.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      return (nameMatch || idMatch) && matchesCategory;
    });
  }, [products, productSearch, categoryFilter]);

  if (currentUser?.role !== UserRole.ADMIN) {
    return <div className="p-20 text-center text-slate-500 font-black uppercase tracking-widest">Access Restricted to Administrators</div>;
  }

  // --- Product Handlers ---
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pPrice) return;

    const productData: Product = {
      id: editingProduct ? editingProduct.id : `P-${Date.now().toString().slice(-4)}`,
      name: pName,
      price: parseFloat(pPrice),
      unit: pUnit,
      description: `Commercial Grade ${pCategory}`,
      category: pCategory
    };

    try {
      if (editingProduct) {
        await updateProduct(productData);
      } else {
        await addProduct(productData);
      }
      setEditingProduct(null);
      setPName(''); setPPrice(''); setPCategory('Clear Glass'); setPUnit('sqm');
    } catch (err) {
      alert("Error updating remote product catalog.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Permanently remove this item from the catalog?")) {
      try {
        await deleteProduct(id);
      } catch (err) {
        alert("Deletion failed.");
      }
    }
  };

  // --- User Handlers ---
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uName || !uEmail) return;

    const newUser: User = {
      id: `u-${Date.now()}`,
      name: uName,
      email: uEmail,
      role: uRole,
      avatar: `https://i.pravatar.cc/150?u=${uEmail}`
    };

    try {
      await addUser(newUser);
      setUName(''); setUEmail(''); setURole(UserRole.USER);
    } catch (err) {
      alert("Failed to add user to database.");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm("Revoke access for this user?")) {
      try {
        await deleteUser(id);
      } catch (err) {
        alert("Failed to delete user.");
      }
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const sqlSetupCode = `-- 1. CREATE TABLES (ONLY IF THEY DON'T EXIST)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  unit TEXT DEFAULT 'sqm',
  category TEXT DEFAULT 'General'
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  items JSONB NOT NULL,
  subtotal NUMERIC NOT NULL,
  tax_rate NUMERIC NOT NULL,
  tax_amount NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC NOT NULL,
  status TEXT NOT NULL,
  date_issued TEXT NOT NULL,
  due_date TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  last_reminder_sent TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  avatar TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 2. UPDATE EXISTING SCHEMA (ADD MISSING COLUMNS)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_reminder_sent TEXT;

-- 3. SEED INITIAL ADMIN
INSERT INTO users (id, name, email, role, avatar)
VALUES ('u1', 'Admin User', 'admin@clonmel.com', 'ADMIN', 'https://i.pravatar.cc/150?u=admin')
ON CONFLICT (email) DO NOTHING;

-- 4. PERMISSIONS (DISABLE RLS FOR DEVELOPMENT/TESTING)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;`;

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">System Engine</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">Node Instance: azyeptjbktvkqiigotbi</p>
        </div>
        <div className={`flex items-center space-x-4 text-[10px] font-black border-2 px-6 py-2.5 rounded-2xl shadow-sm ${databaseError ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-brand-50 border-brand-100 text-brand-600'}`}>
          <Cloud size={14} className={databaseError ? 'text-rose-400' : 'text-brand-500'} />
          <span className="uppercase tracking-[0.2em]">Remote Status: {databaseError ? 'SCHEMA ERROR' : 'LIVE & SECURE'}</span>
        </div>
      </div>

      <div className="flex space-x-10 border-b-2 border-slate-100">
        <button onClick={() => setActiveTab('PRODUCTS')} className={`pb-5 px-1 text-[10px] font-black uppercase tracking-[0.2em] border-b-4 transition-all ${activeTab === 'PRODUCTS' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-900'}`}>Catalog Manager</button>
        <button onClick={() => setActiveTab('USERS')} className={`pb-5 px-1 text-[10px] font-black uppercase tracking-[0.2em] border-b-4 transition-all ${activeTab === 'USERS' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-900'}`}>Permissions</button>
      </div>

      {activeTab === 'PRODUCTS' && (
        <div className="space-y-10">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-2xl animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between mb-8 border-b-2 border-slate-50 pb-6">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${editingProduct ? 'bg-amber-500 shadow-amber-500/20' : 'bg-brand-600 shadow-brand-500/20'}`}>
                  {editingProduct ? <Edit2 size={24} /> : <Plus size={24} />}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase tracking-widest leading-none">
                    {editingProduct ? 'Edit Catalog Entry' : 'Add New Glass Piece'}
                  </h3>
                </div>
              </div>
              {editingProduct && (
                <button onClick={() => { setEditingProduct(null); setPName(''); setPPrice(''); }} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                  <X size={20} />
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="md:col-span-1 space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Display Name</label>
                <input type="text" placeholder="e.g. 10MM TOUGH SATIN" required value={pName} onChange={e => setPName(e.target.value)} className="w-full bg-white text-slate-900 border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-black focus:border-brand-500 outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Unit Price (€)</label>
                <input type="number" step="0.01" required placeholder="0.00" value={pPrice} onChange={e => setPPrice(e.target.value)} className="w-full bg-white text-slate-900 border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-black focus:border-brand-500 outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Classification</label>
                <select value={pCategory} onChange={e => setPCategory(e.target.value)} className="w-full bg-white text-slate-900 border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none appearance-none cursor-pointer">
                  {categories.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={isSyncing} className={`flex-1 flex items-center justify-center gap-3 font-black py-4 rounded-2xl transition-all disabled:opacity-50 shadow-2xl uppercase text-[10px] tracking-[0.2em] ${editingProduct ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20' : 'bg-slate-900 hover:bg-brand-600 text-white shadow-slate-900/20'}`}>
                  {isSyncing ? <RefreshCcw className="animate-spin" size={16} /> : editingProduct ? <Edit2 size={16} /> : <Plus size={16} />}
                  {editingProduct ? 'Apply Edit' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 flex gap-5 shadow-sm">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search glass catalog..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-200 text-slate-900 rounded-2xl text-sm font-bold focus:border-brand-500 outline-none transition-all" />
              </div>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-white text-slate-900 border-2 border-slate-200 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-brand-500">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-xl">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b-2 border-slate-100">
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <th className="text-left px-8 py-6">Product Line</th>
                    <th className="text-left px-8 py-6">Pricing Index</th>
                    <th className="text-right px-8 py-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-900 group-hover:text-brand-600 transition-colors">{String(p.name)}</div>
                        <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{String(p.category)}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-black text-slate-800">€{Number(p.price).toFixed(2)}</span>
                        <span className="text-[10px] font-bold text-slate-400 ml-1.5 uppercase">/ {String(p.unit)}</span>
                      </td>
                      <td className="px-8 py-6 text-right flex items-center justify-end gap-3">
                        <button onClick={() => {
                          setEditingProduct(p);
                          setPName(p.name);
                          setPPrice(p.price.toString());
                          setPUnit(p.unit);
                          setPCategory(p.category);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} className="p-3 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all"><Edit2 size={18} /></button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



      {activeTab === 'USERS' && (
        <div className="space-y-10">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-2xl animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4 mb-8 border-b-2 border-slate-50 pb-6">
              <div className="h-12 w-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                <Users size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-widest leading-none">
                  Add New Team Member
                </h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">
                  Grant access to the Invoice Hub
                </p>
              </div>
            </div>

            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="md:col-span-1 space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  required
                  value={uName}
                  onChange={e => setUName(e.target.value)}
                  className="w-full bg-white text-slate-900 border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-black focus:border-purple-500 outline-none transition-all placeholder:text-slate-300"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="user@clonmel.com"
                  value={uEmail}
                  onChange={e => setUEmail(e.target.value)}
                  className="w-full bg-white text-slate-900 border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-black focus:border-purple-500 outline-none transition-all placeholder:text-slate-300"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Access Level</label>
                <select
                  value={uRole}
                  onChange={e => setURole(e.target.value as UserRole)}
                  className="w-full bg-white text-slate-900 border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none appearance-none cursor-pointer focus:border-purple-500"
                >
                  <option value={UserRole.USER}>Standard User</option>
                  <option value={UserRole.ADMIN}>Administrator</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-3 bg-slate-900 hover:bg-purple-600 text-white font-black py-4 rounded-2xl transition-all disabled:opacity-50 shadow-2xl shadow-slate-900/20 uppercase text-[10px] tracking-[0.2em]"
              >
                {isSyncing ? <RefreshCcw className="animate-spin" size={16} /> : <Plus size={16} />}
                Add User
              </button>
            </form>
          </div>

          <div className="bg-white rounded-[3rem] border-2 border-slate-100 overflow-hidden shadow-xl">
            <table className="w-full">
              <thead className="bg-slate-50/50 border-b-2 border-slate-100">
                <tr className="text-[10px] font-black text-slate-400 text-left uppercase tracking-widest">
                  <th className="px-12 py-7">Access Node</th>
                  <th className="px-12 py-7">Authentication Email</th>
                  <th className="px-12 py-7">Auth Group</th>
                  <th className="px-12 py-7 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-12 py-7 flex items-center gap-6">
                      <img src={u.avatar} className="w-14 h-14 rounded-2xl border-4 border-white shadow-xl" alt="" />
                      <div>
                        <span className="block font-black text-slate-900 text-base tracking-tight">{String(u.name)}</span>
                        <span className="text-[10px] font-bold text-slate-300 uppercase">Hardware ID: {String(u.id)}</span>
                      </div>
                    </td>
                    <td className="px-12 py-7 text-slate-500 font-black text-sm">{String(u.email)}</td>
                    <td className="px-12 py-7">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-5 py-2 rounded-2xl border-2 ${u.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                        {String(u.role)}
                      </span>
                    </td>
                    <td className="px-12 py-7 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                          title="Remove User"
                        >
                          <Trash2 size={20} />
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
    </div>
  );
};

export default Admin;