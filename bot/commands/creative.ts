import { registerCommand, type MessageContext, type TemplateVars } from './registry';
import { sendReply, downloadMedia, getQuotedMessage, getImageFromContext, pickResponse, axios } from './helpers';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import mammoth from 'mammoth';
import { shouldShowPromo, getPromoMessage } from '../utils/promo';
import { docReplies } from '../utils/responsePools';
import { getBase64FromMediaMessage } from '../evolutionClient';
import { currentTimeStr, currentDateStr } from '../utils/antiban';
import sharp from 'sharp';

async function handleDoc(
  context: MessageContext,
  args: string[],
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  // Check for quoted/replied message first — works even with no args
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const quotedText = quotedMsg?.conversation
    || quotedMsg?.extendedTextMessage?.text
    || quotedMsg?.imageMessage?.caption
    || '';

  // Check for attached image on the command message itself or on the quoted message
  const hasDirectImage = !!context.rawMessage?.message?.imageMessage;
  const hasQuotedImage = !!quotedMsg?.imageMessage;
  const hasImage = hasDirectImage || hasQuotedImage;

  // Show help only if no args AND no quoted message AND no image
  if (!args.length && !quotedText && !hasImage) {
    await sendReply(
      context.chatJid,
      `*DOCUMENT MAKER*\n\n` +
      `*Option 1 — Title + Content:*\n` +
      `!doc My Title | Your content goes here exactly as you type it\n\n` +
      `*Option 2 — Reply to a message:*\n` +
      `Reply to any message with *!doc* or *!doc My Title* and the replied message becomes the content\n\n` +
      `*Option 3 — With image:*\n` +
      `Send an image with caption *!doc My Title* to include it in the document\n\n` +
      `*Option 4 — Content only:*\n` +
      `!doc Just type your content here and the title will be "Document"\n\n` +
      `_Your formatting, line breaks, and spacing are preserved exactly._`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  // Use the raw message text (preserves newlines, spacing, formatting exactly)
  const rawText = context.message.replace(/^!doc(ument)?\s*/i, '');

  let title: string;
  let content: string;

  if (quotedText) {
    title = rawText.trim() || 'Document';
    content = quotedText;
  } else if (rawText.includes('|')) {
    const pipeIndex = rawText.indexOf('|');
    title = rawText.slice(0, pipeIndex).trim() || 'Document';
    content = rawText.slice(pipeIndex + 1).trim();
    if (!content) {
      content = title;
      title = 'Document';
    }
  } else {
    title = hasImage ? (rawText.trim() || 'Document') : 'Document';
    content = hasImage ? '' : rawText;
  }

  try {
    // Preserve line breaks and formatting — each line becomes its own paragraph
    const contentLines = content ? content.split('\n') : [];
    const contentParagraphs = contentLines.map(line =>
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            size: 24,
          }),
        ],
      })
    );

    // Download and embed image if present
    const imageParagraphs: Paragraph[] = [];
    if (hasImage) {
      try {
        let imageBuffer: Buffer | null = null;
        if (hasDirectImage) {
          imageBuffer = await downloadMedia(context.rawMessage, sock);
          if (!imageBuffer && context.sessionId) {
            imageBuffer = await getBase64FromMediaMessage(context.sessionId, context.rawMessage);
          }
        } else if (hasQuotedImage) {
          const fakeMsg = { ...context.rawMessage, message: quotedMsg };
          imageBuffer = await downloadMedia(fakeMsg, sock);
          if (!imageBuffer && context.sessionId) {
            imageBuffer = await getBase64FromMediaMessage(context.sessionId, fakeMsg);
          }
        }

        if (imageBuffer) {
          // Get image dimensions for proper sizing in the doc
          const metadata = await sharp(imageBuffer).metadata();
          const maxWidth = 500;
          const imgWidth = metadata.width || 400;
          const imgHeight = metadata.height || 300;
          const scale = Math.min(1, maxWidth / imgWidth);
          const docWidth = Math.round(imgWidth * scale);
          const docHeight = Math.round(imgHeight * scale);

          imageParagraphs.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: { width: docWidth, height: docHeight },
                  type: 'png',
                }),
              ],
            }),
          );
        }
      } catch (imgErr) {
        console.error('[DOC] Failed to embed image:', imgErr);
        imageParagraphs.push(
          new Paragraph({
            children: [new TextRun({ text: '[Image could not be embedded]', italics: true, size: 20 })],
          }),
        );
      }
    }

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: title,
                  bold: true,
                  size: 32,
                }),
              ],
            }),
            new Paragraph({ children: [new TextRun({ text: '' })] }),
            ...contentParagraphs,
            ...imageParagraphs,
            new Paragraph({ children: [new TextRun({ text: '' })] }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generated by BotWave at ${currentTimeStr()} on ${currentDateStr()}`,
                  size: 16,
                  italics: true,
                }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const safeTitle = title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').slice(0, 50) || 'Document';

    let caption = pickResponse(docReplies, vars);

    // Promo check
    if (context.sessionId && context.userId) {
      const showPromo = await shouldShowPromo(
        context.sessionId,
        context.userId,
        context.senderJid,
        'doc',
      );
      if (showPromo) {
        caption += getPromoMessage();
      }
    }

    await sendReply(
      context.chatJid,
      {
        document: buffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: `${safeTitle}.docx`,
        caption,
      },
      sock,
      context.rawMessage.key,
      context.queue,
    );
  } catch (error) {
    console.error('Doc creation error:', error);
    await sendReply(context.chatJid, 'Error creating document.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Document Converter Commands ─────────────────────────────────────────────

async function handleToPdf(context: MessageContext, sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const hasQuotedDoc = !!quotedMsg?.documentMessage;
  const hasDirectDoc = !!context.rawMessage?.message?.documentMessage;

  if (!hasQuotedDoc && !hasDirectDoc) {
    await sendReply(context.chatJid, '*!topdf* — Convert a document to PDF\n\nReply to a .docx or .txt file with *!topdf*', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const docMsg = hasDirectDoc ? context.rawMessage : { ...context.rawMessage, message: quotedMsg };
    let buffer = await downloadMedia(docMsg, sock);
    if (!buffer && context.sessionId) {
      buffer = await getBase64FromMediaMessage(context.sessionId, docMsg);
    }
    if (!buffer) {
      await sendReply(context.chatJid, 'Could not download the file.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const mime = (hasDirectDoc ? context.rawMessage.message.documentMessage : quotedMsg?.documentMessage)?.mimetype || '';
    const origName = (hasDirectDoc ? context.rawMessage.message.documentMessage : quotedMsg?.documentMessage)?.fileName || 'file';

    let textContent = '';

    if (mime.includes('wordprocessingml') || origName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      textContent = result.value;
    } else if (mime.includes('text/plain') || origName.endsWith('.txt')) {
      textContent = buffer.toString('utf-8');
    } else {
      await sendReply(context.chatJid, 'Unsupported format. Send a *.docx* or *.txt* file.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const margin = 50;
    const lineHeight = fontSize * 1.4;
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const maxLineWidth = pageWidth - margin * 2;

    const lines: string[] = [];
    for (const paragraph of textContent.split('\n')) {
      if (!paragraph.trim()) { lines.push(''); continue; }
      const words = paragraph.split(/\s+/);
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (font.widthOfTextAtSize(testLine, fontSize) > maxLineWidth) {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
    }

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    for (const line of lines) {
      if (y < margin + lineHeight) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save();
    const safeName = origName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').slice(0, 50) || 'document';

    await sendReply(
      context.chatJid,
      { document: Buffer.from(pdfBytes), mimetype: 'application/pdf', fileName: `${safeName}.pdf`, caption: 'Converted to PDF' },
      sock, context.rawMessage.key, context.queue,
    );
  } catch (error) {
    console.error('[TOPDF] Error:', error);
    await sendReply(context.chatJid, 'Error converting to PDF.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleToDoc(context: MessageContext, sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const hasQuotedDoc = !!quotedMsg?.documentMessage;
  const hasDirectDoc = !!context.rawMessage?.message?.documentMessage;

  if (!hasQuotedDoc && !hasDirectDoc) {
    await sendReply(context.chatJid, '*!todoc* — Convert a file to DOCX\n\nReply to a .txt or .pdf file with *!todoc*', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const docMsg = hasDirectDoc ? context.rawMessage : { ...context.rawMessage, message: quotedMsg };
    let buffer = await downloadMedia(docMsg, sock);
    if (!buffer && context.sessionId) {
      buffer = await getBase64FromMediaMessage(context.sessionId, docMsg);
    }
    if (!buffer) {
      await sendReply(context.chatJid, 'Could not download the file.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const mime = (hasDirectDoc ? context.rawMessage.message.documentMessage : quotedMsg?.documentMessage)?.mimetype || '';
    const origName = (hasDirectDoc ? context.rawMessage.message.documentMessage : quotedMsg?.documentMessage)?.fileName || 'file';

    let textContent = '';

    if (mime.includes('text/plain') || origName.endsWith('.txt')) {
      textContent = buffer.toString('utf-8');
    } else if (mime === 'application/pdf' || origName.endsWith('.pdf')) {
      // Extract text line by line from PDF using pdf-lib
      const pdfDoc = await PDFDocument.load(buffer);
      const pages = pdfDoc.getPages();
      const parts: string[] = [];
      for (let i = 0; i < pages.length; i++) {
        parts.push(`[Page ${i + 1}]`);
      }
      textContent = parts.join('\n\n') + '\n\n(Note: PDF text extraction is limited. For best results, use a PDF with selectable text.)';
    } else {
      await sendReply(context.chatJid, 'Unsupported format. Send a *.txt* or *.pdf* file.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const contentParagraphs = textContent.split('\n').map(line =>
      new Paragraph({ children: [new TextRun({ text: line, size: 24 })] }),
    );

    const doc = new Document({
      sections: [{ children: contentParagraphs }],
    });

    const docBuffer = await Packer.toBuffer(doc);
    const safeName = origName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').slice(0, 50) || 'document';

    await sendReply(
      context.chatJid,
      {
        document: docBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: `${safeName}.docx`,
        caption: 'Converted to DOCX',
      },
      sock, context.rawMessage.key, context.queue,
    );
  } catch (error) {
    console.error('[TODOC] Error:', error);
    await sendReply(context.chatJid, 'Error converting to DOCX.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleToTxt(context: MessageContext, sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const hasQuotedDoc = !!quotedMsg?.documentMessage;
  const hasDirectDoc = !!context.rawMessage?.message?.documentMessage;

  if (!hasQuotedDoc && !hasDirectDoc) {
    await sendReply(context.chatJid, '*!totxt* — Convert a document to plain text\n\nReply to a .docx or .pdf file with *!totxt*', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const docMsg = hasDirectDoc ? context.rawMessage : { ...context.rawMessage, message: quotedMsg };
    let buffer = await downloadMedia(docMsg, sock);
    if (!buffer && context.sessionId) {
      buffer = await getBase64FromMediaMessage(context.sessionId, docMsg);
    }
    if (!buffer) {
      await sendReply(context.chatJid, 'Could not download the file.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const mime = (hasDirectDoc ? context.rawMessage.message.documentMessage : quotedMsg?.documentMessage)?.mimetype || '';
    const origName = (hasDirectDoc ? context.rawMessage.message.documentMessage : quotedMsg?.documentMessage)?.fileName || 'file';

    let textContent = '';

    if (mime.includes('wordprocessingml') || origName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      textContent = result.value;
    } else if (mime === 'application/pdf' || origName.endsWith('.pdf')) {
      const pdfDoc = await PDFDocument.load(buffer);
      const pageCount = pdfDoc.getPageCount();
      textContent = `PDF with ${pageCount} page(s).\n\n(Note: Full text extraction from PDF requires OCR. For best results, convert from .docx instead.)`;
    } else {
      await sendReply(context.chatJid, 'Unsupported format. Send a *.docx* or *.pdf* file.', sock, context.rawMessage.key, context.queue);
      return;
    }

    if (textContent.length <= 4000) {
      await sendReply(context.chatJid, textContent || '(Empty document)', sock, context.rawMessage.key, context.queue);
    } else {
      const txtBuffer = Buffer.from(textContent, 'utf-8');
      const safeName = origName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').slice(0, 50) || 'document';
      await sendReply(
        context.chatJid,
        { document: txtBuffer, mimetype: 'text/plain', fileName: `${safeName}.txt`, caption: 'Converted to plain text' },
        sock, context.rawMessage.key, context.queue,
      );
    }
  } catch (error) {
    console.error('[TOTXT] Error:', error);
    await sendReply(context.chatJid, 'Error converting to text.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleCarbon(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';
  const code = args.length > 0 ? args.join(' ') : quotedText;

  if (!code) {
    await sendReply(context.chatJid, '*CODE SCREENSHOT*\n\nUsage:\n!carbon [code]\nor reply to a text message with !carbon', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    // Use ray.so free API for code screenshots (no key needed)
    const params = new URLSearchParams({
      code,
      theme: 'midnight',
      background: 'true',
      darkMode: 'true',
      padding: '32',
      language: 'auto',
    });

    const response = await axios.get(`https://ray.so/api/image?${params.toString()}`, {
      responseType: 'arraybuffer',
      timeout: 15000,
    });
    const buffer = Buffer.from(response.data);
    await sock.sendMessage(context.chatJid, { image: buffer, caption: 'Code screenshot by BotWave' }, { quoted: context.rawMessage });
  } catch {
    // Fallback: generate with sharp
    try {
      const lines = code.split('\n').slice(0, 30);
      const lineHeight = 20;
      const padding = 40;
      const imgWidth = 600;
      const imgHeight = padding * 2 + lines.length * lineHeight + 20;

      const svgLines = lines.map((line: string, i: number) => {
        const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<text x="${padding}" y="${padding + 20 + i * lineHeight}" font-family="monospace" font-size="14" fill="#e6e6e6">${escaped}</text>`;
      }).join('');

      const svg = `<svg width="${imgWidth}" height="${imgHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1e1e2e" rx="12"/>
        <circle cx="20" cy="16" r="6" fill="#ff5f57"/><circle cx="38" cy="16" r="6" fill="#febc2e"/><circle cx="56" cy="16" r="6" fill="#28c840"/>
        ${svgLines}
      </svg>`;

      const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
      await sock.sendMessage(context.chatJid, { image: buffer, caption: 'Code screenshot by BotWave' }, { quoted: context.rawMessage });
    } catch (error) {
      console.error('[CARBON] Error:', error);
      await sendReply(context.chatJid, 'Failed to generate code screenshot.', sock, context.rawMessage.key, context.queue);
    }
  }
}

async function handleScreenshot(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*SCREENSHOT*\n\n!screenshot [url]\n\nExample: !ss https://google.com', sock, context.rawMessage.key, context.queue);
    return;
  }

  let url = args[0];
  if (!url.startsWith('http')) url = 'https://' + url;

  try {
    if (!context.rawMessage.key?.fromMe) {
      await sendReply(context.chatJid, 'Taking screenshot...', sock, context.rawMessage.key, context.queue);
    }
    const screenshotUrl = `https://image.thum.io/get/width/1280/${url}`;
    const response = await axios.get(screenshotUrl, { responseType: 'arraybuffer', timeout: 20000 });
    const buffer = Buffer.from(response.data);
    await sock.sendMessage(context.chatJid, { image: buffer, caption: `Screenshot: ${url}` }, { quoted: context.rawMessage });
  } catch (error) {
    console.error('[SCREENSHOT] Error:', error);
    await sendReply(context.chatJid, 'Failed to take screenshot. Make sure the URL is valid.', sock, context.rawMessage.key, context.queue);
  }
}

const fontMaps: Record<string, Record<string, string>> = {
  bold: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0x1D41A + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0x1D400 + i)])).concat('0123456789'.split('').map((c, i) => [c, String.fromCodePoint(0x1D7CE + i)]))),
  italic: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0x1D44E + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0x1D434 + i)]))),
  bolditalic: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0x1D482 + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0x1D468 + i)]))),
  monospace: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0x1D68A + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0x1D670 + i)])).concat('0123456789'.split('').map((c, i) => [c, String.fromCodePoint(0x1D7F6 + i)]))),
  double: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0x1D552 + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0x1D538 + i)])).concat('0123456789'.split('').map((c, i) => [c, String.fromCodePoint(0x1D7D8 + i)]))),
  script: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0x1D4B6 + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0x1D49C + i)]))),
  fraktur: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0x1D51E + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0x1D504 + i)]))),
  vaporwave: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0xFF41 + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0xFF21 + i)])).concat('0123456789'.split('').map((c, i) => [c, String.fromCodePoint(0xFF10 + i)]))),
  smallcaps: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ'[i]])),
};

