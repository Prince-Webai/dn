# Implementation Plan - Professional PDF Design Refresh

The goal is to align the generated PDF documents (Invoices, Quotes, Statements) with the provided "Clonmel" design sample. This includes layout adjustments, additional data sections (VAT Analysis, Bank Details), and refinements to the totals section.

## Tasks

### 1. Header & Address Section Refinement
- Adjust the status banner rotation and font size to perfectly match the sample.
- Align the "Invoice To", "Deliver To", and Company Details columns more precisely.
- Ensure the Company Name in the info section is bold and prominent.

### 2. Info Grid Enhancements
- Update the horizontal info bar to include:
    - **Invoice Date**
    - **Ref. No.** (using the formatted document number)
    - **Account Manager** (default: "Prince Gaur")
    - **VAT No.** (default: "IE 8252470Q")
    - **Payment Due**
    - **Credit Terms** (default: "30 Days")

### 3. Line Items & Totals Refinement
- Update table headers to: "Description", "Quantity", "Price", "VAT Rate", "Total".
- Expand the totals section to include:
    - Total Net
    - Total Discount (default €0.00)
    - Total VAT
    - Total Gross
    - Less Deposit (default €0.00)
    - **Total Payable** (Bold and larger font)

### 4. New Document Sections
- **VAT Analysis Table**: Add a summary table showing VAT break down by rate.
- **Bank Details**: Add a section at the bottom for payment information:
    - Account Name: Condon Dairy Services
    - Bank Name: Permanent TSB
    - BIC/SWIFT: [Placeholder]
    - IBAN: [Placeholder]

### 5. Document Number Formatting
- Use the full formatted string (e.g., `INV-2026-002`) instead of raw numbers.

## Verification
- Generate a preview from the Document Builder.
- Confirm all sections appear correctly and overlap is eliminated.
- Verify VAT calculations are consistent across the main table and summary.
