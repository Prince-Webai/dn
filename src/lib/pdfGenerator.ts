
import jsPDF from 'jspdf';
import { Customer, Job, JobItem, Quote, QuoteItem } from '../types';

export const generateStatement = (job: Job, items: JobItem[], customer: Customer, action: 'download' | 'preview' = 'download') => {
    const doc = new jsPDF();

    // ... (rest of function remains creating the doc)

    // Header
    doc.setFontSize(20);
    doc.setTextColor(0, 81, 165); // DeLaval Blue
    doc.text('Condon Dairy Services', 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Dairy Farm Equipment & Maintenance', 20, 26);

    // Statement Details
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('STATEMENT OF WORK', 140, 20);

    doc.setFontSize(10);
    doc.text(`Statement #: STMT-${new Date().getFullYear()}-${job.job_number}`, 140, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 36);
    doc.text(`Job Ref: #${job.job_number}`, 140, 42);

    // Customer Details
    doc.setFontSize(12);
    doc.text('Bill To:', 20, 50);
    doc.setFontSize(10);
    doc.text(customer.name, 20, 56);
    if (customer.address) doc.text(customer.address, 20, 62);
    if (customer.email) doc.text(customer.email, 20, 68);

    // Items Table Header
    let y = 85;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y - 5, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 25, y);
    doc.text('Type', 100, y);
    doc.text('Qty', 130, y);
    doc.text('Price', 150, y);
    doc.text('Total', 175, y);

    // Items List
    y += 10;
    doc.setFont('helvetica', 'normal');

    let subtotal = 0;

    items.forEach((item) => {
        doc.text(item.description, 25, y);
        doc.text(item.type, 100, y);
        doc.text(item.quantity.toString(), 130, y);
        doc.text(`€${item.unit_price.toFixed(2)}`, 150, y);
        doc.text(`€${item.total.toFixed(2)}`, 175, y);
        subtotal += item.total;
        y += 8;
    });

    // Totals
    y += 10;
    doc.line(20, y, 190, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Total Value:', 140, y);
    doc.text(`€${subtotal.toFixed(2)}`, 175, y);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('This is a detailed statement of work performed. Not a tax invoice.', 20, 280);

    if (action === 'preview') {
        return doc.output('datauristring');
    } else {
        doc.save(`Statement-${job.job_number}.pdf`);
    }
};

export const generateInvoice = (
    job: Job,
    customer: Customer,
    description: string,
    vatRate: number,
    totalAmount: number,
    action: 'download' | 'preview' = 'download'
) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 81, 165);
    doc.text('Condon Dairy Services', 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('123 Dairy Road, Cork', 20, 28);
    doc.text('VAT Reg: IE 12345678L', 20, 33);

    // Title
    doc.setFontSize(24);
    doc.setTextColor(0);
    doc.text('INVOICE', 140, 25);

    doc.setFontSize(10);
    doc.text(`Invoice #: INV-${new Date().getFullYear()}-${job.job_number}`, 140, 35);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 40);

    // Customer
    doc.setFontSize(12);
    doc.text('Invoice To:', 20, 50);
    doc.setFontSize(10);
    doc.text(customer.name, 20, 56);
    if (customer.address) doc.text(customer.address, 20, 62);

    // Single Line Item
    let y = 90;
    doc.setFillColor(0, 81, 165); // Blue Header
    doc.rect(20, y - 6, 170, 10, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 25, y);
    doc.text('Amount', 170, y);

    y += 15;
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(description, 25, y);

    const netAmount = totalAmount / (1 + vatRate / 100);
    const vatAmount = totalAmount - netAmount;

    doc.text(`€${netAmount.toFixed(2)}`, 170, y);

    // Totals Section
    y = 150;
    const xLabel = 130;
    const xValue = 170;

    doc.line(120, y, 190, y);
    y += 10;

    doc.text('Subtotal (Net):', xLabel, y);
    doc.text(`€${netAmount.toFixed(2)}`, xValue, y);

    y += 8;
    doc.text(`VAT @ ${vatRate}%:`, xLabel, y);
    doc.text(`€${vatAmount.toFixed(2)}`, xValue, y);

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TOTAL:', xLabel, y);
    doc.text(`€${totalAmount.toFixed(2)}`, xValue, y);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for your business. Payment due within 30 days.', 20, 270);
    doc.text('Bank Details: IBAN IE98 AIBK 9312 4512 8512 33', 20, 275);

    if (action === 'preview') {
        return doc.output('datauristring');
    } else {
        doc.save(`Invoice-${job.job_number}.pdf`);
    }
};