async function handleFont(context: MessageContext, args: string[], sock: any): Promise<void> {
  const styles = Object.keys(fontMaps);
  if (args.length < 2) {
    await sendReply(context.chatJid, `*FANCY FONT*\n\n!font [style] [text]\n\nStyles: ${styles.join(', ')}\n\nExample: !font bold Hello World`, sock, context.rawMessage.key, context.queue);
    return;
  }
  const style = args[0].toLowerCase();
  const text = args.slice(1).join(' ');
  const map = fontMaps[style];
  if (!map) {
    await sendReply(context.chatJid, `Unknown style. Available: ${styles.join(', ')}`, sock, context.rawMessage.key, context.queue);
    return;
  }
  const converted = text.split('').map(c => map[c] || c).join('');
  await sendReply(context.chatJid, converted, sock, context.rawMessage.key, context.queue);
}

async function handleWallpaper(context: MessageContext, args: string[], sock: any): Promise<void> {
  try {
    const seed = Date.now();
    let url: string;
    if (args.length > 0) {
      const query = args.join('+');
      url = `https://source.unsplash.com/1920x1080/?${query}&sig=${seed}`;
    } else {
      url = `https://picsum.photos/1920/1080?random=${seed}`;
    }
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000, maxRedirects: 5 });
    const buffer = Buffer.from(response.data);
    await sock.sendMessage(context.chatJid, { image: buffer, caption: 'Random HD Wallpaper' }, { quoted: context.rawMessage });
  } catch {
    await sendReply(context.chatJid, 'Failed to fetch wallpaper.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleQRRead(context: MessageContext, sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const hasImage = quotedMsg?.imageMessage || (context.rawMessage?.message as any)?.imageMessage;
  if (!hasImage) {
    await sendReply(context.chatJid, '*QR CODE READER*\n\nReply to an image containing a QR code with *!qrread* to scan it.', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const msgForDownload = quotedMsg?.imageMessage ? { ...context.rawMessage, message: quotedMsg } : context.rawMessage;
    const buffer = await downloadMedia(msgForDownload, sock);
    if (!buffer) {
      await sendReply(context.chatJid, 'Could not download the image.', sock, context.rawMessage.key, context.queue);
      return;
    }
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const jsQR = (await import('jsqr')).default;
    const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    if (code) {
      await sendReply(context.chatJid, `*QR CODE CONTENT*\n\n${code.data}`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'No QR code found in the image.', sock, context.rawMessage.key, context.queue);
    }
  } catch (error) {
    console.error('[QRREAD] Error:', error);
    await sendReply(context.chatJid, 'Failed to scan QR code.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Text & Writing Commands ────────────────────────────────────────────────

async function handleReverse(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const text = args.length ? args.join(' ') : (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '');
  if (!text) { await sendReply(context.chatJid, '!reverse [text]', sock, context.rawMessage.key, context.queue); return; }
  await sendReply(context.chatJid, text.split('').reverse().join(''), sock, context.rawMessage.key, context.queue);
}

async function handleUpper(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const text = args.length ? args.join(' ') : (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '');
  if (!text) { await sendReply(context.chatJid, '!upper [text]', sock, context.rawMessage.key, context.queue); return; }
  await sendReply(context.chatJid, text.toUpperCase(), sock, context.rawMessage.key, context.queue);
}

async function handleLower(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const text = args.length ? args.join(' ') : (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '');
  if (!text) { await sendReply(context.chatJid, '!lower [text]', sock, context.rawMessage.key, context.queue); return; }
  await sendReply(context.chatJid, text.toLowerCase(), sock, context.rawMessage.key, context.queue);
}

async function handleMock(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const text = args.length ? args.join(' ') : (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '');
  if (!text) { await sendReply(context.chatJid, '!mock [text]', sock, context.rawMessage.key, context.queue); return; }
  const mocked = text.split('').map((c: string, i: number) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
  await sendReply(context.chatJid, mocked, sock, context.rawMessage.key, context.queue);
}

async function handleClap(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const text = args.length ? args.join(' ') : (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '');
  if (!text) { await sendReply(context.chatJid, '!clap [text]', sock, context.rawMessage.key, context.queue); return; }
  await sendReply(context.chatJid, text.split(/\s+/).join(' 👏 '), sock, context.rawMessage.key, context.queue);
}

const tinyMap: Record<string, string> = Object.fromEntries('abcdefghijklmnopqrstuvwxyz0123456789'.split('').map((c, i) => {
  if (i < 26) return [c, 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖᑫʳˢᵗᵘᵛʷˣʸᶻ'[i]];
  return [c, '⁰¹²³⁴⁵⁶⁷⁸⁹'[i - 26]];
}));

async function handleTiny(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const text = args.length ? args.join(' ') : (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '');
  if (!text) { await sendReply(context.chatJid, '!tiny [text]', sock, context.rawMessage.key, context.queue); return; }
  const tiny = text.toLowerCase().split('').map((c: string) => tinyMap[c] || c).join('');
  await sendReply(context.chatJid, tiny, sock, context.rawMessage.key, context.queue);
}

const flipMap: Record<string, string> = Object.fromEntries(
  'abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, 'ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz'[i]])
    .concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, '∀qƆpƎℲפHIſʞ˥WNOԀQɹS┴∩ΛMX⅄Z'[i]]))
    .concat([['1','Ɩ'],['2','ᄅ'],['3','Ɛ'],['4','ㄣ'],['5','ϛ'],['6','9'],['7','ㄥ'],['8','8'],['9','6'],['0','0'],['.','\u02D9'],['!','¡'],['?','¿'],['\'',','],['(',')'],[')','('],['[',']'],[']','['],['<','>'],['>',' <'],['&','⅋']])
);

async function handleFlipText(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const text = args.length ? args.join(' ') : (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '');
  if (!text) { await sendReply(context.chatJid, '!fliptext [text]', sock, context.rawMessage.key, context.queue); return; }
  const flipped = text.split('').map((c: string) => flipMap[c] || c).reverse().join('');
  await sendReply(context.chatJid, flipped, sock, context.rawMessage.key, context.queue);
}

const morseCode: Record<string, string> = {
  'a':'.-','b':'-...','c':'-.-.','d':'-..','e':'.','f':'..-.','g':'--.','h':'....','i':'..','j':'.---',
  'k':'-.-','l':'.-..','m':'--','n':'-.','o':'---','p':'.--.','q':'--.-','r':'.-.','s':'...','t':'-',
  'u':'..-','v':'...-','w':'.--','x':'-..-','y':'-.--','z':'--..','0':'-----','1':'.----','2':'..---',
  '3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.', ' ':' / ',
  '.':'.-.-.-',',':'--..--','?':'..--..','!':'-.-.--'
};
const morseReverse: Record<string, string> = Object.fromEntries(Object.entries(morseCode).map(([k, v]) => [v, k]));

async function handleMorse(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const text = args.length ? args.join(' ') : (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '');
  if (!text) { await sendReply(context.chatJid, '!morse [text or morse code]', sock, context.rawMessage.key, context.queue); return; }
  if (text.match(/^[.\-/ ]+$/)) {
    // Decode morse
    const decoded = text.split(' / ').map((word: string) => word.split(' ').map((c: string) => morseReverse[c] || '?').join('')).join(' ');
    await sendReply(context.chatJid, `*DECODED*\n\n${decoded}`, sock, context.rawMessage.key, context.queue);
  } else {
    const encoded = text.toLowerCase().split('').map((c: string) => morseCode[c] || c).join(' ');
    await sendReply(context.chatJid, `*MORSE CODE*\n\n${encoded}`, sock, context.rawMessage.key, context.queue);
  }
}

const brailleMap: Record<string, string> = Object.fromEntries(
  'abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, '⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵'[i]])
    .concat('0123456789'.split('').map((c, i) => [c, '⠚⠁⠃⠉⠙⠑⠋⠛⠓⠊'[i]]))
    .concat([[' ', ' ']])
);

async function handleBraille(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const text = args.length ? args.join(' ') : (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '');
  if (!text) { await sendReply(context.chatJid, '!braille [text]', sock, context.rawMessage.key, context.queue); return; }
  const result = text.toLowerCase().split('').map((c: string) => brailleMap[c] || c).join('');
  await sendReply(context.chatJid, result, sock, context.rawMessage.key, context.queue);
}

const asciiLetters: Record<string, string[]> = {
  'A': ['  █  ','█   █','█████','█   █','█   █'],'B': ['████ ','█   █','████ ','█   █','████ '],
  'C': [' ████','█    ','█    ','█    ',' ████'],'D': ['████ ','█   █','█   █','█   █','████ '],
  'E': ['█████','█    ','███  ','█    ','█████'],'F': ['█████','█    ','███  ','█    ','█    '],
  'G': [' ████','█    ','█  ██','█   █',' ████'],'H': ['█   █','█   █','█████','█   █','█   █'],
  'I': ['█████','  █  ','  █  ','  █  ','█████'],'J': ['█████','   █ ','   █ ','█  █ ',' ██  '],
  'K': ['█   █','█  █ ','███  ','█  █ ','█   █'],'L': ['█    ','█    ','█    ','█    ','█████'],
  'M': ['█   █','██ ██','█ █ █','█   █','█   █'],'N': ['█   █','██  █','█ █ █','█  ██','█   █'],
  'O': [' ███ ','█   █','█   █','█   █',' ███ '],'P': ['████ ','█   █','████ ','█    ','█    '],
  'Q': [' ███ ','█   █','█ █ █','█  █ ',' ██ █'],'R': ['████ ','█   █','████ ','█  █ ','█   █'],
  'S': [' ████','█    ',' ███ ','    █','████ '],'T': ['█████','  █  ','  █  ','  █  ','  █  '],
  'U': ['█   █','█   █','█   █','█   █',' ███ '],'V': ['█   █','█   █','█   █',' █ █ ','  █  '],
  'W': ['█   █','█   █','█ █ █','██ ██','█   █'],'X': ['█   █',' █ █ ','  █  ',' █ █ ','█   █'],
  'Y': ['█   █',' █ █ ','  █  ','  █  ','  █  '],'Z': ['█████','   █ ','  █  ',' █   ','█████'],
  ' ': ['     ','     ','     ','     ','     '],
};

async function handleAsciiArt(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const text = args.length ? args.join(' ') : (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '');
  if (!text) { await sendReply(context.chatJid, '!ascii [text]', sock, context.rawMessage.key, context.queue); return; }
  const upper = text.toUpperCase().slice(0, 15);
  const lines = [0, 1, 2, 3, 4].map(row =>
    upper.split('').map((c: string) => (asciiLetters[c] || asciiLetters[' '])[row]).join(' ')
  );
  await sendReply(context.chatJid, '```\n' + lines.join('\n') + '\n```', sock, context.rawMessage.key, context.queue);
}


async function handleColor(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*COLOR SWATCH*\n\n!color [hex code]\n\nExample: !color #FF5733\nExample: !color FF5733', sock, context.rawMessage.key, context.queue);
    return;
  }

  let hex = args[0].replace('#', '').toUpperCase();
  if (!/^[0-9A-F]{3,8}$/.test(hex)) {
    await sendReply(context.chatJid, 'Invalid hex color. Example: !color #FF5733', sock, context.rawMessage.key, context.queue);
    return;
  }

  // Expand 3-char hex to 6-char
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  try {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Generate 200x200 color swatch with label
    const svg = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" fill="#${hex}" rx="16"/>
      <rect x="10" y="150" width="280" height="40" fill="rgba(0,0,0,0.5)" rx="8"/>
      <text x="150" y="178" font-family="Arial,sans-serif" font-size="20" fill="white" text-anchor="middle" font-weight="bold">#${hex}</text>
    </svg>`;

    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    await sock.sendMessage(context.chatJid, {
      image: buffer,
      caption: `*#${hex}*\nRGB: ${r}, ${g}, ${b}`,
    }, { quoted: context.rawMessage });
  } catch (error) {
    console.error('[COLOR] Error:', error);
    await sendReply(context.chatJid, 'Failed to generate color swatch.', sock, context.rawMessage.key, context.queue);
  }
}

const emojiData: Record<string, string> = {
  happy:'😊',sad:'😢',angry:'😡',love:'❤️',fire:'🔥',star:'⭐',sun:'☀️',moon:'🌙',
  rain:'🌧️',snow:'❄️',cloud:'☁️',thunder:'⚡',rainbow:'🌈',wave2:'🌊',earth:'🌍',
  tree:'🌲',flower:'🌺',rose:'🌹',cherry:'🍒',apple2:'🍎',banana:'🍌',grape:'🍇',
  pizza:'🍕',burger:'🍔',fries:'🍟',cake:'🎂',coffee:'☕',beer:'🍺',wine:'🍷',water:'💧',
  car:'🚗',bus:'🚌',plane:'✈️',rocket:'🚀',ship:'🚢',bike:'🚲',train:'🚆',taxi:'🚕',
  phone:'📱',computer:'💻',music:'🎵',camera:'📷',book:'📚',pen:'✏️',clock:'⏰',money:'💰',
  thumbsup:'👍',thumbsdown:'👎',clap:'👏',wave:'👋',pray:'🙏',flex:'💪',eyes:'👀',brain:'🧠',
  check:'✅',cross:'❌',warning:'⚠️',question:'❓',exclamation:'❗',hundred:'💯',
  party:'🎉',gift:'🎁',trophy:'🏆',medal:'🥇',crown:'👑',gem:'💎',
  skull:'💀',ghost:'👻',alien:'👽',robot:'🤖',poop:'💩',clown:'🤡',
  peace:'✌️',ok:'👌',fist:'✊',point:'👉',think:'🤔',shrug:'🤷',
};

async function handleEmojiSearch(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) { await sendReply(context.chatJid, '!emoji [name]\n\nExample: !emoji fire\n!emoji heart', sock, context.rawMessage.key, context.queue); return; }
  const query = args[0].toLowerCase();
  const matches = Object.entries(emojiData).filter(([k]) => k.includes(query));
  if (matches.length) {
    await sendReply(context.chatJid, matches.map(([k, v]) => `${v} ${k}`).join('\n'), sock, context.rawMessage.key, context.queue);
  } else {
    await sendReply(context.chatJid, `No emoji found for "${query}".`, sock, context.rawMessage.key, context.queue);
  }
}

