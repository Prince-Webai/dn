# Customer Selector Integration for Invoice Builder

## Add this code to InvoiceBuilder.tsx

### Location: After line 200 (before the "Customer / Client" input)

Add this customer selector dropdown:

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
        const fullAddress = [
          customer.address,
          customer.city,
          customer.postalCode,
          customer.country
        ].filter(Boolean).join(', ');
        setCustomerAddress(fullAddress);
      }
    }}
    className="w-full text-slate-900 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-all"
  >
    <option value="">-- Or select from CRM --</option>
    {customers.map(c => (
      <option key={c.id} value={c.id}>
        {c.name} ({c.email})
      </option>
    ))}
  </select>
</div>
```

## What This Does:

1. **Displays a dropdown** with all customers from your CRM
2. **Shows customer name and email** in the dropdown for easy identification
3. **Auto-fills all fields** when you select a customer:
   - Customer Name
   - Email
   - Phone
   - Full Address (combines address, city, postal code, country)
4. **Optional** - You can still manually enter customer details if they're not in the CRM

## How to Use:

1. Go to "New Invoice" page
2. See the new dropdown at the top: "Select Existing Customer (Optional)"
3. Click the dropdown and select a customer
4. All their details automatically fill in!
5. Continue creating the invoice as normal

## Already Done:

✅ Added `customers` to `useApp()` destructuring (line 9)
✅ Customer selector ready to be added to the form

## Manual Integration:

Since the automated edit failed, you can manually add the code above by:

1. Open `pages/InvoiceBuilder.tsx`
2. Find line 200 (the "Customer / Client" section)
3. Add the customer selector `<div>` block right before it
4. Save the file

The customer selector will then appear above the customer name field!
