import React from 'react';
import { FileText, FileCode, CheckCircle, AlertTriangle, ShieldCheck, Download, FileArchive } from 'lucide-react';
import { EmailCase } from '@/src/types/index.ts';

interface AttachmentsDetailsProps {
  emailCase: EmailCase;
}

export const AttachmentsDetails: React.FC<AttachmentsDetailsProps> = ({ emailCase }) => {
  const { attachments } = emailCase;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAttachmentIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="h-5 w-5 text-rose-500 shrink-0" />;
    if (['doc', 'docx', 'docm'].includes(ext || '')) return <FileCode className="h-5 w-5 text-indigo-600 shrink-0" />;
    if (['zip', 'rar', 'iso', '7z'].includes(ext || '')) return <FileArchive className="h-5 w-5 text-amber-500 shrink-0" />;
    return <FileText className="h-5 w-5 text-slate-500 shrink-0" />;
  };

  const getVerdictClass = (verdict: string) => {
    switch (verdict) {
      case 'MALICIOUS':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold';
      case 'SUSPICIOUS':
        return 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="rounded-3xl border border-purple-100/70 bg-purple-50/20 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#2E1C4D]">
          Enclosed Attachment Resources
        </h3>
        <span className="rounded-full bg-white px-3 py-0.5 font-mono text-[10px] text-[#6A5A82] border border-purple-200/70 shadow-xs">
          {attachments.length} files
        </span>
      </div>

      {attachments.length === 0 ? (
        <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/70 p-4 text-center text-xs font-mono text-emerald-800 flex items-center justify-center gap-2 shadow-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>No attachment payloads enclosed in email body.</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="rounded-2xl border border-purple-100/60 bg-white/90 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all hover:bg-white hover:border-purple-200/80 shadow-xs"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 p-2 rounded-xl bg-purple-50/50 border border-purple-100/70 shadow-xs">
                  {getAttachmentIcon(att.filename)}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="font-semibold text-[#2E1C4D] truncate font-mono">
                    {att.filename}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-[#6A5A82]">
                    <span>Size: <strong className="text-[#2E1C4D]">{formatBytes(att.sizeBytes)}</strong></span>
                    <span className="text-purple-200">•</span>
                    <span className="truncate max-w-[200px]" title={att.mimeType}>Type: {att.mimeType}</span>
                  </div>
                  {att.sha256 && (
                    <div className="text-[9px] text-[#8A79A2] font-mono truncate max-w-[340px] md:max-w-[480px]">
                      SHA256: <strong className="text-[#6A5A82]">{att.sha256}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 shrink-0 sm:self-center">
                <span className={`rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-xs ${getVerdictClass(att.threatVerdict)}`}>
                  {att.threatVerdict === 'MALICIOUS' ? (
                    <AlertTriangle className="h-3 w-3 text-rose-600" />
                  ) : att.threatVerdict === 'SUSPICIOUS' ? (
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                  ) : (
                    <CheckCircle className="h-3 w-3 text-emerald-600" />
                  )}
                  <span>{att.threatVerdict}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