async function handlePalette(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) { await sendReply(context.chatJid, '!palette [hex color]\n\nExample: !palette FF5733', sock, context.rawMessage.key, context.queue); return; }
  let hex = args[0].replace('#', '').toUpperCase();
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  if (!/^[0-9A-F]{6}$/.test(hex)) { await sendReply(context.chatJid, 'Invalid hex color.', sock, context.rawMessage.key, context.queue); return; }

  const r = parseInt(hex.slice(0,2), 16), g = parseInt(hex.slice(2,4), 16), b = parseInt(hex.slice(4,6), 16);
  // Generate complementary, analogous, and triadic
  const comp = [255-r, 255-g, 255-b].map(v => v.toString(16).padStart(2,'0')).join('').toUpperCase();
  const lighter = [Math.min(255,r+50), Math.min(255,g+50), Math.min(255,b+50)].map(v => v.toString(16).padStart(2,'0')).join('').toUpperCase();
  const darker = [Math.max(0,r-50), Math.max(0,g-50), Math.max(0,b-50)].map(v => v.toString(16).padStart(2,'0')).join('').toUpperCase();

  const colors = [darker, hex, lighter, comp];
  const blockW = 150, h = 120;
  const svg = `<svg width="${blockW * colors.length}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    ${colors.map((c, i) => `<rect x="${i*blockW}" width="${blockW}" height="${h}" fill="#${c}"/><text x="${i*blockW+blockW/2}" y="${h-10}" font-family="Arial" font-size="14" fill="white" text-anchor="middle" font-weight="bold">#${c}</text>`).join('')}
  </svg>`;
  try {
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    await sock.sendMessage(context.chatJid, { image: buffer, caption: `*COLOR PALETTE*\n\nBase: #${hex}\nDarker: #${darker}\nLighter: #${lighter}\nComplementary: #${comp}` }, { quoted: context.rawMessage });
  } catch {
    await sendReply(context.chatJid, `*COLOR PALETTE*\n\nBase: #${hex}\nDarker: #${darker}\nLighter: #${lighter}\nComplementary: #${comp}`, sock, context.rawMessage.key, context.queue);
  }
}

