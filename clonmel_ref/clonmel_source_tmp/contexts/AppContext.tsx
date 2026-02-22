import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Product, Invoice, UserRole, PaymentStatus, ViewState, Customer } from '../types';
import { storageService } from '../services/storageService';

// Initial Data for Seeding
const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@clonmel.com', role: UserRole.ADMIN, avatar: 'https://i.pravatar.cc/150?u=admin' },
  { id: 'u2', name: 'John Staff', email: 'john@clonmel.com', role: UserRole.USER, avatar: 'https://i.pravatar.cc/150?u=john' },
];

const INITIAL_PRODUCTS: Product[] = [
  // Clear / Standard
  { id: '04P', name: '4MM CLEAR POLISHED', description: 'Code: 04P - Single', price: 27.06, unit: 'sqm', category: 'Clear Glass' },
  { id: '06', name: '6MM CLEAR', description: 'Code: 06 - Single', price: 33.20, unit: 'sqm', category: 'Clear Glass' },
  { id: '06OW', name: '6MM LOW IRON', description: 'Code: 06OW - Single', price: 40.19, unit: 'sqm', category: 'Clear Glass' },
  { id: '06OWP', name: '6MM LOW IRON POL', description: 'Code: 06OWP - Single', price: 46.79, unit: 'sqm', category: 'Clear Glass' },
  { id: '06P', name: '6MM CLEAR POLISHED', description: 'Code: 06P - Single', price: 37.30, unit: 'sqm', category: 'Clear Glass' },
  { id: '08P', name: '8MM CLEAR POLISHED', description: 'Code: 08P - Single', price: 45.94, unit: 'sqm', category: 'Clear Glass' },
  { id: '10OWP', name: '10MM LOW IRON POL', description: 'Code: 10OWP - Single', price: 73.41, unit: 'sqm', category: 'Clear Glass' },
  { id: '10P', name: '10MM CLEAR POLISHED', description: 'Code: 10P - Single', price: 54.48, unit: 'sqm', category: 'Clear Glass' },
  { id: 'CS04', name: '4MM CLEAR SATIN', description: 'Code: CS04 - Single', price: 34.03, unit: 'sqm', category: 'Clear Glass' },

  // Tinted
  { id: 'B06P', name: '6MM TINTED POL', description: 'Code: B06P - Single', price: 44.91, unit: 'sqm', category: 'Tinted' },
  { id: 'BBLAR06', name: '6MM ARTIC BLUE', description: 'Code: BBLAR06 - Single', price: 60.89, unit: 'sqm', category: 'Tinted' },

  // COG Toughened
  { id: 'COG04', name: '4mm COG TOUGH', description: 'Code: COG04 - Single', price: 16.49, unit: 'sqm', category: 'Toughened' },
  { id: 'COG05', name: '5mm COG TOUGH', description: 'Code: COG05 - Single', price: 24.64, unit: 'sqm', category: 'Toughened' },
  { id: 'COG06', name: '6mm COG TOUGH', description: 'Code: COG06 - Single', price: 24.64, unit: 'sqm', category: 'Toughened' },
  { id: 'COG08', name: '8mm COG TOUGH', description: 'Code: COG08 - Single', price: 32.60, unit: 'sqm', category: 'Toughened' },
  { id: 'COG10', name: '10mm COG TOUGH', description: 'Code: COG10 - Single', price: 41.13, unit: 'sqm', category: 'Toughened' },
  { id: 'COG12', name: '12mm COG TOUGH', description: 'Code: COG12 - Single', price: 49.49, unit: 'sqm', category: 'Toughened' },
  { id: 'COG15', name: '15mm COG TOUGH', description: 'Code: COG15 - Single', price: 63.06, unit: 'sqm', category: 'Toughened' },
  { id: 'COG19', name: '19mm COG TOUGH', description: 'Code: COG19 - Single', price: 99.35, unit: 'sqm', category: 'Toughened' },
  { id: 'COGPA', name: 'COG PAINTED', description: 'Code: COGPA - Single', price: 64.42, unit: 'sqm', category: 'Toughened' },

  // Laminated
  { id: 'L084', name: '8.4MM LAMINATED', description: 'Code: L084 - Single', price: 67.44, unit: 'sqm', category: 'Laminated' },
  { id: 'L104', name: '10.4 LAMINATED', description: 'Code: L104 - Single', price: 75.49, unit: 'sqm', category: 'Laminated' },
  { id: 'L108', name: '10.8mm LAMINATE', description: 'Code: L108 - Single', price: 80.01, unit: 'sqm', category: 'Laminated' },
  { id: 'L115', name: '11.5 LAMINATE', description: 'Code: L115 - Single', price: 80.83, unit: 'sqm', category: 'Laminated' },
  { id: 'LAM12.8A', name: '12.8MM ACOUSTIC LAMI', description: 'Code: LAM12.8A - Single', price: 97.63, unit: 'sqm', category: 'Laminated' },
  { id: 'LAM6.8A', name: '6.8MM TEGO ACOUS LAM', description: 'Code: LAM6.8A - Single', price: 93.23, unit: 'sqm', category: 'Laminated' },
  { id: 'LO064', name: '6.4 OPAL LAMINATE', description: 'Code: LO064 - Single', price: 73.98, unit: 'sqm', category: 'Laminated' },
  { id: 'LO104', name: '10.4 OPAL LAMINATE', description: 'Code: LO104 - Single', price: 95.76, unit: 'sqm', category: 'Laminated' },
  { id: 'LO115', name: '11.5 OPAL LAMINATE', description: 'Code: LO115 - Single', price: 110.57, unit: 'sqm', category: 'Laminated' },

  // Obscure
  { id: 'P041', name: '4mm OBSCURE GROUP 1', description: 'Code: P041 - Single', price: 41.68, unit: 'sqm', category: 'Obscure' },
  { id: 'P043', name: '4mm OBSCURE GROUP 3', description: 'Code: P043 - Single', price: 41.68, unit: 'sqm', category: 'Obscure' },
  { id: 'P051BAM', name: '5mm CLEAR BAMBOO', description: 'Code: P051BAM - Single', price: 51.22, unit: 'sqm', category: 'Obscure' },
  { id: 'P061', name: '6mm OBSCURE GROUP 1', description: 'Code: P061 - Single', price: 66.04, unit: 'sqm', category: 'Obscure' },
  { id: 'TP041', name: '4mm OBS TOUGH GRP 1 - STIPP ONLY', description: 'Code: TP041 - Single', price: 49.09, unit: 'sqm', category: 'Obscure' },
  { id: 'TP041A', name: 'Choose Group 1 Pattern!!', description: 'Code: TP041A - Single', price: 42.69, unit: 'sqm', category: 'Obscure' },
  { id: 'TP042', name: '4mm OBS TOUGH GRP 2 - COTSWOLD ONLY', description: 'Code: TP042 - Single', price: 49.09, unit: 'sqm', category: 'Obscure' },
  { id: 'TP043', name: '4mm OBS TOUGH GRP 3 - OTHER OBSCURES', description: 'Code: TP043 - Single', price: 49.09, unit: 'sqm', category: 'Obscure' },
  { id: 'TP061', name: '6mm OBS TOUGH GRP 1', description: 'Code: TP061 - Single', price: 75.71, unit: 'sqm', category: 'Obscure' },
  { id: 'TP062', name: '6mm OBSCURE TOUGH GROUP 2', description: 'Code: TP062 - Single', price: 75.71, unit: 'sqm', category: 'Obscure' },

  // Fire Resistant
  { id: 'PYR07BEL', name: '7MM PYROBELL', description: 'Code: PYR07BEL - Single', price: 195.00, unit: 'sqm', category: 'Fire Resistant' },
  { id: 'PYR07GRD', name: '7MM PYROGUARD', description: 'Code: PYR07GRD - Single', price: 185.00, unit: 'sqm', category: 'Fire Resistant' },
  { id: 'PYR114GR', name: '11.4MM PYROGUARD', description: 'Code: PYR114GR - Single', price: 378.48, unit: 'sqm', category: 'Fire Resistant' },
  { id: 'PYR11NOV', name: '11MM PYRONOVA FIRE', description: 'Code: PYR11NOV - Single', price: 459.00, unit: 'sqm', category: 'Fire Resistant' },
  { id: 'PYR12BEL', name: '12MM PYROBEL', description: 'Code: PYR12BEL - Single', price: 376.75, unit: 'sqm', category: 'Fire Resistant' },
  { id: 'PYR15NOV', name: '15MM PYRANOVA', description: 'Code: PYR15NOV - Single', price: 355.00, unit: 'sqm', category: 'Fire Resistant' },
  { id: 'PYR23NOV', name: '23MM PYRANOVA', description: 'Code: PYR23NOV - Single', price: 638.00, unit: 'sqm', category: 'Fire Resistant' },
  { id: 'PYRAN08', name: '8MM PYRAN', description: 'Code: PYRAN08 - Single', price: 357.50, unit: 'sqm', category: 'Fire Resistant' },

  // Mirrors
  { id: 'S06BLACKANTQPOL', name: '6MM BLACK ANTIQUE MIRROR POL', description: 'Code: S06BLACKANTQPOL - Single', price: 149.44, unit: 'sqm', category: 'Mirrors' },
  { id: 'SOW6MM', name: '6MM SILVER LOW IRON', description: 'Code: SOW6MM - Single', price: 63.43, unit: 'sqm', category: 'Mirrors' },
  { id: 'SS06', name: '6mm SPYMIRROR', description: 'Code: SS06 - Single', price: 193.55, unit: 'sqm', category: 'Mirrors' },
  { id: 'T-SIL-06', name: '6MM TOUGH SIL-MIRRORPANE CHROME', description: 'Code: T-SIL-06 - Single', price: 199.65, unit: 'sqm', category: 'Mirrors' },

  // Standard Toughened
  { id: 'T04', name: '4mm CLEAR TOUGH', description: 'Code: T04 - Single', price: 30.12, unit: 'sqm', category: 'Toughened' },
  { id: 'T05', name: '5MM CLEAR TOUGH', description: 'Code: T05 - Single', price: 36.18, unit: 'sqm', category: 'Toughened' },
  { id: 'T05P', name: '5MM CLEAR TOUGH POL', description: 'Code: T05P - Single', price: 43.90, unit: 'sqm', category: 'Toughened' },
  { id: 'T06', name: '6mm CLEAR TOUGH', description: 'Code: T06 - Single', price: 39.80, unit: 'sqm', category: 'Toughened' },
  { id: 'T12SOW-ASP', name: '12MM LOW IRON SATIN ANTI-SLIP TOUGH POL', description: 'Code: T12SOW-ASP - Single', price: 170.50, unit: 'sqm', category: 'Toughened' },
  { id: 'T19P', name: '19MM CLR TOUGH POL', description: 'Code: T19P - Single', price: 189.56, unit: 'sqm', category: 'Toughened' },
  { id: 'TB06', name: '6mm TINT TOUGH', description: 'Code: TB06 - Single', price: 45.24, unit: 'sqm', category: 'Toughened' },
  { id: 'TB08P', name: '8MM TINT TOUGH POL', description: 'Code: TB08P - Single', price: 76.08, unit: 'sqm', category: 'Toughened' },
  { id: 'TB08PSHR', name: '8MM TINT TGH P&SH&R', description: 'Code: TB08PSHR - Single', price: 95.10, unit: 'sqm', category: 'Toughened' },
  { id: 'TBBL06P', name: '6MM ARTIC BL TGH POL', description: 'Code: TBBL06P - Single', price: 67.49, unit: 'sqm', category: 'Toughened' },
  { id: 'TBFB06', name: '6MM FORD BLUE TOUGH', description: 'Code: TBFB06 - Single', price: 73.92, unit: 'sqm', category: 'Toughened' },
  { id: 'TCS04', name: '4MM SATIN TOUGH', description: 'Code: TCS04 - Single', price: 38.03, unit: 'sqm', category: 'Toughened' },
  { id: 'TK06', name: '6mm K TOUGHENED', description: 'Code: TK06 - Single', price: 48.13, unit: 'sqm', category: 'Toughened' },
  { id: 'TOW04A', name: '4mm LOW IRON TOUGH', description: 'Code: TOW04A - Single', price: 39.73, unit: 'sqm', category: 'Toughened' },
  { id: 'TOW06', name: '6MM LOW IRON TOUGH', description: 'Code: TOW06 - Single', price: 47.09, unit: 'sqm', category: 'Toughened' },
  { id: 'TOW10A', name: '10MM LOW IRON TOUGH', description: 'Code: TOW10A - Single', price: 77.99, unit: 'sqm', category: 'Toughened' },

  // Other
  { id: 'TP06VSW', name: '6MM VISIO SUN REEDED TOUGH', description: 'Code: TP06VSW - Single', price: 146.41, unit: 'sqm', category: 'Textured' },
  { id: 'TP08LIRE', name: '8MM LOW IRON REED TOUGH', description: 'Code: TP08LIRE - Single', price: 105.30, unit: 'sqm', category: 'Textured' },
  { id: 'TP08LIREED', name: '8MM LOW IRON REEDED TOUGH PAR', description: 'Code: TP08LIREED - Single', price: 113.30, unit: 'sqm', category: 'Textured' },
  { id: 'W07CAST', name: '7mm WIRED CAST GLASS', description: 'Code: W07CAST - Single', price: 60.03, unit: 'sqm', category: 'Wired' },
  { id: 'W07SAFP', name: '7mm GWPP SAFETY', description: 'Code: W07SAFP - Single', price: 130.31, unit: 'sqm', category: 'Wired' },
];

