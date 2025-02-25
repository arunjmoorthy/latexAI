/**
 * Converts a base64 string to a Blob object
 * @param base64 The base64 string to convert
 * @returns A Blob object
 */
export const base64ToBlob = (base64: string): Blob => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: 'application/pdf' });
};

/**
 * Downloads a PDF from a base64 string
 * @param pdfBase64 The base64 string of the PDF
 * @param filename Optional filename for the downloaded file (default: 'document.pdf')
 */
export const downloadPDF = (pdfBase64: string, filename = 'document.pdf'): void => {
  const blob = base64ToBlob(pdfBase64);
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}; 