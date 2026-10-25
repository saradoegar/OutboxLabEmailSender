import React from 'react';
import { ArrowLeft, Star, Trash2, Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { EmailJob, JobStatus } from '../types';

interface EmailDetailViewProps {
  email: EmailJob;
  onBack: () => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({ email, onBack }) => {
  const formatDetailTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Sent
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-600 animate-pulse" />
            Pending in Queue
          </span>
        );
      case 'RESCHEDULED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-indigo-600" />
            Rescheduled (Rate Limit Reached)
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5 mr-1 text-red-600" />
            Failed
          </span>
        );
      default:
        return <span className="text-xs text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-white">
      {/* Top Header Bar */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-slate-900 truncate">
            {email.subject}
          </h2>
        </div>

        {/* Right icons */}
        <div className="flex items-center space-x-3 text-slate-400">
          <button className="p-1.5 hover:text-amber-400 transition">
            <Star className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:text-red-500 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real Email Content Body */}
      <div className="p-8 max-w-4xl space-y-6">
        {/* Recipient & Metadata Row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#00A843] text-white font-bold flex items-center justify-center text-sm">
              {email.recipientEmail.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-sm text-slate-900">
                  {email.recipientEmail.split('@')[0]}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  &lt;{email.recipientEmail}&gt;
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Target scheduled time: {formatDetailTime(email.scheduledAt)}
              </div>
            </div>
          </div>

          <div>
            {renderStatusBadge(email.status)}
          </div>
        </div>

        {/* Real Status Callout Box */}
        <div className="bg-[#FFFDF5] border-l-4 border-amber-400 p-4 rounded-r-xl space-y-1">
          <p className="text-xs font-bold text-amber-900">
            Delivery Details
          </p>
          <p className="text-xs text-amber-800">
            Target Execution: <span className="font-mono font-semibold">{formatDetailTime(email.scheduledAt)}</span>
            {email.sentAt && (
              <span className="ml-3">
                Delivered At: <span className="font-mono font-semibold">{formatDetailTime(email.sentAt)}</span>
              </span>
            )}
          </p>
          <p className="text-xs text-amber-700">
            Database Job ID: <span className="font-mono">{email.id}</span>
          </p>
        </div>

        {/* Real Email Body Text */}
        <div className="text-sm text-slate-800 leading-relaxed pt-2 border-t border-slate-100 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[#00A843] [&_blockquote]:bg-slate-50 [&_blockquote]:pl-3 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-2 [&_pre]:bg-slate-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:font-mono [&_pre]:text-xs [&_pre]:my-2 [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_strike]:line-through [&_s]:line-through">
          {email.body && email.body.includes('<') && email.body.includes('>') ? (
            <div dangerouslySetInnerHTML={{ __html: email.body }} />
          ) : (
            <div className="whitespace-pre-wrap">{email.body}</div>
          )}
        </div>
      </div>
    </div>
  );
};
