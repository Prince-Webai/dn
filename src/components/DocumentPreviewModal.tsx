import React from 'react';
import { X, Download, Mail, CheckCircle } from 'lucide-react';

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfDataUrl: string;
    documentType: 'Invoice' | 'Quote' | 'Statement';
    documentNumber: string;
    customerEmail?: string;
    customerName: string;
    amount: string;
    onMarkAsSent?: () => void;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
    isOpen,
    onClose,
    pdfDataUrl,
    documentType,
    documentNumber,
    customerEmail,
    customerName,
    amount,
    onMarkAsSent
}) => {
    if (!isOpen) return null;

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = pdfDataUrl;
        link.download = `${documentType}_${documentNumber}.pdf`;
        link.click();
    };

    const handleEmail = () => {
        if (!customerEmail) {
            alert('No email address on file for this customer.');
            return;
        }

        const subject = encodeURIComponent(`Your ${documentType} from Condon Dairy: ${documentNumber}`);
        const body = encodeURIComponent(
            `Hi ${customerName},\n\nPlease find attached your ${documentType} (${documentNumber}) for the amount of ${amount}.\n\nIf you have any questions, feel free to reply to this email.\n\nBest regards,\nCondon Dairy Team`
        );
        window.location.href = `mailto:${customerEmail}?subject=${subject}&body=${body}`;

        // Optional: Auto-mark as sent when they click email
        if (onMarkAsSent) {
            onMarkAsSent();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold font-display text-slate-900">
                            {documentType} Preview
                        </h2>
                        <p className="text-sm text-slate-500">
                            {documentNumber} • {customerName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* PDF Viewer */}
                <div className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-hidden min-h-[50vh]">
                    {pdfDataUrl ? (
                        <iframe
                            src={`${pdfDataUrl}#toolbar=0`}
                            className="w-full h-full rounded-xl shadow-inner border border-slate-200 bg-white"
                            title="PDF Preview"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            Loading preview...
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm font-medium text-slate-600 w-full sm:w-auto text-center sm:text-left">
                        Total Amount: <span className="text-lg font-bold text-slate-900">{amount}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all"
                        >
                            <Download size={18} /> Download PDF
                        </button>

                        {onMarkAsSent && (
                            <button
                                onClick={() => {
                                    onMarkAsSent();
                                    onClose();
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-delaval-blue bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:text-blue-800 rounded-lg transition-all"
                            >
                                <CheckCircle size={18} /> Mark as Sent
                            </button>
                        )}

                        <button
                            onClick={handleEmail}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-delaval-blue hover:bg-blue-800 rounded-lg transition-all shadow-lg shadow-blue-900/20"
                        >
                            <Mail size={18} /> Email to Client
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentPreviewModal;
