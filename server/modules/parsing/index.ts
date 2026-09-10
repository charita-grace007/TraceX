import { simpleParser } from 'mailparser';
import crypto from 'crypto';

export interface ParsedRawEmail {
  headers: Record<string, string[]>;
  from: string;
  fromDisplayName: string;
  fromEmail: string;
  replyTo: string;
  to: string;
  cc?: string;
  subject: string;
  date: string;
  messageId: string;
  receivedHeaders: string[];
  authResultsHeader: string;
  bodyText: string;
  bodyHtml: string;
  urls: string[];
  attachments: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
  }[];
}

export async function parseRawEmailHeaders(rawContent: string): Promise<ParsedRawEmail> {
  const normalizedContent = rawContent.replace(/^\s+/, '');
  const parsed = await simpleParser(normalizedContent);

  // Parse all header lines to preserve order and raw values
  const headersRecord: Record<string, string[]> = {};
  const receivedHeaders: string[] = [];
  let authResultsHeader = '';

  if (parsed.headerLines) {
    for (const lineObj of parsed.headerLines) {
      const key = lineObj.key.toLowerCase();
      const rawLine = lineObj.line;
      const value = rawLine.substring(rawLine.indexOf(':') + 1).trim();

      if (!headersRecord[key]) {
        headersRecord[key] = [];
      }
      headersRecord[key].push(value);

      if (key === 'received') {
        receivedHeaders.push(value);
      }
      if (key === 'authentication-results' && !authResultsHeader) {
        authResultsHeader = value;
      }
    }
  }

  // Parse From safely by casting to any to bypass union type resolution issues
  let fromEmail = '';
  let fromDisplayName = '';
  const parsedFrom = parsed.from as any;
  if (parsedFrom && parsedFrom.value && parsedFrom.value[0]) {
    fromEmail = parsedFrom.value[0].address || '';
    fromDisplayName = parsedFrom.value[0].name || '';
  }
  if (!fromEmail) {
    const fromHeader = headersRecord['from']?.[0] || '';
    const emailMatch = fromHeader.match(/<([^>]+)>/);
    if (emailMatch) {
      fromEmail = emailMatch[1].trim();
      fromDisplayName = fromHeader.replace(/<[^>]+>/, '').replace(/["']/g, '').trim();
    } else {
      fromEmail = fromHeader.trim();
      fromDisplayName = fromHeader.trim();
    }
  }

  // Parse To
  let toEmail = '';
  const parsedTo = parsed.to as any;
  if (parsedTo && parsedTo.value && parsedTo.value[0]) {
    toEmail = parsedTo.value[0].address || '';
  }
  if (!toEmail) {
    const toHeader = headersRecord['to']?.[0] || '';
    const emailMatch = toHeader.match(/<([^>]+)>/);
    toEmail = emailMatch ? emailMatch[1].trim() : toHeader.trim();
  }

  // Parse CC
  let ccEmail = '';
  const parsedCc = parsed.cc as any;
  if (parsedCc && parsedCc.value && parsedCc.value[0]) {
    ccEmail = parsedCc.value[0].address || '';
  }

  // Parse Reply-To
  let replyToEmail = '';
  const parsedReplyTo = parsed.replyTo as any;
  if (parsedReplyTo && parsedReplyTo.value && parsedReplyTo.value[0]) {
    replyToEmail = parsedReplyTo.value[0].address || '';
  }
  if (!replyToEmail) {
    replyToEmail = fromEmail;
  }

  const subject = parsed.subject || '(No Subject)';
  const date = parsed.date ? parsed.date.toISOString() : new Date().toISOString();
  const messageId = parsed.messageId || '';

  const bodyText = parsed.text || '';
  const bodyHtml = parsed.html || '';

  // Extract URLs safely from both text and HTML bodies
  const urlRegex = /(https?:\/\/[^\s"'>\(\)\[\]\{\}]+)/gi;
  const foundUrls = new Set<string>();

  const extractUrls = (text: string) => {
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      foundUrls.add(match[1]);
    }
  };

  if (bodyText) extractUrls(bodyText);
  if (bodyHtml) extractUrls(bodyHtml);

  // Extract real attachments mapped from MIME parts
  const parsedAttachments = (parsed.attachments || []).map((att, idx) => {
    const content = att.content || Buffer.alloc(0);
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    return {
      filename: att.filename || `unnamed-attachment-${idx}`,
      mimeType: att.contentType || 'application/octet-stream',
      sizeBytes: att.size || content.length,
      sha256,
    };
  });

  return {
    headers: headersRecord,
    from: parsed.from ? parsed.from.html || fromEmail : fromEmail,
    fromDisplayName: fromDisplayName || 'Unknown Sender',
    fromEmail,
    replyTo: replyToEmail,
    to: toEmail,
    cc: ccEmail || undefined,
    subject,
    date,
    messageId,
    receivedHeaders,
    authResultsHeader,
    bodyText,
    bodyHtml,
    urls: Array.from(foundUrls),
    attachments: parsedAttachments,
  };
}
