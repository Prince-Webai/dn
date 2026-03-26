import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, Job, JobItem, Quote, QuoteItem, InvoiceItem, Statement, Settings, WarrantyReport } from '../types';
import { ReportState } from '../types/report';
import { dataService } from '../services/dataService';

// === CONSTANTS ===
const LEFT = 15;   // left margin mm
const RIGHT = 15;  // right margin mm

// Load logo from public directory at PDF generation time
// Load logo and process for transparency (pure white to transparent)
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

            try {
                // Process image to make white background transparent
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    // If pixel is very close to white (R, G, B > 250), make it transparent
                    if (data[i] > 250 && data[i + 1] > 250 && data[i + 2] > 250) {
                        data[i + 3] = 0;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
            } catch (e) {
                console.warn('Could not process image for transparency (likely CORS)', e);
            }

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = '/logo_v5.jpg?v=' + Date.now();
    });
};

// === LOGO ===
const addLogo = async (doc: jsPDF) => {
    const logoW = 65; // Increased from 50
    const logoH = 22; // Scaled height
    const x = doc.internal.pageSize.width - RIGHT - logoW;
    try {
        const b64 = await loadLogoBase64();
        doc.addImage(b64, 'PNG', x, 30, logoW, logoH);
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
                content: (settings?.company_address || 'Clonegalla, Ballinamult, Co. Waterford') +
                    '\nTel: ' + (settings?.company_phone || '087 055 1672 / 087 259 0148') +
                    '\nEmail: ' + (settings?.company_email || 'office@condondairy.ie') +
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

    // @ts-expect-error - ts ignore legacy
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

    // @ts-expect-error - ts ignore legacy
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
    // @ts-expect-error - ts ignore legacy
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
        ['Account Name:', settings?.account_name || 'Tony Condon Agri Ltd'],
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

    // Filter items: parts are itemized, labor/service are summarized
    const partItems = items.filter(i => i.type === 'part');
    const serviceItems = items.filter(i => i.type !== 'part');
    const serviceTotal = serviceItems.reduce((acc, i) => acc + (i.total || (i.quantity * i.unit_price)), 0);

    const invoiceRows = [
        ...partItems.map(item => [
            String(item.description),
            String(item.quantity),
            `€${(item.unit_price || 0).toFixed(2)}`,
            `€${(item.total || (item.quantity * item.unit_price)).toFixed(2)}`
        ]),
        ...(serviceTotal > 0 ? [[
            serviceItems.length > 1 ? "Professional Service & Labor Charges" : serviceItems[0].description,
            "1",
            `€${serviceTotal.toFixed(2)}`,
            `€${serviceTotal.toFixed(2)}`
        ]] : [])
    ];

    autoTable(doc, {
        startY: y,
        head: [[
            { content: 'Description', styles: { halign: 'left' } },
            { content: 'Quantity', styles: { halign: 'center' } },
            { content: 'Price', styles: { halign: 'right' } },
            { content: 'Total', styles: { halign: 'right' } }
        ]],
        body: invoiceRows,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', cellPadding: { left: 0, top: 2, bottom: 2, right: 2 } },
        margin: { left: LEFT, right: RIGHT },
        columnStyles: {
            0: { cellPadding: { left: 0, top: 2, bottom: 2, right: 2 } },
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' },
        },
    });

    // @ts-expect-error - ts ignore legacy
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

    if (action === 'preview') {
        const blob = doc.output('blob');
        const filename = `${safeName}-${documentNumber}.pdf`;
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (win) win.focus();
        return { url: blobUrl, filename } as any;
    } else {
        doc.save(`${safeName}-${documentNumber}.pdf`);
        return null as any;
    }
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
            0: { cellPadding: { left: 0, top: 2, bottom: 2, right: 2 } },
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' }
        },
    });

    // @ts-expect-error - ts ignore legacy
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

    if (action === 'preview') {
        const blob = doc.output('blob');
        const filename = `${safeName}-${quote.quote_number}.pdf`;
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (win) win.focus();
        return { url: blobUrl, filename } as any;
    } else {
        doc.save(`${safeName}-${quote.quote_number}.pdf`);
        return null as any;
    }
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
            0: { cellPadding: { left: 0, top: 2, bottom: 2, right: 2 } },
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

    // @ts-expect-error - ts ignore legacy
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

    if (action === 'preview') {
        const blob = doc.output('blob');
        const filename = `${safeName}-${documentNumber}.pdf`;
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (win) win.focus();
        return { url: blobUrl, filename } as any;
    } else {
        doc.save(`${safeName}-${documentNumber}.pdf`);
        return null as any;
    }
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
        status: 'active'
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

    const netAmount = totalAmount / (1 + 13.5 / 100); // Using standard VAT rate for summary

    autoTable(doc, {
        startY: y,
        head: [[
            { content: 'Description', styles: { halign: 'left' } },
            { content: 'Qty', styles: { halign: 'center' } },
            { content: 'Price', styles: { halign: 'right' } },
            { content: 'Total', styles: { halign: 'right' } }
        ]],
        body: [[
            "Professional Services & Parts Supplied as per Statement",
            "1",
            `€${netAmount.toFixed(2)}`,
            `€${netAmount.toFixed(2)}`
        ]],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', cellPadding: { left: 0, top: 2, bottom: 2, right: 2 } },
        margin: { left: LEFT, right: RIGHT },
        columnStyles: {
            0: { cellPadding: { left: 0, top: 2, bottom: 2, right: 2 } },
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' }
        },
    });

    // @ts-expect-error - ts ignore legacy
    y = doc.lastAutoTable.finalY + 12;
    const pageWidth = doc.internal.pageSize.width;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total Payable:', pageWidth - RIGHT - 60, y);
    doc.text(`€${totalAmount.toFixed(2)}`, pageWidth - RIGHT, y, { align: 'right' });

    addBankDetails(doc, doc.internal.pageSize.height - 55, settings);
    addFooter(doc);

    const safeName = customerName.replace(/[^a-z0-9]/gi, '_');
    if (action === 'preview') {
        const blob = doc.output('blob');
        const filename = `${safeName}-Statement.pdf`;
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (win) win.focus();
        return { url: blobUrl, filename } as any;
    } else {
        doc.save(`${safeName}-${invNum}.pdf`);
        return null as any;
    }
};

