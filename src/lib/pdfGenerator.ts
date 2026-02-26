import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, Job, JobItem, Quote, QuoteItem, InvoiceItem, Statement, Settings } from '../types';
import { dataService } from '../services/dataService';

// === CONSTANTS ===
const LEFT = 15;   // left margin mm
const RIGHT = 15;  // right margin mm

// Load logo from public directory at PDF generation time
const loadLogoBase64 = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject('No canvas context'); return; }
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = '/logo_v2.png';
    });
};

// === LOGO ===
// Right-aligned, 80mm wide x 25mm tall, y=8. Matches reference.
const addLogo = async (doc: jsPDF) => {
    const logoW = 80;
    const logoH = 26;
    const x = doc.internal.pageSize.width - RIGHT - logoW;
    try {
        const b64 = await loadLogoBase64();
        doc.addImage(b64, 'PNG', x, 10, logoW, logoH);
    } catch (e) {
        console.error('Logo load failed', e);
    }
};

// === STATUS BANNER (corner triangle) ===
const addStatusBanner = (doc: jsPDF, status: string) => {
    if (!status) return;
    const upper = status.toUpperCase();
    const isPaid = upper === 'PAID';
    const color: [number, number, number] = isPaid ? [34, 197, 94] : [255, 140, 0];
    doc.setFillColor(...color);
    doc.triangle(0, 12, 0, 32, 32, 0, 'F');
    doc.triangle(32, 0, 12, 0, 0, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(upper, 5, 18, { angle: 45 });
};

// Header Section Helper - clean header, no background, matching original layout
const addHeader = async (
    doc: jsPDF,
    title: string,
    documentNumber: string,
    status?: string
) => {
    await addLogo(doc);
    if (status) addStatusBanner(doc, status);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(20, 20, 20);
    doc.text(title, LEFT, 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(documentNumber, LEFT, 36);

    return 52; // next section starts at y=52
};

// === ADDRESS SECTION: 3 equal columns using autoTable for alignment ===
const addAddressSection = (
    doc: jsPDF,
    customer: Customer,
    y: number,
    type: string = 'Invoice',
    settings: Settings | null
) => {
    const pageWidth = doc.internal.pageSize.width;
    const usableWidth = pageWidth - LEFT - RIGHT;
    const colW = usableWidth / 3;

    autoTable(doc, {
        startY: y,
        head: [[type === 'Quote' ? 'Quote For:' : 'Invoice To:', { content: 'Deliver To:', styles: { cellPadding: { left: 1 } } }, { content: String(settings?.company_name || 'Tony Condon Dairy Services'), styles: { halign: 'right' } }]],
        body: [[
            { content: String(customer.name || 'Cash Sale') + '\n' + String(customer.address || ''), styles: { fontStyle: 'normal' } },
            { content: String(customer.name || 'Cash Sale') + '\n' + String(customer.address || ''), styles: { fontStyle: 'normal' } },
            {
                content: (settings?.company_address || 'Clonegogaile, Ballinamult, Co. Tipperary') +
                    '\nTel: ' + (settings?.company_phone || '(052) 915 6345') +
                    '\nEmail: ' + (settings?.company_email || 'info@condondairy.ie') +
                    '\nWeb: www.condondairy.ie',
                styles: { fontStyle: 'normal', halign: 'right' }
            }
        ]],
        theme: 'plain',
        margin: { left: LEFT, right: RIGHT },
        styles: { fontSize: 8, cellPadding: { top: 1, bottom: 1, left: 0, right: 2 } },
        headStyles: { fontSize: 8, textColor: [100, 100, 100], fontStyle: 'bold', cellPadding: { left: 0 } },
        columnStyles: {
            0: { cellWidth: colW },
            1: { cellWidth: colW, cellPadding: { left: 1 } },
            2: { cellWidth: colW, halign: 'right' }
        }
    });

    // @ts-expect-error
    return (doc.lastAutoTable.finalY as number) + 12;
};

// === INFO GRID: using autoTable for alignment ===
const addInfoGrid = (
    doc: jsPDF,
    data: { label: string; value: string }[],
    y: number
) => {
    autoTable(doc, {
        startY: y,
        head: [data.map(d => d.label)],
        body: [data.map(d => d.value)],
        theme: 'plain',
        margin: { left: LEFT, right: RIGHT },
        styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 0, right: 2 } },
        headStyles: { fontSize: 7, textColor: [100, 100, 100], fontStyle: 'bold', cellPadding: { left: 0, top: 2, bottom: 1 } },
        // Draw lines manually to match reference exactly if needed, but table handles basics
        didDrawPage: (dataArg) => {
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.4);
            doc.line(LEFT, dataArg.cursor!.y - 15, doc.internal.pageSize.width - RIGHT, dataArg.cursor!.y - 15); // top line
            doc.line(LEFT, dataArg.cursor!.y, doc.internal.pageSize.width - RIGHT, dataArg.cursor!.y); // bottom line
        }
    });

    // @ts-expect-error
    return (doc.lastAutoTable.finalY as number) + 10;
};

