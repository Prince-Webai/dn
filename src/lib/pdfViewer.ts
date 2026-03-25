export const openPdfPreview = (blobUrl: string, filename: string) => {
    console.log(`Opening PDF preview for ${filename}`);
    const win = window.open(blobUrl, '_blank');
    if (win) {
        win.focus();
    } else {
        console.error('Popup blocked. Please allow popups for this site.');
        alert('Preview blocked by browser. Please allow popups.');
    }
};
