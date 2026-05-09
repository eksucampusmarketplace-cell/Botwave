/**
 * Study Feature — File Content Extractors
 * Extracts text from PDF, DOCX, and plain text files.
 */

export async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdfjs-dist legacy build works in Node.js without canvas
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const uint8 = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data: uint8 }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str: string }>;
    text += items.map((item) => item.str).join(' ') + '\n';
  }
  return text.trim();
}

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

export async function extractTextFromFile(
  buffer: Buffer,
  filename: string,
): Promise<{ text: string; fileType: string }> {
  const ext = filename.toLowerCase().split('.').pop() || '';

  switch (ext) {
    case 'pdf': {
      const text = await extractPdfText(buffer);
      return { text, fileType: 'pdf' };
    }
    case 'docx':
    case 'doc': {
      const text = await extractDocxText(buffer);
      return { text, fileType: 'docx' };
    }
    case 'ppt':
    case 'pptx': {
      // PPT/PPTX: extract embedded text strings
      const raw = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n');
      return { text: raw.trim(), fileType: 'ppt' };
    }
    case 'txt':
    case 'md': {
      return { text: buffer.toString('utf-8'), fileType: 'text' };
    }
    default: {
      return { text: buffer.toString('utf-8'), fileType: 'text' };
    }
  }
}