interface AppContextType {
  user: User | null;
  login: (email: string) => void;
  logout: () => void;
  users: User[];
  addUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  products: Product[];
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  invoices: Invoice[];
  addInvoice: (invoice: Invoice) => Promise<void>;
  updateInvoice: (invoice: Invoice) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  customers: Customer[];
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  currentView: ViewState;
  setView: (view: ViewState) => void;
  selectedInvoiceId: string | null;
  setSelectedInvoiceId: (id: string | null) => void;
  companyLogo: string;
  setCompanyLogo: (logo: string) => void;
  isSyncing: boolean;
  isLoading: boolean;
  databaseError: boolean;
  refreshDatabase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setView] = useState<ViewState>('LOGIN');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [databaseError, setDatabaseError] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companyLogo, setCompanyLogo] = useState<string>('');

  const initDb = async () => {
    setIsLoading(true);
    setDatabaseError(false);
    try {
      const [storedUsers, storedProducts, storedInvoices, storedCustomers, storedLogo] = await Promise.all([
        storageService.getUsers(),
        storageService.getProducts(),
        storageService.getInvoices(),
        storageService.getCustomers(),
        storageService.getLogo()
      ]);

      // --- AUTO-SEED LOGIC ---
      // If connected but no products, seed the initial catalog
      if (storedProducts.length === 0 && !databaseError) {
        console.log("Empty DB detected. Seeding initial data...");
        await storageService.seedData(INITIAL_PRODUCTS, INITIAL_USERS);
        // Re-fetch after seeding
        const reFetchedProducts = await storageService.getProducts();
        const reFetchedUsers = await storageService.getUsers();
        setProducts(reFetchedProducts);
        setUsers(reFetchedUsers);
      } else {
        setUsers(storedUsers);
        setProducts(storedProducts);
      }

      setInvoices(storedInvoices);
      setCustomers(storedCustomers);
      setCompanyLogo(storedLogo);
      setDatabaseError(false);
    } catch (err: any) {
      if (err.message === 'DATABASE_MISSING') {
        setDatabaseError(true);
        // Even if missing, we empty local state to force user to fix DB connection
        setUsers([]);
        setProducts([]);
        setInvoices([]);
      }
      console.error("Initialization failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initDb();
  }, []);

  const login = (email: string) => {
    const found = users.find(u => u.email === email);
    if (found) {
      setUser(found);
      setView(databaseError ? 'PRODUCTS' : 'DASHBOARD');
    } else {
      // Fallback for demo if users aren't loaded yet
      if (email === 'admin@clonmel.com') {
        const demoAdmin: User = { id: 'u1', name: 'Admin User', email, role: UserRole.ADMIN, avatar: 'https://i.pravatar.cc/150?u=admin' };
        setUser(demoAdmin);
        setView(databaseError ? 'PRODUCTS' : 'DASHBOARD');
        return;
      }
      alert("User not found.");
    }
  };

  const logout = () => {
    setUser(null);
    setView('LOGIN');
  };

  const addUser = async (u: User) => {
    setIsSyncing(true);
    try {
      await storageService.addUser(u);
      setUsers(prev => [...prev, u]);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteUser = async (id: string) => {
    setIsSyncing(true);
    try {
      await storageService.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } finally {
      setIsSyncing(false);
    }
  };

  const addProduct = async (p: Product) => {
    setIsSyncing(true);
    try {
      await storageService.addProduct(p);
      setProducts(prev => [...prev, p]);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateProduct = async (p: Product) => {
    setIsSyncing(true);
    try {
      await storageService.updateProduct(p);
      setProducts(prev => prev.map(prod => prod.id === p.id ? p : prod));
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteProduct = async (id: string) => {
    setIsSyncing(true);
    try {
      await storageService.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } finally {
      setIsSyncing(false);
    }
  };

  const addInvoice = async (inv: Invoice) => {
    setIsSyncing(true);
    try {
      await storageService.addInvoice(inv);
      setInvoices(prev => [inv, ...prev]);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateInvoice = async (inv: Invoice) => {
    setIsSyncing(true);
    try {
      await storageService.updateInvoice(inv);
      setInvoices(prev => prev.map(i => i.id === inv.id ? inv : i));
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteInvoice = async (id: string) => {
    // Optimistic Update: Remove immediately from UI
    const previousInvoices = invoices;
    setInvoices(prev => prev.filter(i => i.id !== id));

    setIsSyncing(true);
    try {
      await storageService.deleteInvoice(id);
    } catch (e) {
      console.error("Delete failed, rolling back UI", e);
      setInvoices(previousInvoices); // Revert on failure
      throw e;
    } finally {
      setIsSyncing(false);
    }
  };

  const updateLogo = async (logo: string) => {
    setIsSyncing(true);
    try {
      await storageService.saveLogo(logo);
      setCompanyLogo(logo);
    } catch (e) {
      console.error("DB Error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const addCustomer = async (customer: Customer) => {
    setIsSyncing(true);
    try {
      await storageService.addCustomer(customer);
      setCustomers(prev => [...prev, customer]);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateCustomer = async (customer: Customer) => {
    setIsSyncing(true);
    try {
      await storageService.updateCustomer(customer);
      setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteCustomer = async (id: string) => {
    setIsSyncing(true);
    try {
      await storageService.deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AppContext.Provider value={{
      user, login, logout,
      users, addUser, deleteUser,
      products, addProduct, updateProduct, deleteProduct,
      invoices, addInvoice, updateInvoice, deleteInvoice,
      customers, addCustomer, updateCustomer, deleteCustomer,
      currentView, setView,
      selectedInvoiceId, setSelectedInvoiceId,
      companyLogo, setCompanyLogo: updateLogo,
      isSyncing, isLoading, databaseError,
      refreshDatabase: initDb
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};