import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Customer, InventoryItem } from '../types';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Plus, Trash2, ShoppingBag, FileDiff, UserPlus, Users, Eye, CheckCircle, Download, Receipt } from 'lucide-react';
import DatePicker from '../components/DatePicker';
import SearchableSelect from '../components/SearchableSelect';
import { generateInvoice, generateQuote } from '../lib/pdfGenerator';

const DocumentBuilder = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialType = searchParams.get('type') === 'quote' ? 'quote' : 'invoice';
    const documentId = searchParams.get('id');
    const { showToast } = useToast();

    const [isEditing] = useState(!!documentId);
    const [docType, setDocType] = useState<'invoice' | 'quote'>(initialType as 'invoice' | 'quote');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [vatRate, setVatRate] = useState<number>(13.5);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);

    // Customer mode state
    const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
    const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', address: '' });

    const [docData, setDocData] = useState({
        customerId: '',
        description: '',
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        items: [] as { description: string; quantity: number; unitPrice: number }[],
        notes: ''
    });

    useEffect(() => {
        fetchCustomers();
        fetchInventory();
        if (documentId) {
            loadExistingDocument(documentId);
        }
    }, [documentId]);

    const loadExistingDocument = async (id: string) => {
        try {
            setLoading(true);
            if (initialType === 'quote') {
                const { data: quote, error } = await supabase
                    .from('quotes')
                    .select('*, quote_items(*)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (quote) {
                    setDocData({
                        customerId: quote.customer_id || '',
                        description: quote.description || '',
                        validUntil: quote.valid_until || quote.date_issued,
                        notes: quote.notes || '',
                        items: (quote.quote_items || []).map((item: any) => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unit_price
                        }))
                    });
                    setCustomerMode('existing');
                }
            }
        } catch (error) {
            console.error('Error loading document:', error);
            showToast('Error', 'Failed to load existing document', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        const { data } = await supabase.from('customers').select('*').order('name');
        setCustomers(data || []);
    };

    const fetchInventory = async () => {
        const { data } = await supabase.from('inventory').select('*').order('name');
        setInventory(data || []);
    };

    const getNextNumber = async (table: 'invoices' | 'statements', prefix: string) => {
        const column = table === 'invoices' ? 'invoice_number' : 'statement_number';
        const { data } = await supabase
            .from(table)
            .select(column)
            .order('created_at', { ascending: false })
            .limit(1);

        const lastNumber = (data?.[0] as any)?.[column] as string;
        const currentYear = new Date().getFullYear();

        if (lastNumber && lastNumber.includes(`${prefix}-${currentYear}-`)) {
            const sequence = parseInt(lastNumber.split('-').pop() || '0');
            return `${prefix}-${currentYear}-${String(sequence + 1).padStart(3, '0')}`;
        }
        return `${prefix}-${currentYear}-001`;
    };

    const handleCreateDocument = async (e: React.FormEvent) => {
        e.preventDefault();

        if (docData.items.length === 0) {
            showToast('Error', 'Please add at least one line item', 'error');
            return;
        }

        try {
            setLoading(true);

            let finalCustomerId = docData.customerId;

            if (customerMode === 'new') {
                if (!newCustomer.name) {
                    showToast('Error', 'Customer name is required for new customers', 'error');
                    setLoading(false);
                    return;
                }
                const { data: createdCustomer, error: createError } = await supabase.from('customers').insert([{
                    name: newCustomer.name,
                    email: newCustomer.email || null,
                    phone: newCustomer.phone || null,
                    address: newCustomer.address || null,
                    account_balance: 0,
                    payment_terms: 'net_30'
                }]).select().single();

                if (createError) throw createError;
                finalCustomerId = createdCustomer.id;
            }

            const subtotal = docData.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
            const vatRate = 13.5;
            const vatAmount = subtotal * (vatRate / 100);
            const totalAmount = subtotal + vatAmount;
            const customDescription = docData.description || docData.items.map(i => i.description).join(', ');

            if (docType === 'quote') {
                if (isEditing && documentId) {
                    // UPDATE EXISTING QUOTE
                    const { error: updateError } = await supabase
                        .from('quotes')
                        .update({
                            customer_id: finalCustomerId,
                            description: customDescription,
                            valid_until: docData.validUntil,
                            subtotal,
                            vat_rate: vatRate,
                            vat_amount: vatAmount,
                            total_amount: totalAmount,
                            notes: docData.notes,
                        })
                        .eq('id', documentId);

                    if (updateError) throw updateError;

                    // Delete existing items
                    await supabase.from('quote_items').delete().eq('quote_id', documentId);

                    // Insert new items
                    if (docData.items.length > 0) {
                        const itemsToInsert = docData.items.map(item => ({
                            quote_id: documentId,
                            description: item.description,
                            quantity: item.quantity,
                            unit_price: item.unitPrice
                        }));
                        const { error: itemsError } = await supabase.from('quote_items').insert(itemsToInsert);
                        if (itemsError) throw itemsError;
                    }
                    showToast('Quote Updated', 'Quote has been updated successfully.', 'success');
                    navigate('/quotes');

                } else {
                    // CREATE NEW QUOTE
                    const { data: qData, error: quoteError } = await supabase
                        .from('quotes')
                        .insert([{
                            quote_number: `QT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
                            customer_id: finalCustomerId,
                            description: customDescription,
                            valid_until: docData.validUntil,
                            subtotal,
                            vat_amount: vatAmount,
                            total_amount: totalAmount,
                            notes: docData.notes,
                            status: 'draft'
                        }])
                        .select()
                        .single();

                    if (quoteError) throw quoteError;

                    if (docData.items.length > 0 && qData) {
                        const itemsToInsert = docData.items.map(item => ({
                            quote_id: qData.id,
                            description: item.description,
                            quantity: item.quantity,
                            unit_price: item.unitPrice
                        }));

                        const { error: itemsError } = await supabase.from('quote_items').insert(itemsToInsert);
                        if (itemsError) throw itemsError;
                    }
                    showToast('Quote Created', 'New quote has been generated successfully.', 'success');
                    navigate('/quotes');
                }
            } else {
                // INVOICE
                const nextNumber = await getNextNumber('invoices', 'INV');
                const { data: invData, error: invError } = await supabase.from('invoices').insert([{
                    invoice_number: nextNumber,
                    customer_id: finalCustomerId,
                    subtotal: subtotal,
                    vat_rate: vatRate,
                    vat_amount: vatAmount,
                    total_amount: totalAmount,
                    custom_description: customDescription,
                    status: 'draft',
                    date_issued: new Date().toISOString().split('T')[0],
                    due_date: docData.validUntil
                }]).select().single();

                if (invError) throw invError;

                if (docData.items.length > 0 && invData) {
                    const itemsToInsert = docData.items.map(item => ({
                        invoice_id: invData.id,
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unitPrice,
                        type: 'service' // Default type
                    }));
                    const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
                    if (itemsError) throw itemsError;
                }

                showToast('Invoice Created', `Invoice ${nextNumber} created.`, 'success');

                // AUTO-GENERATE STATEMENT
                try {
                    // Create a hidden "Job" record to store the items for the statement
                    const { data: jobData, error: jobError } = await supabase.from('jobs').insert([{
                        customer_id: finalCustomerId,
                        service_type: docType === 'invoice' ? 'Detailed Invoice Statement' : 'Quote Statement',
                        status: 'completed',
                        date_completed: new Date().toISOString()
                    }]).select().single();

                    if (jobError) throw jobError;

                    if (jobData && docData.items.length > 0) {
                        const jobItemsToInsert = docData.items.map(item => ({
                            job_id: jobData.id,
                            description: item.description,
                            quantity: item.quantity,
                            unit_price: item.unitPrice,
                            type: 'service'
                        }));
                        await supabase.from('job_items').insert(jobItemsToInsert);
                    }

                    const nextStmtNumber = await getNextNumber('statements', 'ST');
                    await supabase.from('statements').insert([{
                        statement_number: nextStmtNumber,
                        customer_id: finalCustomerId,
                        job_id: jobData?.id,
                        date_generated: new Date().toISOString().split('T')[0],
                        total_amount: totalAmount,
                    }]);
                } catch (stmtError) {
                    console.error('Error auto-generating statement:', stmtError);
                }

                navigate('/invoices');
            }

        } catch (error) {
            console.error(`Error creating ${docType}:`, error);
            showToast('Error', `Failed to create ${docType}.`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePDF = async (action: 'download' | 'preview' = 'preview') => {
        if (docData.items.length === 0) {
            showToast('Error', `Please add at least one line item to ${action}`, 'error');
            return;
        }

        let customerToUse = null;

        if (customerMode === 'existing') {
            customerToUse = customers.find(c => c.id === docData.customerId);
        } else {
            // Mock a customer for preview purposes
            customerToUse = {
                id: 'preview',
                name: newCustomer.name || 'New Customer',
                email: newCustomer.email,
                phone: newCustomer.phone,
                address: newCustomer.address,
                account_balance: 0,
                payment_terms: 'net_30',
                created_at: new Date().toISOString()
            } as Customer;
        }

        if (!customerToUse) {
            showToast('Error', 'Please enter or select a customer to preview', 'error');
            return;
        }

        const subtotal = docData.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        const vatRate = 13.5;
        const vatAmount = subtotal * (vatRate / 100);
        const totalAmount = subtotal + vatAmount;
        const customDescription = docData.description || docData.items.map(i => i.description).join(', ');

        try {
            let pdfData: string | void = undefined;

            if (docType === 'quote') {
                pdfData = await generateQuote(
                    {
                        id: 'preview',
                        created_at: new Date().toISOString(),
                        quote_number: 'PREVIEW',
                        customer_id: customerToUse.id,
                        description: customDescription,
                        date_issued: new Date().toISOString().split('T')[0],
                        valid_until: docData.validUntil,
                        subtotal,
                        vat_rate: vatRate,
                        vat_amount: vatAmount,
                        total_amount: totalAmount,
                        status: 'draft'
                    },
                    customerToUse,
                    docData.items.map(item => ({
                        id: Math.random().toString(),
                        quote_id: 'preview',
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unitPrice,
                        total: item.quantity * item.unitPrice
                    })),
                    action
                ) as unknown as string;
            } else {
                pdfData = await generateInvoice(
                    'PREVIEW',
                    customerToUse,
                    docData.items.map(item => ({
                        id: Math.random().toString(),
                        invoice_id: 'preview',
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unitPrice,
                        total: item.quantity * item.unitPrice,
                        type: 'service'
                    })),
                    vatRate,
                    totalAmount,
                    action, // Pass action here
                    'DRAFT'
                ) as unknown as string;
            }

            if (pdfData && action === 'preview') {
                window.open(pdfData, '_blank', 'noopener,noreferrer');
            }
        } catch (error) {
            console.error('Preview Error', error);
            showToast('Error', 'Failed to generate preview', 'error');
        }
    };

    const addLineItem = () => {
        const items = [...docData.items, { description: '', quantity: 1, unitPrice: 0 }];
        setDocData({ ...docData, items });
    };

    const updateLineItem = (index: number, field: string, value: string | number) => {
        const items = [...docData.items];
        items[index] = { ...items[index], [field]: value };

        // Auto-fill price if picking from inventory via datalist
        if (field === 'description') {
            const matchedProduct = inventory.find(i => i.name === value);
            if (matchedProduct) {
                items[index].unitPrice = matchedProduct.sell_price;
            }
        }

        setDocData({ ...docData, items });
    };

    const removeLineItem = (index: number) => {
        const items = docData.items.filter((_, i) => i !== index);
        setDocData({ ...docData, items });
    };

    const docSubtotal = docData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const docVat = docSubtotal * (vatRate / 100);
    const docTotal = docSubtotal + docVat;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} className="text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold font-display text-slate-900">
                            {isEditing ? `Edit ${docType.charAt(0).toUpperCase() + docType.slice(1)}` : 'Document Builder'}
                        </h1>
                        <p className="text-slate-500 text-sm">
                            {isEditing ? `Update existing ${docType}` : `Create a standalone ${docType}`}
                        </p>
                    </div>
                </div>

                {/* Switcher Toggle */}
                {!isEditing && (
                    <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setDocType('invoice')}
                            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${docType === 'invoice' ? 'bg-white text-delaval-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Invoice
                        </button>
                        <button
                            type="button"
                            onClick={() => setDocType('quote')}
                            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${docType === 'quote' ? 'bg-white text-delaval-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Quote
                        </button>
                    </div>
                )}
            </div>

            <form onSubmit={handleCreateDocument} className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">

                {/* Left Column: Details & Items */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <FileDiff size={20} className="text-delaval-blue" />
                            {docType === 'invoice' ? 'Invoice Details' : 'Quote Details'}
                        </h2>

                        <div className="space-y-4">
                            {/* Customer Section */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                                <div className="flex bg-slate-200/50 p-1 rounded-lg w-full sm:w-max mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setCustomerMode('existing')}
                                        className={`flex items-center gap-2 flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${customerMode === 'existing' ? 'bg-white text-delaval-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Users size={14} /> Existing Customer
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCustomerMode('new')}
                                        className={`flex items-center gap-2 flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${customerMode === 'new' ? 'bg-white text-delaval-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <UserPlus size={14} /> New Customer
                                    </button>
                                </div>

                                {customerMode === 'existing' ? (
                                    <div className="form-group pb-2">
                                        <SearchableSelect
                                            label="Select Customer"
                                            required
                                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                                            value={docData.customerId}
                                            onChange={(val) => setDocData({ ...docData, customerId: val })}
                                            placeholder="Search for a customer..."
                                            icon={<Users size={16} />}
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
                                        <div className="form-group">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Customer Name *</label>
                                            <input type="text" required={customerMode === 'new'} placeholder="Farm or person name" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                                            <input type="email" placeholder="example@farm.com" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Phone</label>
                                            <input type="text" placeholder="+353 ..." className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Address</label>
                                            <input type="text" placeholder="County, Town..." className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none" value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Due Date / Valid Until *</label>
                                    <DatePicker
                                        value={docData.validUntil}
                                        onChange={(v) => setDocData({ ...docData, validUntil: v })}
                                    />
                                </div>
                                <div className="form-group">
                                    <SearchableSelect
                                        label="VAT Rate"
                                        searchable={false}
                                        options={[
                                            { value: '23', label: 'Standard (23%)' },
                                            { value: '13.5', label: 'Reduced (13.5%)' },
                                            { value: '4.8', label: 'Livestock (4.8%)' },
                                            { value: '0', label: 'Zero Rated (0%)' },
                                        ]}
                                        value={vatRate.toString()}
                                        onChange={(val) => setVatRate(parseFloat(val))}
                                        icon={<Receipt size={16} />}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Description *</label>
                                <input
                                    type="text"
                                    className="block w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                                    placeholder="e.g. DeLaval VMS V300 Installation"
                                    value={docData.description}
                                    onChange={(e) => setDocData({ ...docData, description: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <ShoppingBag size={20} className="text-delaval-blue" />
                                Line Items
                            </h2>
                            <button type="button" onClick={addLineItem} className="text-sm text-delaval-blue font-bold hover:underline flex items-center gap-1">
                                <Plus size={16} /> Add Item
                            </button>
                        </div>

                        {docData.items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                                <ShoppingBag size={32} className="text-slate-300 mb-2" />
                                <p className="text-sm font-medium text-slate-500">No items added yet</p>
                                <button type="button" onClick={addLineItem} className="mt-3 btn btn-outline border-slate-300 text-sm py-1.5 px-3">
                                    Add your first item
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Header */}
                                <div className="grid grid-cols-12 gap-3 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <div className="col-span-6">Description</div>
                                    <div className="col-span-2 text-center">Qty</div>
                                    <div className="col-span-3">Unit Price</div>
                                    <div className="col-span-1 border-gray-100"></div>
                                </div>

                                {docData.items.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-slate-50 p-2 rounded-lg group">
                                        <input
                                            list="inventory-products"
                                            placeholder="Search product or type description..."
                                            className="col-span-6 text-sm bg-white border border-slate-200 px-3 py-2 rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                                            value={item.description}
                                            onChange={e => updateLineItem(idx, 'description', e.target.value)}
                                            required
                                        />
                                        <input
                                            type="number"
                                            min="1"
                                            className="col-span-2 text-sm bg-white border border-slate-200 px-3 py-2 rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none text-center"
                                            value={item.quantity}
                                            onChange={e => updateLineItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                            required
                                        />
                                        <div className="col-span-3 relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="w-full text-sm bg-white border border-slate-200 pl-7 pr-3 py-2 rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                                                value={item.unitPrice}
                                                onChange={e => updateLineItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                required
                                            />
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            <button type="button" onClick={() => removeLineItem(idx)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <datalist id="inventory-products">
                            {inventory.map(prod => (
                                <option key={prod.id} value={prod.name}>
                                    {prod.sku ? `[${prod.sku}] ` : ''}€{prod.sell_price.toFixed(2)}
                                </option>
                            ))}
                        </datalist>
                    </div>
                </div>

                {/* Right Column: Pricing & Action */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-xl shadow-xl text-white overflow-hidden sticky top-6">
                        <div className="p-6">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Summary</h3>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-slate-300 text-sm">
                                    <span>Subtotal</span>
                                    <span className="font-mono">€{docSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-300 text-sm">
                                    <span>VAT (13.5%)</span>
                                    <span className="font-mono">€{docVat.toFixed(2)}</span>
                                </div>
                                <div className="pt-3 border-t border-slate-700 flex justify-between items-end">
                                    <span className="text-sm font-bold text-white">Total Amount</span>
                                    <span className="text-2xl font-bold font-mono text-blue-400">€{docTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="form-group mb-6">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Internal Notes</label>
                                <textarea
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none h-24 placeholder-slate-600 resize-none"
                                    placeholder="Add any internal remarks..."
                                    value={docData.notes}
                                    onChange={(e) => setDocData({ ...docData, notes: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <button
                                    type="button"
                                    onClick={() => handleGeneratePDF('preview')}
                                    disabled={loading || docData.items.length === 0}
                                    className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 border border-slate-700 hover:border-slate-500"
                                >
                                    <Eye size={18} />
                                    Preview
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleGeneratePDF('download')}
                                    disabled={loading || docData.items.length === 0}
                                    className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 border border-slate-700 hover:border-slate-500"
                                >
                                    <Download size={18} />
                                    Download
                                </button>
                            </div>
                            <button
                                type="submit"
                                disabled={loading || docData.items.length === 0}
                                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {loading ? (
                                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                ) : (
                                    <CheckCircle size={18} />
                                )}
                                {isEditing ? 'Update' : 'Create & Save'} {docType === 'invoice' ? 'Invoice' : 'Quote'}
                            </button>
                        </div>
                    </div>
                </div>

            </form>
        </div >
    );
};

export default DocumentBuilder;
