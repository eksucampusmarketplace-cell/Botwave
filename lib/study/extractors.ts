/**
 * Study Feature — File Content Extractors
 * Extracts text from PDF, DOCX, and plain text files.
 */

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const result = await pdfParse(buffer);
  return result.text || '';
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
      // PPT/PPTX: extract whatever text is embedded
      // Full slide extraction requires python-pptx; fallback to raw text
      const text = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n');
      return { text: text.trim(), fileType: 'ppt' };
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
