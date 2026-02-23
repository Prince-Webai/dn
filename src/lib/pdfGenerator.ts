
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, Job, JobItem, Quote, QuoteItem } from '../types';

// Helper: Add Professional Header & Branding
const addHeader = (doc: jsPDF, title: string, subTitle: string, status?: string) => {
    const pageWidth = doc.internal.pageSize.width;

    // DeLaval Blue Header Bar
    doc.setFillColor(0, 56, 117); // DeLaval Dark Blue
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Branding text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Condon Dairy Services', 20, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Professional Dairy Solutions & Dairy Equipment Maintenance', 20, 28);
    doc.text('Condon Dairy Services, Cork, Ireland', 20, 34);

    // Document Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth - 20, 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(subTitle, pageWidth - 20, 30, { align: 'right' });

    // Status Banner (inspired by Clonmel)
    if (status) {
        const statusColor = status.toUpperCase() === 'PAID' ? [34, 197, 94] : [255, 140, 0]; // Green vs Orange
        doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.triangle(0, 0, 45, 0, 0, 45, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(status.toUpperCase(), 10, 20, { angle: -45 });
    }

    return 55; // Next Y position
};

// Helper: Add Footer
const addFooter = (doc: jsPDF, customText?: string) => {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    doc.setDrawColor(230, 230, 230);
    doc.line(20, pageHeight - 40, pageWidth - 20, pageHeight - 40);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'bold');
    doc.text('Bank Details:', 20, pageHeight - 32);
    doc.setFont('helvetica', 'normal');
    doc.text('IBAN: IE98 AIBK 9312 4512 8512 33 | Swift/BIC: AIBKIE2D', 20, pageHeight - 27);

    if (customText) {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(customText, 20, pageHeight - 15);
    }

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Printed: ${new Date().toLocaleDateString('en-GB')} | Page 1 of 1`, pageWidth - 20, pageHeight - 15, { align: 'right' });
};

export const generateStatement = (job: Job, items: JobItem[], customer: Customer, action: 'download' | 'preview' = 'download') => {
    const doc = new jsPDF();
    const title = 'STATEMENT OF WORK';
    const subTitle = `STMT-${new Date().getFullYear()}-${job.job_number}`;

    let y = addHeader(doc, title, subTitle);

    // Customer Info
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(customer.name, 20, y + 6);
    if (customer.address) doc.text(customer.address, 20, y + 12);
    if (customer.email) doc.text(customer.email, 20, y + 18);

    doc.setFont('helvetica', 'bold');
    doc.text('JOB REFERENCE:', 140, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`#${job.job_number} - ${job.service_type}`, 140, y + 6);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 140, y + 12);

    y += 30;

    autoTable(doc, {
        startY: y,
        head: [['Description', 'Type', 'Qty', 'Price', 'Total']],
        body: items.map(item => [
            item.description,
            item.type.charAt(0).toUpperCase() + item.type.slice(1),
            item.quantity,
            `€${item.unit_price.toFixed(2)}`,
            `€${item.total.toFixed(2)}`
        ]),
        headStyles: { fillColor: [0, 81, 165], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            2: { halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'right' }
        }
    });

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL VALUE:', 140, y);
    doc.text(`€${subtotal.toFixed(2)}`, 190, y, { align: 'right' });

    addFooter(doc, 'Notice: This is a detailed work record for your reference. This document is not a tax invoice.');

    return action === 'preview' ? doc.output('datauristring') : doc.save(`Statement-${job.job_number}.pdf`);
};