// ============================================================
// JOB REPORT GENERATOR
// ============================================================
export const generateJobReport = async (
    job: Job,
    customer: Customer,
    items: JobItem[],
    action: 'download' | 'preview' = 'download'
) => {
    const settings = await dataService.getSettings();
    const doc = new jsPDF();
    const documentNumber = job.job_number || 'JOB-000';
    const safeName = customer?.name?.replace(/[^a-z0-9]/gi, '_') || 'Customer';
    doc.setProperties({ title: `${safeName}-${documentNumber}` });

    let y = await addHeader(doc, 'Job Report', String(documentNumber), job.status);
    y = addAddressSection(doc, customer || { id: 'guest', name: 'N/A', created_at: '', account_balance: 0 }, y, 'Job Report', settings);

    const infoData = [
        { label: 'Date Scheduled', value: job.date_scheduled ? new Date(job.date_scheduled).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB') },
        { label: 'Job No.', value: String(documentNumber) },
        { label: 'Engineer', value: String(job.engineer_name || 'Unassigned') },
        { label: 'VAT No.', value: settings?.vat_reg_number || 'IE 8252470Q' },
        { label: 'Service', value: String(job.service_type || 'General') },
        { label: 'System Type', value: String(job.service_type || 'Milking Machine') },
    ];
    y = addInfoGrid(doc, infoData, y);

    // Notes section
    if (job.notes) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Issue Description:', LEFT, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const splitNotes = doc.splitTextToSize(job.notes, doc.internal.pageSize.width - LEFT - RIGHT);
        doc.text(splitNotes, LEFT, y + 5);
        y += 5 + (splitNotes.length * 4) + 5;
    }

    autoTable(doc, {
        startY: y,
        head: [[
            { content: 'Description', styles: { halign: 'left' } },
            { content: 'Type', styles: { halign: 'center' } },
            { content: 'Qty', styles: { halign: 'center' } },
        ]],
        body: items && items.length > 0 ? items.map(item => [
            String(item.description),
            String(item.type).toUpperCase(),
            String(item.quantity),
        ]) : [
            ['No parts or labor added yet', '-', '-']
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', cellPadding: { left: 0, top: 2, bottom: 2, right: 2 } },
        margin: { left: LEFT, right: RIGHT },
        columnStyles: {
            0: { cellPadding: { left: 0, top: 2, bottom: 2, right: 2 } },
            1: { halign: 'center' },
            2: { halign: 'center' },
        },
    });

    // @ts-expect-error - ts ignore legacy
    const tableBottom = doc.lastAutoTable.finalY as number;

    // Signatures
    const finalY = Math.max(tableBottom + 20, 200);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Engineer Signature:', LEFT, finalY);
    doc.line(LEFT, finalY + 15, LEFT + 60, finalY + 15);

    doc.text('Customer Signature:', 120, finalY);
    doc.line(120, finalY + 15, 120 + 60, finalY + 15);

    addBankDetails(doc, doc.internal.pageSize.height - 55, settings);
    addFooter(doc);

    if (action === 'preview') {
        const blob = doc.output('blob');
        const filename = `${safeName}-${documentNumber}_Report.pdf`;
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (win) win.focus();
        return { url: blobUrl, filename } as any;
    } else {
        doc.save(`${safeName}-${documentNumber}_Report.pdf`);
        return null as any;
    }
};

// ============================================================
// PREMIUM REPORT HELPERS (For Service & Warranty)
// ============================================================
const addReportSectionHeader = (doc: jsPDF, title: string, y: number) => {
    doc.setFillColor(0, 56, 117); // DeLaval Blue
    doc.rect(LEFT, y, doc.internal.pageSize.width - LEFT - RIGHT, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), LEFT + 3, y + 5);
    return y + 10;
};

