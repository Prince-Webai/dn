
import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext.tsx';
import Layout from './components/Layout.tsx';
import Dashboard from './pages/Dashboard.tsx';
import InvoiceList from './pages/InvoiceList.tsx';
import InvoiceBuilder from './pages/InvoiceBuilder.tsx';
import InvoiceCalendar from './pages/InvoiceCalendar.tsx';
import CustomerCRM from './pages/CustomerCRM.tsx';
import Admin from './pages/Admin.tsx';

const LoginScreen = () => {
  const { login } = useApp();
  const [email, setEmail] = React.useState('admin@clonmel.com');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-brand-500/30">
            CG
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Clonmel Glass</h1>
          <p className="text-slate-500">Invoice System Login</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
            />
          </div>
          <button
            onClick={() => login(email)}
            className="w-full bg-brand-600 text-white font-semibold py-3 rounded-lg hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
          >
            Sign In
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          <p>Demo Credentials:</p>
          <p>admin@clonmel.com (Admin)</p>
          <p>john@clonmel.com (User)</p>
        </div>
      </div>
    </div>
  );
};

const MainContent = () => {
  const { currentView } = useApp();

  switch (currentView) {
    case 'LOGIN': return <LoginScreen />;
    case 'DASHBOARD': return <Dashboard />;
    case 'CALENDAR': return <InvoiceCalendar />;
    case 'INVOICES': return <InvoiceList />;
    case 'CREATE_INVOICE': return <InvoiceBuilder />;
    case 'CUSTOMERS': return <CustomerCRM />;
    case 'PRODUCTS': return <Admin />;
    case 'USERS': return <Admin />; // Admin page handles tabs
    default: return <Dashboard />;
  }
};

const App = () => {
  return (
    <AppProvider>
      <Layout>
        <MainContent />
      </Layout>
    </AppProvider>
  );
};

export default App;