export const generateInvoice = (
    job: Job,
    customer: Customer,
    description: string,
    vatRate: number,
    totalAmount: number,
    action: 'download' | 'preview' = 'download',
    paymentStatus: string = 'UNPAID'
) => {
    const doc = new jsPDF();
    const invNumber = `INV-${new Date().getFullYear()}-${job.job_number}`;
    let y = addHeader(doc, 'TAX INVOICE', invNumber, paymentStatus);

    // Customer Info
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE TO:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(customer.name, 20, y + 6);
    if (customer.address) doc.text(customer.address, 20, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE DETAILS:', 140, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date Issued: ${new Date().toLocaleDateString('en-GB')}`, 140, y + 6);
    doc.text(`VAT No: IE 12345678L`, 140, y + 12);

    y += 30;

    const netAmount = totalAmount / (1 + vatRate / 100);
    const vatAmount = totalAmount - netAmount;

    autoTable(doc, {
        startY: y,
        head: [['Description', 'Net Amount', 'VAT Rate', 'Total']],
        body: [[
            description,
            `€${netAmount.toFixed(2)}`,
            `${vatRate}%`,
            `€${totalAmount.toFixed(2)}`
        ]],
        headStyles: { fillColor: [0, 81, 165], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'center' },
            3: { halign: 'right' }
        }
    });

    // @ts-ignore
    y = doc.lastAutoTable.finalY + 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Subtotal (Net):', 140, y);
    doc.text(`€${netAmount.toFixed(2)}`, 190, y, { align: 'right' });

    y += 7;
    doc.text(`VAT @ ${vatRate}%:`, 140, y);
    doc.text(`€${vatAmount.toFixed(2)}`, 190, y, { align: 'right' });

    y += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 140, y);
    doc.text(`€${totalAmount.toFixed(2)}`, 190, y, { align: 'right' });

    addFooter(doc, 'Thank you for your business. Payment is strictly due within 30 days of invoice date.');

    return action === 'preview' ? doc.output('datauristring') : doc.save(`Invoice-${job.job_number}.pdf`);
};

export const generateQuote = (
    quote: Quote,
    customer: Customer,
    items: QuoteItem[],
    action: 'download' | 'preview' = 'download'
) => {
    const doc = new jsPDF();
    let y = addHeader(doc, 'QUOTATION', quote.quote_number);

    // Customer Info
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTE FOR:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(customer.name, 20, y + 6);
    if (customer.address) doc.text(customer.address, 20, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.text('QUOTE DETAILS:', 140, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date Issued: ${new Date(quote.date_issued).toLocaleDateString('en-GB')}`, 140, y + 6);
    doc.text(`Valid Until: ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('en-GB') : '30 Days'}`, 140, y + 12);

    y += 30;

    autoTable(doc, {
        startY: y,
        head: [['Description', 'Quantity', 'Price', 'Total']],
        body: items.map(i => [i.description, i.quantity, `€${i.unit_price.toFixed(2)}`, `€${i.total.toFixed(2)}`]),
        headStyles: { fillColor: [0, 81, 165], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' }
        }
    });

    // @ts-ignore
    y = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const xLabel = 140;
    const xValue = 190;

    doc.text('Subtotal:', xLabel, y);
    doc.text(`€${quote.subtotal.toFixed(2)}`, xValue, y, { align: 'right' });
    y += 7;

    doc.text(`VAT @ ${quote.vat_rate || 13.5}%:`, xLabel, y);
    doc.text(`€${quote.vat_amount.toFixed(2)}`, xValue, y, { align: 'right' });
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TOTAL:', xLabel, y);
    doc.text(`€${quote.total_amount.toFixed(2)}`, xValue, y, { align: 'right' });

    addFooter(doc, 'This quotation is subject to Condon Dairy Services terms and conditions and is valid for 30 days.');

    return action === 'preview' ? doc.output('datauristring') : doc.save(`Quote-${quote.quote_number}.pdf`);
};

export const generateOneTimeInvoice = (
    data: any,
    action: 'download' | 'preview' = 'download'
) => {
    const doc = new jsPDF();
    const { customerName, description, labourTotal, partsCost, additional, total, date } = data;
    const invNum = `INV-QUICK-${Math.floor(1000 + Math.random() * 9000)}`;

    let y = addHeader(doc, 'TAX INVOICE', invNum, 'UNPAID');

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE TO:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(customerName, 20, y + 6);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE DETAILS:', 140, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${date || new Date().toLocaleDateString('en-GB')}`, 140, y + 6);
    doc.text(`VAT No: IE 12345678L`, 140, y + 12);

    y += 30;

    autoTable(doc, {
        startY: y,
        head: [['Work Description', 'Amount']],
        body: [
            [description, ''],
            ['Labour Charges', `€${(labourTotal || 0).toFixed(2)}`],
            ['Parts & Materials', `€${(partsCost || 0).toFixed(2)}`],
            ['Additional Charges', `€${(additional || 0).toFixed(2)}`]
        ],
        headStyles: { fillColor: [0, 81, 165], textColor: [255, 255, 255] },
        styles: { fontSize: 10 }
    });

    // @ts-ignore
    y = doc.lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TOTAL:', 140, y);
    doc.text(`€${total.toFixed(2)}`, 190, y, { align: 'right' });

    addFooter(doc);

    return action === 'preview' ? doc.output('datauristring') : doc.save(`${invNum}.pdf`);
};
