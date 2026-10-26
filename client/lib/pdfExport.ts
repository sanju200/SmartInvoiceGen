import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PDFExportOptions {
  filename?: string;
  quality?: number;
  scale?: number;
  compressionLevel?: number;
}

// Ensures the saved filename contains only the invoice code/number
function sanitizeInvoiceFilename(raw: string): string {
  if (!raw) return 'invoice.pdf';
  let text = String(raw).trim();

  // If it ends with the word INVOICE, drop that suffix
  text = text.replace(/INVOICE\s*$/i, '').trim();

  // Remove duplicate spaces/dashes
  text = text.replace(/[\s_]+/g, ' ').replace(/-{2,}/g, '-').trim();

  // Strong preference: explicit INVOICE- pattern anywhere
  const withPrefix = text.match(/(INVOICE-?[A-Z0-9-]+)/i);
  if (withPrefix && withPrefix[1]) {
    // Normalize to single dash after INVOICE
    const normalized = withPrefix[1].toUpperCase().replace(/^INVOICE-?/, 'INVOICE-');
    const safe = normalized.replace(/[^A-Z0-9-]/g, '_').replace(/-{2,}/g, '-').replace(/^-+|[-_]+$/g, '');
    return `${safe || 'INVOICE'}.pdf`;
  }

  // Next preference: pattern like KIZ-AUG25 (PREFIX-MONYY)
  const corePattern = text.toUpperCase().match(/([A-Z0-9]{2,}-[A-Z]{3}\d{2})/);
  if (corePattern && corePattern[1]) {
    const safe = corePattern[1].replace(/[^A-Z0-9-]/g, '_').replace(/-{2,}/g, '-').replace(/^-+|[-_]+$/g, '');
    return `${safe || 'INVOICE'}.pdf`;
  }

  // Fallback: remove any non filename chars, trim leading/trailing dashes/underscores
  const base = text.replace(/\binvoice\b/gi, '').trim();
  const safe = base.replace(/[^a-zA-Z0-9-]/g, '_').replace(/-{2,}/g, '-').replace(/^-+|[-_]+$/g, '');
  return `${(safe || 'invoice').toUpperCase()}.pdf`;
}