// === VAT ANALYSIS TABLE ===
const addVATAnalysis = (doc: jsPDF, vatRate: number, net: number, vat: number, y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('VAT Analysis', LEFT, y);

    autoTable(doc, {
        startY: y + 4,
        head: [['VAT Rate %', 'Net', 'VAT', 'Gross']],
        body: [[`${vatRate.toFixed(2)}%`, `€${net.toFixed(2)}`, `€${vat.toFixed(2)}`, `€${(net + vat).toFixed(2)}`]],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { left: LEFT, right: RIGHT },
        tableWidth: 90,
    });
    // @ts-expect-error
    return (doc.lastAutoTable.finalY as number) + 10;
};

// === BANK DETAILS ===
const addBankDetails = (doc: jsPDF, y: number, settings: Settings | null) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Bank Details', LEFT, y);

    doc.setFontSize(8);
    const rows = [
        ['Account Name:', settings?.account_name || 'Condon Dairy Agri Ltd'],
        ['Bank:', settings?.bank_name || 'AIB'],
        ['BIC/SWIFT:', settings?.bic || 'AIBK IE 2D'],
        ['IBAN:', settings?.iban || 'IE84 AIBK 9340 7031 9910 99'],
    ];
    let by = y + 5;
    rows.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, LEFT, by);
        doc.setFont('helvetica', 'normal');
        doc.text(value, LEFT + 28, by);
        by += 4.5;
    });
};

// === FOOTER ===
const addFooter = (doc: jsPDF) => {
    const totalPages = (doc.internal as any).getNumberOfPages();
    const pw = doc.internal.pageSize.width;
    const ph = doc.internal.pageSize.height;
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(
            `Page ${i} of ${totalPages}`,
            LEFT, ph - 8
        );
        doc.text(
            'All goods remain the property of the company until paid in full.',
            pw / 2, ph - 8,
            { align: 'center' }
        );
    }
};

