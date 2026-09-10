import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, Sparkles, AlertTriangle, RefreshCcw } from 'lucide-react';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngest: (rawEml: string, title?: string) => Promise<void>;
}

const SAMPLE_TEMPLATES = [
  {
    name: 'Sample 1: Credential Harvester (M365 Lure)',
    title: 'Phishing: Microsoft 365 Expiry Notice',
    content: `Received: from mail-relay.target-edge.gov (10.0.1.5) by mx01.cyber-agency.gov.in with ESMTPS; Tue, 08 Sep 2026 06:30:10 +0000
Received: from unknown-node-44.hostroyale.ru (185.220.101.44) by relay-edge.cloudflare.net with ESMTP; Tue, 08 Sep 2026 06:30:00 +0000
Authentication-Results: mx01.cyber-agency.gov.in;
  spf=fail (sender IP 185.220.101.44 is not authorized);
  dkim=fail;
  dmarc=fail (p=reject) header.from=login-micros0ft-portal.net
From: "Microsoft Security Team" <admin@login-micros0ft-portal.net>
Reply-To: credential-drop@portal-auth-verification.com
To: user-support@agency.gov.in
Subject: URGENT: Action Required - Maintain Your Single Sign-On Access
Date: Tue, 08 Sep 2026 06:30:00 +0000

Your organization Microsoft 365 access requires authentication validation within 2 hours.
Please navigate to https://login-micros0ft-portal.net/auth/v2/session-renew?id=user-support to re-verify credentials.`,
  },
  {
    name: 'Sample 2: BEC / Executive Wire Diversion',
    title: 'Executive Wire Settlement Authorization',
    content: `Received: from mail.finance-corp.gov.in (10.12.0.8) by border-mta.nic.in with ESMTP; Tue, 08 Sep 2026 05:00:15 +0000
Received: from node89.ovh-cloud-services.net (51.89.144.202) by mail.finance-corp.gov.in with ESMTP; Tue, 08 Sep 2026 05:00:00 +0000
Authentication-Results: mail.finance-corp.gov.in;
  spf=softfail;
  dkim=none;
  dmarc=fail (p=quarantine)
From: "Dr. Rajesh Sharma (Director General)" <director.general@finance-corp-advisory.co>
Reply-To: r.sharma-private-office@executive-board-notice.org
To: treasury-head@finance-corp.gov.in
Subject: CONFIDENTIAL: Immediate Authorization for Vendor Acquisition Settlement
Date: Tue, 08 Sep 2026 05:00:00 +0000

Please find attached the signed payment mandate for RTGS disbursal of INR 4,85,00,000.
Process this morning prior to 11:00 AM.
Attachment: RTGS_Mandate_Settlement_Doc.pdf`,
  },
  {
    name: 'Sample 3: Conflicting Intel (Valid DKIM + Macro)',
    title: 'Logistics Manifest with Obfuscated Macro',
    content: `Received: from gateway.enterprise.gov.in (10.0.4.1) by internal-store; Mon, 07 Sep 2026 14:10:05 +0000
Received: from mail.partner-logistics.in (203.122.45.10) by gateway.enterprise.gov.in with ESMTPS; Mon, 07 Sep 2026 14:10:00 +0000
Authentication-Results: gateway.enterprise.gov.in;
  spf=pass;
  dkim=pass header.d=partner-logistics.in;
  dmarc=pass
From: "Apex Logistics Support" <dispatch@partner-logistics.in>
To: supply-chain@enterprise.gov.in
Subject: Shipping Manifest & Customs Clearance Acknowledgment #IN-90812
Date: Mon, 07 Sep 2026 14:10:00 +0000

Attached is the customs bill of lading. If prompted by Microsoft Word security bar, enable macros to view encrypted barcode.
Attachment: Customs_Clearance_IN90812.docm`,
  },
];