const addReportFieldGrid = (doc: jsPDF, data: { label: string; value: string }[], y: number) => {
    autoTable(doc, {
        startY: y,
        body: [
            data.slice(0, 2).map(d => d.value),
        ],
        head: [
            data.slice(0, 2).map(d => d.label)
        ],
        theme: 'plain',
        margin: { left: LEFT, right: RIGHT },
        styles: { fontSize: 9, cellPadding: { top: 1, bottom: 4, left: 3, right: 3 }, fontStyle: 'bold' },
        headStyles: { fontSize: 7, textColor: [100, 100, 100], fontStyle: 'bold', cellPadding: { left: 3, top: 4, bottom: 0 } },
        columnStyles: {
            0: { cellWidth: (doc.internal.pageSize.width - LEFT - RIGHT) / 2 },
            1: { cellWidth: (doc.internal.pageSize.width - LEFT - RIGHT) / 2 }
        },
        didDrawCell: (data) => {
            if (data.section === 'body') {
                doc.setDrawColor(200, 200, 200);
                doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width - 5, data.cell.y + data.cell.height);
            }
        }
    });
    // @ts-expect-error - ts ignore legacy
    return (doc.lastAutoTable.finalY as number) + 5;
};

// ============================================================
// SERVICE REPORT GENERATOR (Milking Machine / Solar)
// ============================================================
export const generateServiceReport = async (
    report: ReportState,
    customer: Customer,
    job?: Job,
    action: 'download' | 'preview' = 'download'
) => {
    const doc = new jsPDF();
    const safeName = customer?.name?.replace(/[^a-z0-9]/gi, '_') || 'Customer';
    const title = report.plantType?.toLowerCase().includes('solar') ? 'SOLAR PV COMMISSIONING REPORT' : 'MILKING MACHINE TEST REPORT';
    doc.setProperties({ title: `${safeName}-${title}` });

    // Custom Header
    doc.setFillColor(240, 244, 255);
    doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
    doc.setDrawColor(0, 56, 117);
    doc.setLineWidth(1.5);
    doc.line(0, 40, doc.internal.pageSize.width, 40);

    doc.setFont('helvetica', 'black');
    doc.setFontSize(20);
    doc.setTextColor(0, 56, 117);
    doc.text(title, LEFT, 22);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Electrical & Performance Stability Test — Professional Record', LEFT, 28);

    // Add Logo
    await addLogo(doc);
    if (job) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Job #${job.job_number}`, doc.internal.pageSize.width - RIGHT, 38, { align: 'right' });
    }

    let y = 50;

    // A. Header Info
    y = addReportSectionHeader(doc, 'A. Header Information', y);
    y = addReportFieldGrid(doc, [
        { label: 'CUSTOMER / SITE NAME', value: customer?.name || '---' },
        { label: 'DATE OF TEST', value: report.date || new Date().toLocaleDateString() }
    ], y);
    y = addReportFieldGrid(doc, [
        { label: 'ADDRESS', value: customer?.address || '---' },
        { label: 'SYSTEM MAKE', value: report.machineMake || '---' }
    ], y);
    y = addReportFieldGrid(doc, [
        { label: 'ENGINEER NAME', value: report.tester || 'Tony Condon' },
        { label: 'SYSTEM TYPE', value: report.plantType || '---' }
    ], y);

    // 1. Installation
    y = addReportSectionHeader(doc, '1. Installation', y);
    const inst = report.installation;
    const instRows = [
        ['Main Airline', inst.mainAirline.bore, inst.mainAirline.materials, inst.mainAirline.slope, inst.mainAirline.size, inst.mainAirline.location],
        ['Pulsator Airlines', inst.pulsatorAirlines.bore, inst.pulsatorAirlines.materials, inst.pulsatorAirlines.slope, inst.pulsatorAirlines.size, inst.pulsatorAirlines.location],
        ['Milkline', inst.milkline.bore, inst.milkline.materials, inst.milkline.slope || inst.milkline.height, inst.milkline.size, inst.milkline.location],
        ['Washline', inst.washline.bore, inst.washline.materials, inst.washline.slope, inst.washline.size, inst.washline.location],
        ['Milk Lift', inst.milkLift.bore, inst.milkLift.materials, inst.milkLift.height, '---', '---'],
    ];

    autoTable(doc, {
        startY: y,
        head: [['Component', 'Bore', 'Materials', 'Height/Slope', 'Size', 'Location']],
        body: instRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [232, 237, 245], textColor: [0, 56, 117], fontStyle: 'bold' },
        margin: { left: LEFT, right: RIGHT },
    });
    // @ts-expect-error - ts ignore legacy
    y = (doc.lastAutoTable.finalY as number) + 10;

    // 2. Maintenance
    if (y > 240) { doc.addPage(); y = 20; }
    y = addReportSectionHeader(doc, '2. Maintenance', y);
    const maint = report.maintenance;
    autoTable(doc, {
        startY: y,
        body: [
            ['V. Pump Oil', maint.vPumpOil, 'V. Pump Belts', maint.vPumpBelts, 'M. Pump Belts', maint.mPumpBelts],
            ['Milk Pump Diaphragm', maint.milkPumpDiaphragm, 'Liners', maint.liners, 'Milk Tubes', maint.milkTubes],
            ['Pulse Tubes', maint.pulseTubes, 'Relay Diaphragms', maint.relayDiaphragms, 'Pulsators Clean', maint.pulsatorsClean],
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [248, 250, 252] },
            2: { fontStyle: 'bold', fillColor: [248, 250, 252] },
            4: { fontStyle: 'bold', fillColor: [248, 250, 252] },
        },
        margin: { left: LEFT, right: RIGHT },
    });
    // @ts-expect-error - ts ignore legacy
    y = (doc.lastAutoTable.finalY as number) + 10;

    // 3. Air Flow
    if (y > 200) { doc.addPage(); y = 20; }
    y = addReportSectionHeader(doc, '3. Air Flow & Vacuum Regulator Tests', y);
    const af = report.airFlow;
    const afRows = [
        ['1', 'Operating Vacuum', af.t1_operatingVacuum, 'Rec. Vacuum', af.t1_recommended],
        ['2', 'Pump Capacity', `${af.t2_pumpCapacity} @ ${af.t2_rpm}`, 'Req. Capacity', af.t2_requiredCapacity],
        ['3', 'AFM near Reg', af.t3_afmAtTestPoint, 'Pipeline Leak', af.t3_airPipelineLeakage],
        ['4', 'Add System', af.t4_addMilkingSystem, 'System Leak', af.t4_systemLeakage],
        ['5', 'Open Air Claw', af.t5_openAirAdmission, 'Claw Admission', af.t5_clawAdmission],
        ['6', 'Add Pulsators', af.t6_addPulsators, 'Pulsation Use', af.t6_pulsationUse],
        ['7', 'Drop Vac 2kPa', af.t7_dropVacuum2kPa, 'Reg. Leakage', af.t7_regulatorLeakage],
        ['8', 'Add Regulator', af.t8_addRegulator, 'Req. Reserve', af.t8_requiredReserve],
    ];
    autoTable(doc, {
        startY: y,
        head: [['No.', 'Test Description', 'Reading', 'Derived', 'Value']],
        body: afRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [232, 237, 245], textColor: [0, 56, 117], fontStyle: 'bold' },
        columnStyles: { 0: { halign: 'center', fontStyle: 'bold' } },
        margin: { left: LEFT, right: RIGHT },
    });
    // @ts-expect-error - ts ignore legacy
    y = (doc.lastAutoTable.finalY as number) + 10;

    // Footer
    addFooter(doc);

    // Save/Download
    if (action === 'preview') {
        const blob = doc.output('blob');
        const filename = `${safeName}-${title.replace(/\s+/g, '_')}.pdf`;
        const blobUrl = URL.createObjectURL(blob);
        
        // Open preview in new tab
        const win = window.open(blobUrl, '_blank');
        if (win) {
            win.focus();
        } else {
            console.error('Popup blocked. Please allow popups for this site.');
            alert('Preview blocked by browser. Please allow popups.');
        }
        return { url: blobUrl, filename } as any;
    } else {
        doc.save(`${safeName}-${title.replace(/\s+/g, '_')}.pdf`);
        return null as any;
    }
};