export const generateOneTimeInvoice = (
    data: {
        customerName: string;
        email: string;
        phone: string;
        date: string;
        description: string;
        labourHours: number;
        labourRate: number;
        partsCost: number;
        additional: number;
    },
    action: 'download' | 'preview' = 'download'
) => {
    const doc = new jsPDF();
    const { customerName, email, phone, date, description, labourHours, labourRate, partsCost, additional } = data;

    const labourTotal = labourHours * labourRate;
    const total = labourTotal + partsCost + additional;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`;

    // DeLaval Blue Header
    doc.setFillColor(0, 81, 165);
    doc.rect(0, 0, 210, 40, 'F');

    // Company Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Condon Dairy Services', 20, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Powered by DeLaval Technology', 20, 28);

    // Invoice Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 150, 20);

    // Invoice Number and Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${invoiceNumber}`, 150, 28);
    doc.text(`Date: ${date}`, 150, 34);

    // Customer Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, 55);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(customerName, 20, 62);
    if (email) doc.text(email, 20, 68);
    if (phone) doc.text(phone, 20, 74);

    // Description
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Description:', 20, 90);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitDescription = doc.splitTextToSize(description, 170);
    doc.text(splitDescription, 20, 97);

    // Line Items Table
    let yPos = 120;

    // Table Header
    doc.setFillColor(230, 240, 255);
    doc.rect(20, yPos, 170, 10, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Item', 25, yPos + 7);
    doc.text('Quantity', 100, yPos + 7);
    doc.text('Rate', 130, yPos + 7);
    doc.text('Amount', 160, yPos + 7);

    yPos += 10;

    // Labour
    if (labourHours > 0) {
        doc.setFont('helvetica', 'normal');
        doc.text('Labour', 25, yPos + 7);
        doc.text(`${labourHours} hrs`, 100, yPos + 7);
        doc.text(`€${labourRate.toFixed(2)}`, 130, yPos + 7);
        doc.text(`€${labourTotal.toFixed(2)}`, 160, yPos + 7);
        yPos += 10;
    }

    // Parts
    if (partsCost > 0) {
        doc.text('Parts & Materials', 25, yPos + 7);
        doc.text('-', 100, yPos + 7);
        doc.text('-', 130, yPos + 7);
        doc.text(`€${partsCost.toFixed(2)}`, 160, yPos + 7);
        yPos += 10;
    }

    // Additional
    if (additional > 0) {
        doc.text('Additional Charges', 25, yPos + 7);
        doc.text('-', 100, yPos + 7);
        doc.text('-', 130, yPos + 7);
        doc.text(`€${additional.toFixed(2)}`, 160, yPos + 7);
        yPos += 10;
    }

    // Total Line
    yPos += 5;
    doc.setLineWidth(0.5);
    doc.line(130, yPos, 190, yPos);

    yPos += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 130, yPos);
    doc.text(`€${total.toFixed(2)}`, 160, yPos);

    // Payment Terms
    yPos += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Terms:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text('Payment due within 30 days', 20, yPos + 7);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your business!', 105, 280, { align: 'center' });
    doc.text('Condon Dairy Services - County Cork, Ireland', 105, 285, { align: 'center' });

    if (action === 'preview') {
        return doc.output('datauristring');
    } else {
        doc.save(`${invoiceNumber}_${customerName.replace(/\s+/g, '_')}.pdf`);
    }
};

export const generateQuote = (
    quote: Quote,
    customer: Customer,
    items: QuoteItem[],
    action: 'download' | 'preview' = 'download'
) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 81, 165);
    doc.text('Condon Dairy Services', 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('123 Dairy Road, Cork', 20, 28);
    doc.text('VAT Reg: IE 12345678L', 20, 33);

    // Title
    doc.setFontSize(24);
    doc.setTextColor(0);
    doc.text('QUOTE', 140, 25);

    doc.setFontSize(10);
    doc.text(`Quote #: ${quote.quote_number}`, 140, 35);
    doc.text(`Date: ${new Date(quote.date_issued).toLocaleDateString()}`, 140, 40);
    doc.text(`Valid Until: ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '30 Days'}`, 140, 45);

    // Customer
    doc.setFontSize(12);
    doc.text('Quote For:', 20, 50);
    doc.setFontSize(10);
    doc.text(customer.name, 20, 56);
    if (customer.address) doc.text(customer.address, 20, 62);

    // Items Header
    let y = 85;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y - 5, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 25, y);
    doc.text('Qty', 130, y);
    doc.text('Price', 150, y);
    doc.text('Total', 175, y);

    y += 10;
    doc.setFont('helvetica', 'normal');

    items.forEach((item) => {
        doc.text(item.description, 25, y);
        doc.text(item.quantity.toString(), 130, y);
        doc.text(`€${item.unit_price.toFixed(2)}`, 150, y);
        doc.text(`€${item.total.toFixed(2)}`, 175, y);
        y += 8;
    });

    // Totals
    y += 10;
    doc.line(20, y, 190, y);
    y += 10;

    const xLabel = 130;
    const xValue = 170;

    doc.text('Subtotal:', xLabel, y);
    doc.text(`€${quote.subtotal.toFixed(2)}`, xValue, y);
    y += 8;

    doc.text(`VAT @ ${quote.vat_rate || 13.5}%:`, xLabel, y);
    doc.text(`€${quote.vat_amount.toFixed(2)}`, xValue, y);
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TOTAL:', xLabel, y);
    doc.text(`€${quote.total_amount.toFixed(2)}`, xValue, y);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'normal');
    const footerY = 270;
    doc.text('This quote is valid for 30 days from the date of issue.', 20, footerY);
    doc.text('Subject to Condon Dairy Services Terms & Conditions.', 20, footerY + 5);

    if (action === 'preview') {
        return doc.output('datauristring');
    } else {
        doc.save(`Quote-${quote.quote_number}.pdf`);
    }
};