export const IngestModal: React.FC<IngestModalProps> = ({ isOpen, onClose, onIngest }) => {
  const [rawContent, setRawContent] = useState(SAMPLE_TEMPLATES[0].content);
  const [title, setTitle] = useState(SAMPLE_TEMPLATES[0].title);
  const [loading, setLoading] = useState(false);

  // Drag-and-drop state handles
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileRead = (file: File) => {
    if (!file) return;
    
    const isEml = file.name.toLowerCase().endsWith('.eml') || file.type === 'message/rfc822';
    if (!isEml) {
      setErrorMessage('Unsupported file extension. Please select a valid email metadata file (.eml).');
      setFileName(null);
      setFileSize(null);
      return;
    }

    setErrorMessage(null);
    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setRawContent(content);
        const autoTitle = file.name.replace(/\.[^/.]+$/, "");
        setTitle(`EML Audit: ${autoTitle}`);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Error reading local file resource stream.');
    };
    reader.readAsText(file);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileRead(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileRead(e.target.files[0]);
    }
  };

  const clearUploadedFile = () => {
    setFileName(null);
    setFileSize(null);
    setErrorMessage(null);
    setRawContent('');
    setTitle('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawContent.trim()) return;
    setLoading(true);
    try {
      await onIngest(rawContent, title);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Forensic tokenization and MIME routing validation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2E1C4D]/30 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-purple-100/80 bg-white shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-100/70 px-6 py-4.5 bg-gradient-to-r from-purple-50/50 via-white to-pink-50/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-purple-200/80 bg-purple-50 text-purple-700 shadow-xs">
              <UploadCloud className="h-4 w-4 animate-bounce" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono tracking-wide text-[#2E1C4D] uppercase">
                Ingest Email Artifact (.EML)
              </h2>
              <p className="text-xs text-[#6A5A82]">
                Full server-side MIME tree decomposition, header alignment & security signature mapping
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#8A79A2] hover:bg-purple-50 hover:text-[#2E1C4D] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Preset Templates */}
          <div>
            <label className="text-xs font-mono font-medium text-[#6A5A82] mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-700" />
              <span>Or Select from Seeds:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    clearUploadedFile();
                    setRawContent(tmpl.content);
                    setTitle(tmpl.title);
                  }}
                  className="rounded-2xl border border-purple-100 bg-purple-50/20 p-2.5 text-left hover:border-purple-300 hover:bg-purple-50/60 transition-all text-xs shadow-xs cursor-pointer"
                >
                  <div className="font-semibold text-[#2E1C4D] truncate">{tmpl.name.split(':')[0]}</div>
                  <div className="text-[11px] text-[#6A5A82] truncate">{tmpl.title}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={onDrag}
            onDragOver={onDrag}
            onDragLeave={onDrag}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-purple-400 bg-purple-50/50 shadow-sm'
                : fileName
                ? 'border-emerald-300 bg-emerald-50/30'
                : 'border-purple-200/70 hover:border-purple-300 bg-purple-50/10'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileChange}
              accept=".eml"
              className="hidden"
            />
            
            {fileName ? (
              <div className="flex items-center justify-between gap-3 text-left bg-emerald-50/50 rounded-xl p-3 border border-emerald-200 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-8 w-8 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#2E1C4D] truncate font-mono">{fileName}</p>
                    <p className="text-[10px] text-emerald-700 font-mono">Real EML loaded • {fileSize}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearUploadedFile();
                  }}
                  className="rounded-xl p-1 text-[#8A79A2] hover:bg-emerald-100 hover:text-[#2E1C4D] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 py-2">
                <UploadCloud className="mx-auto h-8 w-8 text-purple-400" />
                <p className="text-xs font-mono font-medium text-[#2E1C4D]">
                  Drag & Drop <span className="text-purple-700 font-bold">.eml</span> file or click to browse
                </p>
                <p className="text-[10px] text-[#8A79A2] font-mono">
                  Reads MIME envelope structure, headers, raw parts & file signatures locally
                </p>
              </div>
            )}
          </div>

          {/* Validation Feedback Errors */}
          {errorMessage && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 flex gap-2.5 text-xs text-rose-800 font-mono shadow-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-medium text-[#6A5A82] mb-1.5">
              Incident Response Tag / Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hostile credential harvest lure"
              className="w-full rounded-2xl border border-purple-100/80 bg-[#fafaff] px-3.5 py-2 text-xs font-mono text-[#2E1C4D] placeholder-[#A090B5] focus:border-purple-400 focus:bg-white focus:outline-none shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[#6A5A82] mb-1.5">
              Raw Message Preview
            </label>
            <textarea
              rows={6}
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              placeholder="Paste raw email data content here..."
              className="w-full rounded-2xl border border-purple-100/80 bg-[#fafaff] p-3.5 font-mono text-[11px] text-[#2E1C4D] placeholder-[#A090B5] focus:border-purple-400 focus:bg-white focus:outline-none leading-relaxed shadow-2xs"
            />
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-3.5 text-[11px] text-[#6A5A82] flex items-start gap-2.5 shadow-2xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Real-time parser strips raw MIME boundaries, sanitizes HTML inputs, extracts attachment binaries for SHA-256 validation, and builds SPF, DKIM, DMARC telemetry blocks.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl px-4 py-2 text-xs font-medium text-[#6A5A82] hover:bg-purple-50 hover:text-[#2E1C4D] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !rawContent.trim()}
              className="flex items-center gap-2 rounded-2xl bg-purple-700 px-5 py-2 text-xs font-mono font-bold text-white shadow-sm hover:bg-purple-800 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                  <span>PARSING MIME TREE...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  <span>DECOMPOSE & INGEST</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