// ─── Register Creative Commands ─────────────────────────────────────────────

registerCommand({ name: 'doc', aliases: ['doc', 'document'], category: 'creative', description: 'Create a .docx document', execute: (ctx, args, sock, vars) => handleDoc(ctx, args, sock, vars) });
registerCommand({ name: 'topdf', aliases: ['topdf', 'pdf'], category: 'creative', description: 'Convert to PDF', execute: (ctx, _a, sock) => handleToPdf(ctx, sock) });
registerCommand({ name: 'todoc', aliases: ['todoc', 'todocx', 'toword'], category: 'creative', description: 'Convert PDF to DOCX', execute: (ctx, _a, sock) => handleToDoc(ctx, sock) });
registerCommand({ name: 'totxt', aliases: ['totxt', 'totext'], category: 'creative', description: 'Convert document to text', execute: (ctx, _a, sock) => handleToTxt(ctx, sock) });
registerCommand({ name: 'carbon', aliases: ['carbon', 'code'], category: 'creative', description: 'Code screenshot', execute: (ctx, args, sock) => handleCarbon(ctx, args, sock) });
registerCommand({ name: 'ss', aliases: ['ss', 'screenshot'], category: 'creative', description: 'Website screenshot', execute: (ctx, args, sock) => handleScreenshot(ctx, args, sock) });
registerCommand({ name: 'font', aliases: ['font', 'fancy', 'fonts', 'style'], category: 'creative', description: 'Convert text to fancy font', execute: (ctx, args, sock) => handleFont(ctx, args, sock) });
registerCommand({ name: 'reverse', aliases: ['reverse', 'rev'], category: 'creative', description: 'Reverse text', execute: (ctx, args, sock) => handleReverse(ctx, args, sock) });
registerCommand({ name: 'upper', aliases: ['upper', 'uppercase'], category: 'creative', description: 'Uppercase text', execute: (ctx, args, sock) => handleUpper(ctx, args, sock) });
registerCommand({ name: 'lower', aliases: ['lower', 'lowercase'], category: 'creative', description: 'Lowercase text', execute: (ctx, args, sock) => handleLower(ctx, args, sock) });
registerCommand({ name: 'mock', aliases: ['mock', 'spongebob'], category: 'creative', description: 'Mock text (sPoNgEbOb)', execute: (ctx, args, sock) => handleMock(ctx, args, sock) });
registerCommand({ name: 'clap', aliases: ['clap'], category: 'creative', description: 'Clap text', execute: (ctx, args, sock) => handleClap(ctx, args, sock) });
registerCommand({ name: 'tiny', aliases: ['tiny', 'superscript'], category: 'creative', description: 'Tiny text', execute: (ctx, args, sock) => handleTiny(ctx, args, sock) });
registerCommand({ name: 'fliptext', aliases: ['fliptext', 'upsidedown'], category: 'creative', description: 'Flip text upside down', execute: (ctx, args, sock) => handleFlipText(ctx, args, sock) });
registerCommand({ name: 'morse', aliases: ['morse'], category: 'creative', description: 'Morse code', execute: (ctx, args, sock) => handleMorse(ctx, args, sock) });
registerCommand({ name: 'braille', aliases: ['braille'], category: 'creative', description: 'Braille text', execute: (ctx, args, sock) => handleBraille(ctx, args, sock) });
registerCommand({ name: 'ascii', aliases: ['ascii', 'bigtext'], category: 'creative', description: 'ASCII art text', execute: (ctx, args, sock) => handleAsciiArt(ctx, args, sock) });
registerCommand({ name: 'color', aliases: ['color', 'colour', 'hex'], category: 'creative', description: 'Color info from hex', execute: (ctx, args, sock) => handleColor(ctx, args, sock) });
registerCommand({ name: 'emoji', aliases: ['emoji', 'emojisearch'], category: 'creative', description: 'Search emojis', execute: (ctx, args, sock) => handleEmojiSearch(ctx, args, sock) });
registerCommand({ name: 'palette', aliases: ['palette'], category: 'creative', description: 'Generate color palette', execute: (ctx, args, sock) => handlePalette(ctx, args, sock) });
