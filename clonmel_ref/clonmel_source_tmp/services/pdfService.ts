import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice, PaymentStatus } from "../types";

// Helper to convert image URL to base64
const getImageBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return '';
  }
};

// Helper to generate the jsPDF instance
const createInvoiceDoc = async (invoice: Invoice, logoUrl?: string): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const leftMargin = 20;
  const rightMargin = 20;

  let yPos = 25;

  // --- HEADER BACKGROUND (Mirrorzone Only) ---
  if (invoice.company === 'mirrorzone') {
    doc.setFillColor(15, 23, 42); // Slate-900 (Dark)
    doc.rect(0, 0, pageWidth, 52, 'F');
  }

  // --- LOGO SECTION ---
  // Determine which logo to use based on company
  const logoPath = invoice.company === 'mirrorzone'
    ? '/mirrorzone-logo.png'
    : '/clonmel-logo.png';

  try {
    const logoBase64 = await getImageBase64(logoPath);
    if (logoBase64) {
      // Add logo in the top right corner
      const logoWidth = invoice.company === 'mirrorzone' ? 40 : 50;
      const logoHeight = invoice.company === 'mirrorzone' ? 40 : 15;
      const logoX = pageWidth - rightMargin - logoWidth;
      const logoY = 10;

      doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
    }
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
  }

  // --- PAID/UNPAID BANNER (Top-left corner) ---
  const isPaid = invoice.status === PaymentStatus.PAID || invoice.balanceDue === 0;
  const bannerText = isPaid ? "PAID" : "UNPAID";
  const bannerColor = isPaid ? [34, 197, 94] : [255, 140, 0]; // Green or Orange

  // Draw triangle
  doc.setFillColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.triangle(0, 0, 60, 0, 0, 60, 'F');

  // Add text inside triangle - positioned to be clearly visible
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255); // White text

  // Rotate text for diagonal banner
  const angle = -45;
  const bannerX = 15;
  const bannerY = 28;
  doc.text(bannerText, bannerX, bannerY, { angle });

  // --- HEADER SECTION ---
  // Left: "Invoice" title and number
  doc.setFont("helvetica", "normal");
  doc.setFontSize(28);

  // Set text color: White for Mirrorzone (dark bg), Dark Grey for others
  if (invoice.company === 'mirrorzone') {
    doc.setTextColor(255, 255, 255);
  } else {
    doc.setTextColor(80, 80, 80);
  }

  doc.text("Invoice", leftMargin, yPos);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);

  // Keep same conditional color or just reset to black/white
  if (invoice.company === 'mirrorzone') {
    doc.setTextColor(255, 255, 255);
  } else {
    doc.setTextColor(0, 0, 0);
  }

  doc.text(invoice.invoiceNumber, leftMargin, yPos + 10);

  // Logo is already added above, no need for text company name
  yPos += 40; // Adjusted to account for logo space and header bg


  // --- ADDRESS SECTION (3 columns) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  // Column 1: Invoice To
  doc.text("Invoice To:", leftMargin, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(invoice.customerName || "Cash Sale", leftMargin, yPos + 5);

  // Column 2: Deliver To
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Deliver To:", leftMargin + 60, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(invoice.customerName || "Cash Sale", leftMargin + 60, yPos + 5);

  // Column 3: Company Details (Right aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const companyDetails = [
    "Clonmel Glass & Mirrors Ltd",
    "24 Mary Street",
    "Clonmel",
    "Limerick / Co. Tipperary",
    "",
    "Tel: (052) 612 1111",
    "Web: www.mirrorzone.ie"
  ];

  let detailY = yPos;
  companyDetails.forEach(line => {
    doc.setFont("helvetica", line.includes("Clonmel Glass") ? "bold" : "normal");
    doc.setFontSize(9);
    doc.text(line, pageWidth - rightMargin, detailY, { align: 'right' });
    detailY += 4;
  });

  yPos += 30;

  // --- INFO ROW ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  const infoData = [
    ["Invoice Date", invoice.dateIssued],
    ["Ref. No.", invoice.invoiceNumber],
    ["Account Manager", "Admin"],
    ["VAT No.", "IE8252470Q"],
    ["Payment Due", invoice.dueDate]
  ];

  const colWidth = (pageWidth - leftMargin - rightMargin) / 5;
  infoData.forEach((item, i) => {
    const x = leftMargin + (i * colWidth);
    doc.setFont("helvetica", "bold");
    doc.text(item[0], x, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(item[1], x, yPos + 4);
  });

  yPos += 12;

  // Horizontal line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);

  yPos += 8;

  // --- ITEMS TABLE ---
  const tableHead = [["Description", "Quantity", "Price", "VAT Rate", "Total"]];

  const tableBody = invoice.items.map(item => [
    item.description,
    item.quantity.toString(),
    item.unitPrice.toFixed(2),
    `${invoice.taxRate.toFixed(2)}%`,
    item.total.toFixed(2)
  ]);

  autoTable(doc, {
    startY: yPos,
    head: tableHead,
    body: tableBody,
    theme: 'plain',
    styles: {
      fontSize: 10,
      textColor: [0, 0, 0],
      cellPadding: 3,
      font: "helvetica"
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 80 }, // Description
      1: { halign: 'center', cellWidth: 25 }, // Quantity
      2: { halign: 'right', cellWidth: 25 }, // Price
      3: { halign: 'center', cellWidth: 25 }, // VAT Rate
      4: { halign: 'right', cellWidth: 25 } // Total
    },
    didDrawPage: (data) => {
      if (data.cursor) {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(leftMargin, data.cursor.y, pageWidth - rightMargin, data.cursor.y);
      }
    }
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  // --- FOOTER SECTION ---
  // Left side: Payment Terms
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Payment Terms:", leftMargin, yPos);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  yPos += 5;
  doc.text("Bank Transfer to: PTSB BANK", leftMargin, yPos);
  yPos += 4;
  doc.text("IBAN: IE98IPBS99071010105209", leftMargin, yPos);
  yPos += 4;
  doc.text("Deposit of 50% prior to installation.", leftMargin, yPos);

  // Right side: Totals
  // @ts-ignore
  const totalsStartY = doc.lastAutoTable.finalY + 15;
  const totalsX = pageWidth - rightMargin - 60;

  const totalsData = [
    ["Total Net", `EUR ${invoice.subtotal.toFixed(2)}`],
    ["Total VAT", `EUR ${invoice.taxAmount.toFixed(2)}`],
    ["Total Gross", `EUR ${invoice.total.toFixed(2)}`]
  ];

  let totalY = totalsStartY;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  totalsData.forEach(([label, value]) => {
    doc.text(label, totalsX, totalY);
    doc.text(value, pageWidth - rightMargin, totalY, { align: 'right' });
    totalY += 6;
  });

  // Total Payable (bigger and bold)
  totalY += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total Payable", totalsX, totalY);
  doc.text(`EUR ${invoice.balanceDue.toFixed(2)}`, pageWidth - rightMargin, totalY, { align: 'right' });

  // --- FOOTER TEXT ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.text(`Printed on: ${today} | Page 1 of 1`, leftMargin, pageHeight - 10);
  doc.text("Created by Clonmel Glass Invoice Hub", pageWidth - rightMargin, pageHeight - 10, { align: 'right' });

  return doc;
};

// Exported Actions
export const downloadInvoicePDF = async (invoice: Invoice, logoUrl?: string) => {
  const doc = await createInvoiceDoc(invoice, logoUrl);
  doc.save(`${invoice.invoiceNumber}.pdf`);
};

export const generatePreviewUrl = async (invoice: Invoice, logoUrl?: string): Promise<string> => {
  const doc = await createInvoiceDoc(invoice, logoUrl);
  return doc.output('bloburl').toString();
};