// ============================================================
// STANDARD INVOICE GENERATOR
// ============================================================
export const generateInvoice = async (
    documentNumber: string,
    customer: Customer,
    items: (InvoiceItem | JobItem)[],
    vatRate: number,
    totalAmount: number,
    action: 'download' | 'preview' = 'download',
    paymentStatus: string = 'UNPAID',
    engineerName?: string
) => {
    const settings = await dataService.getSettings();
    const doc = new jsPDF();
    const safeName = customer.name.replace(/[^a-z0-9]/gi, '_');
    doc.setProperties({ title: `${safeName}-${documentNumber}` });

    let y = await addHeader(doc, 'Invoice', documentNumber, paymentStatus);
    y = addAddressSection(doc, customer, y, 'Invoice', settings);

    let days = 30;
    if (customer.payment_terms) {
        const match = customer.payment_terms.match(/\d+/);
        if (match) days = parseInt(match[0], 10);
    }
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);

    const infoData = [
        { label: 'Invoice Date', value: new Date().toLocaleDateString('en-GB') },
        { label: 'Ref. No.', value: String(documentNumber) },
        { label: 'Account Manager', value: String(settings?.contact_name && settings.contact_name.trim() !== "" ? settings.contact_name : (engineerName || 'Admin')) },
        { label: 'VAT No.', value: settings?.vat_reg_number || 'IE 8252470Q' },
        { label: 'Due Date', value: dueDate.toLocaleDateString('en-GB') },
        { label: 'Credit Terms', value: String(customer.payment_terms || '30 Days') },
    ];
    y = addInfoGrid(doc, infoData, y);

    const netAmount = totalAmount / (1 + vatRate / 100);
    const vatAmount = totalAmount - netAmount;

    autoTable(doc, {
        startY: y,
        head: [[
            { content: 'Description', styles: { halign: 'left' } },
            { content: 'Quantity', styles: { halign: 'center' } },
            { content: 'Price', styles: { halign: 'right' } },
            { content: 'Total', styles: { halign: 'right' } }
        ]],
        body: items.map(item => {
            const up = (item as any).unit_price ?? 0;
            const total = item.quantity * up;
            return [
                String(item.description),
                String(item.quantity),
                `€${up.toFixed(2)}`,
                `€${total.toFixed(2)}`,
            ];
        }),
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', cellPadding: { left: 0, top: 2, bottom: 2, right: 2 } },
        margin: { left: LEFT, right: RIGHT },
        columnStyles: {
            0: { cellPadding: { left: 0 } },
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' },
        },
    });

    // @ts-expect-error
    const tableBottom = doc.lastAutoTable.finalY as number;
    const pageWidth = doc.internal.pageSize.width;
    const totalsX = pageWidth - RIGHT - 60;

    // Separator line above totals
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(totalsX, tableBottom + 8, pageWidth - RIGHT, tableBottom + 8);

    // Totals rows
    y = tableBottom + 15;
    doc.setFontSize(9);
    const totals: [string, string][] = [
        ['Total Net', `€${netAmount.toFixed(2)}`],
        ['Total Discount', '€0.00'],
        ['Total VAT', `€${vatAmount.toFixed(2)}`],
        ['Total Gross', `€${totalAmount.toFixed(2)}`],
        ['Less Deposit', '€0.00'],
    ];
    totals.forEach(([label, val]) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(label, totalsX, y);
        doc.text(val, pageWidth - RIGHT, y, { align: 'right' });
        y += 6;
    });

    // Line + Total Payable
    doc.setDrawColor(180, 180, 180);
    doc.line(totalsX, y + 1, pageWidth - RIGHT, y + 1);
    y += 6;
    const totalPayableY = y;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('Total Payable', totalsX, totalPayableY);
    doc.text(`€${totalAmount.toFixed(2)}`, pageWidth - RIGHT, totalPayableY, { align: 'right' });

    // VAT Analysis on left at same y
    addVATAnalysis(doc, vatRate, netAmount, vatAmount, totalPayableY);

    // Bank Details near page bottom
    const bankY = Math.max(totalPayableY + 35, doc.internal.pageSize.height - 55);
    addBankDetails(doc, bankY, settings);
    addFooter(doc);

    return action === 'preview'
        ? (doc.output('bloburl') as unknown as string)
        : (doc.save(`${safeName}-${documentNumber}.pdf`) as unknown as void);
};

// ============================================================
// QUOTE GENERATOR
// ============================================================
export const generateQuote = async (
    quote: Quote,
    customer: Customer,
    items: QuoteItem[],
    action: 'download' | 'preview' = 'download'
) => {
    const settings = await dataService.getSettings();
    const doc = new jsPDF();
    const safeName = customer.name.replace(/[^a-z0-9]/gi, '_');
    doc.setProperties({ title: `${safeName}-${quote.quote_number}` });

    let y = await addHeader(doc, 'Quotation', String(quote.quote_number));
    y = addAddressSection(doc, customer, y, 'Quote', settings);

    const infoData = [
        { label: 'Quote Date', value: new Date(quote.date_issued).toLocaleDateString('en-GB') },
        { label: 'Ref. No.', value: String(quote.quote_number) },
        { label: 'Account Manager', value: String(settings?.contact_name && settings.contact_name.trim() !== "" ? settings.contact_name : 'Admin') },
        { label: 'VAT No.', value: settings?.vat_reg_number || 'IE 8252470Q' },
        { label: 'Valid Until', value: '30 Days' },
        { label: 'Terms', value: String(customer.payment_terms || 'On Receipt') },
    ];
    y = addInfoGrid(doc, infoData, y);

    autoTable(doc, {
        startY: y,
        head: [[
            { content: 'Description', styles: { halign: 'left' } },
            { content: 'Qty', styles: { halign: 'center' } },
            { content: 'Price', styles: { halign: 'right' } },
            { content: 'Total', styles: { halign: 'right' } }
        ]],
        body: items.map(i => [
            String(i.description),
            String(i.quantity),
            `€${i.unit_price.toFixed(2)}`,
            `€${(i.quantity * i.unit_price).toFixed(2)}`,
        ]),
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', cellPadding: { left: 0, top: 2, bottom: 2, right: 2 } },
        margin: { left: LEFT, right: RIGHT },
        columnStyles: {
            0: { cellPadding: { left: 0 } },
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' }
        },
    });

    // @ts-expect-error
    const tableBottom = doc.lastAutoTable.finalY as number;
    const pageWidth = doc.internal.pageSize.width;
    const totalsX = pageWidth - RIGHT - 60;

    // Separator line above totals
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(totalsX, tableBottom + 8, pageWidth - RIGHT, tableBottom + 8);

    // Totals rows
    y = tableBottom + 15;
    doc.setFontSize(9);

    const vatAmount = quote.vat_amount || (quote.total_amount - quote.subtotal);

    const totals: [string, string][] = [
        ['Total Net', `€${quote.subtotal.toFixed(2)}`],
        ['Total Discount', '€0.00'],
        ['Total VAT', `€${vatAmount.toFixed(2)}`],
        ['Total Gross', `€${quote.total_amount.toFixed(2)}`],
        ['Less Deposit', '€0.00'],
    ];

    totals.forEach(([label, val]) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(label, totalsX, y);
        doc.text(val, pageWidth - RIGHT, y, { align: 'right' });
        y += 6;
    });

    // Line + Total Payable
    doc.setDrawColor(180, 180, 180);
    doc.line(totalsX, y + 1, pageWidth - RIGHT, y + 1);
    y += 6;
    const totalPayableY = y;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('Quote Total', totalsX, totalPayableY);
    doc.text(`€${quote.total_amount.toFixed(2)}`, pageWidth - RIGHT, totalPayableY, { align: 'right' });

    // VAT Analysis on left at same y
    const vatRate = quote.vat_rate || 13.5;
    addVATAnalysis(doc, vatRate, quote.subtotal, vatAmount, totalPayableY);

    addBankDetails(doc, doc.internal.pageSize.height - 55, settings);
    addFooter(doc);

    return action === 'preview'
        ? (doc.output('bloburl') as unknown as string)
        : (doc.save(`${safeName}-${quote.quote_number}.pdf`) as unknown as void);
};