export async function exportToPDF(
  elementId: string,
  options: PDFExportOptions = {}
): Promise<void> {
  const {
    filename = 'invoice.pdf',
    quality = 1,
    // Optimized scale for quality and reliability
    scale = 4,
  } = options;

  try {
    // Find the container element
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }


    // Hide non-print elements
    const noPrintElements = element.querySelectorAll('.no-print');
    const originalDisplayValues: string[] = [];

    noPrintElements.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      originalDisplayValues[index] = htmlEl.style.display;
      htmlEl.style.display = 'none';
    });

    // Get all A4 pages
    const pages = element.querySelectorAll('.a4-page');

    if (pages.length === 0) {
      throw new Error('No A4 pages found for PDF export');
    }

    // Create PDF document with maximum quality settings
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
      precision: 3,
      putOnlyUsedFonts: true,
      floatPrecision: 3
    });

    // A4 dimensions in mm
    const a4Width = 210;
    const a4Height = 297;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;

      // If not the first page, add a new page
      if (i > 0) {
        pdf.addPage();
      }

      try {
        // Capture the page as canvas
        const rect = page.getBoundingClientRect();
        const dpr = (window.devicePixelRatio || 1);
        // Optimized scale for quality and reliability - more conservative to prevent A4 overflow
        const effectiveScale = Math.min(3, Math.max(1.5, scale, dpr * 1.2));

        // Compute safe capture dimensions with fallbacks
        const baseWidth = Math.ceil(rect.width || page.scrollWidth || page.offsetWidth);
        const baseHeight = Math.ceil(rect.height || page.scrollHeight || page.offsetHeight);

        // Use original dimensions for best quality
        const widthPx = baseWidth;
        const heightPx = baseHeight;
        const optimalScale = effectiveScale;

        const canvas = await html2canvas(page, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          foreignObjectRendering: false,
          width: widthPx,
          height: heightPx,
          scale: optimalScale,
          removeContainer: true,
          imageTimeout: 15000,
          onclone: (clonedDoc) => {
            // Ensure proper styling in the cloned document
            const clonedPage = clonedDoc.querySelector('.a4-page') as HTMLElement;
            if (clonedPage) {
              clonedPage.style.boxShadow = 'none';
              clonedPage.style.margin = '0';
              clonedPage.style.padding = '0';
              clonedPage.style.width = '210mm';
              clonedPage.style.minHeight = '297mm';
              clonedPage.style.maxHeight = '297mm';
              clonedPage.style.overflow = 'hidden';
            }

            // Ensure work period badge styling is preserved
            const workPeriodBadges = clonedDoc.querySelectorAll('.work-period-badge, [style*="border-radius: 9999px"]');
            workPeriodBadges.forEach((badge) => {
              const badgeEl = badge as HTMLElement;
              badgeEl.style.display = 'inline-block';
              badgeEl.style.padding = '0px 8px 14px 8px';
              badgeEl.style.marginTop = '0px';
              badgeEl.style.borderRadius = '9999px';
              badgeEl.style.fontWeight = '700';
              badgeEl.style.fontSize = '12px';
              badgeEl.style.lineHeight = '6px';
              badgeEl.style.whiteSpace = 'nowrap';
              badgeEl.style.marginTop = '6px';
            });

            const footerPhoneNumber = clonedDoc.querySelectorAll('.footer-text-phone, [style*="font-size: smaller"]');
            footerPhoneNumber.forEach((text) => {
              const textEl = text as HTMLElement;
              textEl.style.marginTop = '0px';
            });

            const footerCompInfo = clonedDoc.querySelectorAll('.footer-comp-info, [style*="font-size: smaller"]');
            footerCompInfo.forEach((text) => {
              const textEl = text as HTMLElement;
              textEl.style.marginTop = "0.5rem";
            });

            const empTableHeader = clonedDoc.querySelectorAll('.employee-table-text .table-head');
            empTableHeader.forEach((text) => {
              const tableHead = text as HTMLElement;
              tableHead.style.marginTop = '-0.5rem';
              tableHead.style.paddingTop = '0.4rem';
              tableHead.style.paddingBottom = '0.8rem';
              tableHead.style.paddingLeft = '0.5rem';
              tableHead.style.paddingRight = '0.5rem';

              // Add important styles to the class
              tableHead.classList.add('pdf-table-header');
            });

            const genericEmpTableHeader = clonedDoc.querySelectorAll('.generic-table-text > div');
            genericEmpTableHeader.forEach((text) => {
              const tableHead = text as HTMLElement;
              tableHead.style.marginTop = '-0.5rem';
              tableHead.style.paddingTop = '0.4rem';
              tableHead.style.paddingBottom = '0.8rem';
              tableHead.style.paddingRight = '0.5rem';
            });

            const genericTableHeader = clonedDoc.querySelectorAll('.generic-thead-text');
            genericTableHeader.forEach((text) => {
              const tableHeader = text as HTMLElement;
              tableHeader.style.marginTop = '-0.5rem';
              tableHeader.style.marginBottom = '0.4rem';
            })

            // Add a style element with !important rules
            const style = clonedDoc.createElement('style');
            style.textContent = `
              .pdf-table-header {
                margin-top: -0.5rem !important;
                padding-top: 0.5rem !important;
                padding-bottom: 0.7rem !important;
                padding-left: 0.5rem !important;
                padding-right: 0.5rem !important;
              }
            `;
            clonedDoc.head.appendChild(style);

            const empTableText = clonedDoc.querySelectorAll('.employee-table-text > div');
            empTableText.forEach((text) => {
              const tableHead = text as HTMLElement;
              // Remove !important from here
              tableHead.style.paddingTop = '0.5rem';
              tableHead.style.paddingBottom = '0.5rem';
              tableHead.style.paddingLeft = '0.5rem';
              tableHead.style.paddingRight = '0.5rem';

              // Add important styles to the class
              tableHead.classList.add('pdf-table-header');
            });

          }
        });


        // Calculate dimensions to fit A4
        const imgWidth = a4Width;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // If the image is taller than A4, scale it down
        let finalWidth = imgWidth;
        let finalHeight = imgHeight;

        if (imgHeight > a4Height) {
          finalHeight = a4Height;
          finalWidth = (canvas.width * finalHeight) / canvas.height;
        }

        // Center the image on the page
        const x = (a4Width - finalWidth) / 2;
        const y = 0;

        // Use high-quality JPEG compression
        const imgData = canvas.toDataURL('image/jpeg', quality);
        pdf.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight);
      } catch (pageError) {
        console.error(`Error processing page ${i + 1}:`, pageError);
        throw new Error(`Failed to process page ${i + 1}`);
      }
    }

    // Restore display of no-print elements
    noPrintElements.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.display = originalDisplayValues[index] || '';
    });
    // Save the PDF
    pdf.save(filename);

  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
}

export async function exportInvoiceToPDF(
  projectId: string,
  invoiceNumber?: string,
  elementId: string = 'invoice-container'
): Promise<void> {
  // If invoice number is not provided, we'll try to extract it from the DOM
  let filename = 'invoice.pdf';

  if (invoiceNumber) {
    filename = sanitizeInvoiceFilename(invoiceNumber);
  } else {
    // Try to get invoice number from the rendered invoice in the DOM
    const invoiceContainer = document.getElementById(elementId);
    if (invoiceContainer) {
      // Look for invoice number in the DOM
      const invoiceNumberElements = invoiceContainer.querySelectorAll('div');
      for (let i = 0; i < invoiceNumberElements.length; i++) {
        const element = invoiceNumberElements[i];
        const text = element.textContent || '';
        const upper = text.toUpperCase();
        // Prefer explicit INVOICE- pattern anywhere in the text
        const codeMatch = upper.match(/(INVOICE-[A-Z0-9-]+)/);
        if (codeMatch && codeMatch[1]) {
          filename = sanitizeInvoiceFilename(codeMatch[1]);
          break;
        }
        // Fallback: handle lines containing label 'Invoice Number:'
        if (/INVOICE\s*NUMBER:/i.test(text)) {
          // Take the token immediately following the label
          const afterLabel = text.split(/Invoice\s*Number:/i)[1] || '';
          const token = (afterLabel.trim().split(/\s+/)[0] || '').trim();
          if (token) {
            filename = sanitizeInvoiceFilename(token);
            break;
          }
        }
      }
    }
  }

  try {
    await exportToPDF(elementId, {
      filename,
      quality: 1,
      scale: 4,
      compressionLevel: 9
    });
  } catch (error) {
    // Log the full error for debugging
    console.error('Invoice PDF export failed:', error);

    // Throw a user-friendly error
    if (error instanceof Error) {
      throw new Error(`PDF export failed: ${error.message}`);
    } else {
      throw new Error('PDF export failed due to an unknown error');
    }
  }
}

