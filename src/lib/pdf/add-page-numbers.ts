// ============================================================================
//  MasterAnalytics Pro — PDF Page Number Utility
//  Uses pdf-lib to add "Page 01/10" footers to each page (except cover).
//  This is a post-processing step because @react-pdf/renderer's `fixed` prop
//  for dynamic page numbers doesn't work reliably with complex documents.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Add "Page XX / YY" footer to each page of a PDF (except the cover page).
 * @param pdfBytes  The PDF as a Uint8Array/Buffer
 * @returns Modified PDF with page numbers added
 */
export async function addPageNumbers(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 9;
  const textColor = rgb(0.39, 0.45, 0.55); // slate-500

  // Pad number to 2 digits
  const pad = (n: number) => String(n).padStart(2, "0");

  for (let i = 0; i < totalPages; i++) {
    // Skip page 1 (cover page — no footer)
    if (i === 0) continue;

    const page = pages[i];
    const { width } = page.getSize();

    const pageStr = `Page ${pad(i + 1)} / ${pad(totalPages)}`;
    const textWidth = font.widthOfTextAtSize(pageStr, fontSize);

    // Center the text at the bottom of the page
    const x = (width - textWidth) / 2;
    const y = 20; // 20pt from bottom

    // Draw a thin line above the page number
    page.drawLine({
      start: { x: 56.7, y: y + 12 },
      end: { x: width - 56.7, y: y + 12 },
      thickness: 0.5,
      color: rgb(0.89, 0.91, 0.94), // slate-200
    });

    // Draw the page number text
    page.drawText(pageStr, {
      x,
      y,
      size: fontSize,
      font,
      color: textColor,
    });
  }

  return pdfDoc.save();
}
