# Quick Integration Guide - Customer CRM

## ✅ COMPLETED:
1. Customer type added to `types.ts`
2. Customer storage methods added to `storageService.ts`
3. Customer CRM page created at `pages/CustomerCRM.tsx`
4. AppContext partially updated (customers state, interface, loading)

## 🔧 TO COMPLETE:

### Step 1: Add Customer CRUD Functions to AppContext

**File:** `contexts/AppContext.tsx`

**Location:** After the `updateInvoice` function (around line 288), add:

```typescript
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
```

**Location:** In the Provider value (around line 305), add to the object:

```typescript
customers, addCustomer, updateCustomer, deleteCustomer,
```

### Step 2: Add CRM to Main App

**File:** `App.tsx`

**Add import:**
```typescript
import CustomerCRM from './pages/CustomerCRM';
```

**Add route in render (with other view conditions):**
```typescript
{currentView === 'CUSTOMERS' && <CustomerCRM />}
```

**Add navigation button in sidebar:**
```tsx
<button
  onClick={() => setView('CUSTOMERS')}
  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
    currentView === 'CUSTOMERS'
      ? 'bg-brand-600 text-white shadow-lg'
      : 'text-slate-600 hover:bg-slate-100'
  }`}
>
  <Users size={18} />
  <span className="font-bold">Customers</span>
</button>
```

### Step 3: Create Database Table

**Run in Supabase SQL Editor:**

```sql
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  gender TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  company TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- Add index for faster searches
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_email ON customers(email);
```

### Step 4: Integrate with Invoice Builder (Optional but Recommended)

**File:** `pages/InvoiceBuilder.tsx`

**Add to imports:**
```typescript
const { customers } = useApp();
```

**Add customer selector before the customer name input (around line 195):**

```tsx
<div>
  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
    Select Existing Customer (Optional)
  </label>
  <select
    onChange={(e) => {
      const customer = customers.find(c => c.id === e.target.value);
      if (customer) {
        setCustomerName(customer.name);
        setCustomerEmail(customer.email);
        setCustomerPhone(customer.phone);
        setCustomerAddress(`${customer.address || ''} ${customer.city || ''} ${customer.postalCode || ''}`.trim());
      }
    }}
    className="w-full text-slate-900 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-all"
  >
    <option value="">-- Or select existing customer --</option>
    {customers.map(c => (
      <option key={c.id} value={c.id}>
        {c.name} ({c.email})
      </option>
    ))}
  </select>
</div>
```

## 🎯 Testing Checklist:

1. ✅ Navigate to Customers page
2. ✅ Add a new customer
3. ✅ Edit customer details
4. ✅ Delete a customer
5. ✅ Search for customers
6. ✅ Add tags to customers
7. ✅ Go to Invoice Builder
8. ✅ Select customer from dropdown
9. ✅ Verify details auto-fill

## 📝 Features:

- **Full CRUD**: Create, Read, Update, Delete customers
- **Search**: Filter by name, email, or phone
- **Tags**: Categorize customers with custom tags
- **Rich Profiles**: Store comprehensive customer information
- **Auto-fill**: Select customer in invoice builder to auto-populate details
- **GoHighLevel Style**: Modern, card-based interface

## 🚀 Ready to Use!

Once you complete Steps 1-3 above, the CRM will be fully functional!