// ============================================================
// WARRANTY REPORT GENERATOR
// ============================================================
export const generateWarrantyReport = async (
    report: WarrantyReport,
    customer: Customer,
    action: 'download' | 'preview' = 'download'
) => {
    if (!report || !report.form_type) {
        console.error('Missing report or form_type:', report);
        alert('Error: Missing report type data. Cannot generate PDF.');
        return;
    }

    const doc = new jsPDF();
    const documentNumber = report.serial_number || 'WNTY-000';
    const safeName = customer?.name?.replace(/[^a-z0-9]/gi, '_') || 'Customer';
    doc.setProperties({ title: `${safeName}-${report.form_type}` });

    // Premium Header
    doc.setFillColor(240, 244, 255);
    doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
    doc.setDrawColor(0, 56, 117);
    doc.setLineWidth(1.5);
    doc.line(0, 40, doc.internal.pageSize.width, 40);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(0, 56, 117);
    doc.text(report.form_type.toUpperCase(), LEFT, 22);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Official Digital Installation & Warranty Record', LEFT, 28);

    // Add Logo
    await addLogo(doc);

    let y = 50;

    // A. Client Information
    y = addReportSectionHeader(doc, 'Client Information', y);
    y = addReportFieldGrid(doc, [
        { label: 'CLIENT NAME', value: customer?.name || '---' },
        { label: 'SERIAL NUMBER', value: documentNumber }
    ], y);
    y = addReportFieldGrid(doc, [
        { label: 'DELIVERY ADDRESS', value: customer?.address || '---' },
        { label: 'INSTALL DATE', value: report.install_date || '---' }
    ], y);

    const isInstallCert = report.form_type === 'Installation Certificate';
    const data = report.report_data || {};

    // B. Specifications
    y = addReportSectionHeader(doc, isInstallCert ? 'Installation Specifications' : 'Commissioning Details', y);
    
    const bodyData = isInstallCert ? [
        ['Type of Equipment', data.equipment_type || 'N/A'],
        ['ETCI Electrical Cert', data.etci_cert || 'N/A'],
        ['Supplementary Ag Cert', data.supp_ag_cert || 'N/A'],
        ['Lead Installer', data.installer_name || 'Tony Condon'],
        ['Installer Address', data.installer_address || 'CDS, Ballinamult'],
    ] : [
        ['Equipment Details', data.equipment_details || 'N/A'],
        ['Commissioning Date', data.test_date || 'N/A'],
        ['Declaration By', data.declaration_name || 'Tony Condon'],
        ['Company Name', data.install_company || 'Condon Dairy Services'],
        ['Company Location', data.install_company_address || 'Ballinamult, Co. Waterford'],
    ];

    autoTable(doc, {
        startY: y,
        body: bodyData,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50, textColor: [0, 56, 117] },
        },
        margin: { left: LEFT, right: RIGHT },
    });

    // @ts-expect-error - ts ignore legacy
    y = (doc.lastAutoTable.finalY as number) + 30;

    // C. Verification & Signatures
    if (y > 240) { doc.addPage(); y = 20; }
    
    doc.setDrawColor(200, 200, 200);
    doc.line(LEFT, y, doc.internal.pageSize.width - RIGHT, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Authorized Signature:', LEFT, y);
    doc.line(LEFT, y + 15, LEFT + 70, y + 15);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Installer Representative', LEFT, y + 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CDS Official Stamp:', 120, y);
    doc.setDrawColor(0, 56, 117);
    doc.setLineWidth(0.5);
    doc.rect(120, y + 2, 45, 22);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('VERIFICATION SECURED', 142.5, y + 14, { align: 'center' });

    addFooter(doc);

    if (action === 'preview') {
        const blob = doc.output('blob');
        const filename = `${safeName}-${report.form_type.replace(/\s+/g, '_')}.pdf`;
        const blobUrl = URL.createObjectURL(blob);
        
        // Open preview in new tab
        const win = window.open(blobUrl, '_blank');
        if (win) {
            win.focus();
        } else {
            console.error('Popup blocked. Please allow popups for this site.');
            alert('Preview blocked by browser. Please allow popups.');
        }
        return { url: blobUrl, filename } as any;
    } else {
        doc.save(`${safeName}-${report.form_type.replace(/\s+/g, '_')}.pdf`);
        return null as any;
    }
};