// ============================================================
// STATEMENT GENERATOR
// ============================================================
export const generateStatement = async (
    job: Job | null,
    items: JobItem[],
    customer: Customer,
    statement: Statement,
    action: 'download' | 'preview' = 'download'
) => {
    const settings = await dataService.getSettings();
    const doc = new jsPDF();
    const documentNumber = statement.statement_number ||
        (job?.job_number ? `STMT-${job.job_number}` : 'STMT-REF');
    const safeName = customer.name.replace(/[^a-z0-9]/gi, '_');
    doc.setProperties({ title: `${safeName}-${documentNumber}` });

    let y = await addHeader(doc, 'Statement', documentNumber);
    y = addAddressSection(doc, customer, y, 'Statement', settings);

    const infoData = [
        { label: 'Statement Date', value: new Date(statement.date_generated || new Date()).toLocaleDateString('en-GB') },
        { label: 'Ref. No.', value: String(statement.statement_number || job?.job_number || 'N/A') },
        { label: 'Account', value: String(settings?.contact_name || 'Admin') },
        { label: 'VAT No.', value: settings?.vat_reg_number || 'IE 8252470Q' },
        { label: 'Service', value: String(job?.service_type || 'General') },
        { label: 'Terms', value: 'On Receipt' },
    ];
    y = addInfoGrid(doc, infoData, y);

    autoTable(doc, {
        startY: y,
        head: [[
            { content: 'Description', styles: { halign: 'left' } },
            { content: 'Qty', styles: { halign: 'center' } },
            { content: 'Price', styles: { halign: 'right' } },
            { content: 'Total', styles: { halign: 'right' } }
        ]],
        body: items && items.length > 0 ? items.map(item => [
            String(item?.description || 'N/A'),
            String(item?.quantity || 1),
            `€${(item?.unit_price || 0).toFixed(2)}`,
            `€${(item?.total || item?.quantity * item?.unit_price || 0).toFixed(2)}`,
        ]) : [
            ['Monthly Services & Account Balance', '1', `€${(statement.total_amount || 0).toFixed(2)}`, `€${(statement.total_amount || 0).toFixed(2)}`]
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', cellPadding: { left: 0, top: 2, bottom: 2, right: 2 } },
        margin: { left: LEFT, right: RIGHT },
        columnStyles: {
            0: { cellPadding: { left: 0 } },
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' }
        },
    });

    const subtotal = statement.total_amount ||
        (items || []).reduce((s, i) => s + (i.total || i.quantity * i.unit_price || 0), 0);

    // Calculate VAT mathematically out of subtotal if not explicitly provided
    const vatRate = 13.5;
    const netAmount = subtotal / (1 + vatRate / 100);
    const vatAmount = subtotal - netAmount;

    // @ts-expect-error
    const tableBottom = doc.lastAutoTable.finalY as number;
    const pageWidth = doc.internal.pageSize.width;
    const totalsX = pageWidth - RIGHT - 60;

    // Separator line above totals
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(totalsX, tableBottom + 8, pageWidth - RIGHT, tableBottom + 8);

    // Totals rows
    y = tableBottom + 15;
    doc.setFontSize(9);

    const totals: [string, string][] = [
        ['Total Net', `€${netAmount.toFixed(2)}`],
        ['Total Discount', '€0.00'],
        ['Total VAT', `€${vatAmount.toFixed(2)}`],
        ['Total Gross', `€${subtotal.toFixed(2)}`],
        ['Less Deposit', '€0.00'],
    ];

    totals.forEach(([label, val]) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(label, totalsX, y);
        doc.text(val, pageWidth - RIGHT, y, { align: 'right' });
        y += 6;
    });

    // Line + Total Payable
    doc.setDrawColor(180, 180, 180);
    doc.line(totalsX, y + 1, pageWidth - RIGHT, y + 1);
    y += 6;
    const totalPayableY = y;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('Statement Total', totalsX, totalPayableY);
    doc.text(`€${subtotal.toFixed(2)}`, pageWidth - RIGHT, totalPayableY, { align: 'right' });

    // VAT Analysis on left at same y
    addVATAnalysis(doc, vatRate, netAmount, vatAmount, totalPayableY);

    addBankDetails(doc, doc.internal.pageSize.height - 55, settings);
    addFooter(doc);

    return action === 'preview'
        ? (doc.output('bloburl') as unknown as string)
        : (doc.save(`${safeName}-${documentNumber}.pdf`) as unknown as void);
};

// ============================================================
// QUICK (ONE-TIME) INVOICE GENERATOR
// ============================================================
export const generateOneTimeInvoice = async (
    data: any,
    items: any[],
    action: 'download' | 'preview' = 'download'
) => {
    const settings = await dataService.getSettings();
    const doc = new jsPDF();
    const { customerName, totalAmount, customerAddress } = data;
    const invNum = `INV-QUICK-${Math.floor(1000 + Math.random() * 9000)}`;
    doc.setProperties({ title: invNum });

    const mockCustomer: Customer = {
        id: 'guest',
        name: customerName,
        email: '',
        phone: '',
        address: customerAddress || '',
        created_at: new Date().toISOString(),
        account_balance: 0,
        payment_terms: 'On Receipt',
    };

    let y = await addHeader(doc, 'Tax Invoice', invNum, 'UNPAID');
    y = addAddressSection(doc, mockCustomer, y, 'Invoice', settings);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Default to 30 days for one-off

    const infoData = [
        { label: 'Date', value: new Date().toLocaleDateString('en-GB') },
        { label: 'Ref. No.', value: invNum },
        { label: 'Account', value: String(settings?.contact_name || 'Admin') },
        { label: 'VAT No.', value: settings?.vat_reg_number || 'IE 8252470Q' },
        { label: 'Due Date', value: dueDate.toLocaleDateString('en-GB') },
        { label: 'Terms', value: 'On Receipt' },
    ];
    y = addInfoGrid(doc, infoData, y);

    autoTable(doc, {
        startY: y,
        head: [[
            { content: 'Description', styles: { halign: 'left' } },
            { content: 'Qty', styles: { halign: 'center' } },
            { content: 'Price', styles: { halign: 'right' } },
            { content: 'Total', styles: { halign: 'right' } }
        ]],
        body: items.map(item => [
            String(item.description),
            String(item.quantity),
            `€${Number(item.unitPrice).toFixed(2)}`,
            `€${(item.quantity * item.unitPrice).toFixed(2)}`,
        ]),
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', cellPadding: { left: 0, top: 2, bottom: 2, right: 2 } },
        margin: { left: LEFT, right: RIGHT },
        columnStyles: {
            0: { cellPadding: { left: 0 } },
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' }
        },
    });

    // @ts-expect-error
    y = doc.lastAutoTable.finalY + 12;
    const pageWidth = doc.internal.pageSize.width;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total Payable:', pageWidth - RIGHT - 60, y);
    doc.text(`€${totalAmount.toFixed(2)}`, pageWidth - RIGHT, y, { align: 'right' });

    addBankDetails(doc, doc.internal.pageSize.height - 55, settings);
    addFooter(doc);

    const safeName = customerName.replace(/[^a-z0-9]/gi, '_');
    return action === 'preview'
        ? (doc.output('bloburl') as unknown as string)
        : (doc.save(`${safeName}-${invNum}.pdf`) as unknown as void);
};
