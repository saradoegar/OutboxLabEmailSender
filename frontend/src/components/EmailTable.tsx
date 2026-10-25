import React from 'react';
import { EmailJob, JobStatus } from '../types';
import { Mail, Clock, CheckCircle2, AlertTriangle, XCircle, Calendar } from 'lucide-react';

interface EmailTableProps {
  emails: EmailJob[];
  isLoading: boolean;
  activeTab: 'SCHEDULED' | 'SENT';
  onRefresh: () => void;
}

export const EmailTable: React.FC<EmailTableProps> = ({
  emails,
  isLoading,
  activeTab,
}) => {
  // Status badge styling
  const renderStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            Sent
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1 text-amber-600 animate-pulse" />
            Pending
          </span>
        );
      case 'RESCHEDULED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <AlertTriangle className="w-3 h-3 mr-1 text-indigo-600" />
            Rescheduled (Rate Limit)
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 mr-1 text-red-600" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Skeleton loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/4" />
                <div className="h-3 bg-slate-50 rounded w-1/2" />
              </div>
              <div className="h-6 bg-slate-100 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (emails.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center mb-3">
          <Mail className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">
          No {activeTab === 'SCHEDULED' ? 'scheduled' : 'sent'} emails found
        </h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          {activeTab === 'SCHEDULED'
            ? 'There are currently no pending jobs in the BullMQ queue. Click "Compose New Email" to schedule outreach.'
            : 'Sent or throttled emails will appear here once processed by the background worker.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-6">Recipient</th>
              <th className="py-3.5 px-6">Subject</th>
              <th className="py-3.5 px-6">
                {activeTab === 'SCHEDULED' ? 'Scheduled Target Time' : 'Sent / Processed Time'}
              </th>
              <th className="py-3.5 px-6 text-right">Queue Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {emails.map((email) => (
              <tr key={email.id} className="hover:bg-slate-50/60 transition group">
                {/* Recipient */}
                <td className="py-4 px-6 font-medium text-slate-800">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {email.recipientEmail.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate max-w-[200px] sm:max-w-[260px]">{email.recipientEmail}</span>
                  </div>
                </td>

                {/* Subject & Preview */}
                <td className="py-4 px-6 text-slate-600">
                  <div className="max-w-md">
                    <p className="font-medium text-slate-800 truncate">{email.subject}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{email.body}</p>
                  </div>
                </td>

                {/* Target Time */}
                <td className="py-4 px-6 text-xs text-slate-500 font-mono whitespace-nowrap">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {activeTab === 'SCHEDULED'
                        ? formatDateTime(email.scheduledAt)
                        : formatDateTime(email.sentAt || email.createdAt)}
                    </span>
                  </div>
                </td>

                {/* Status Badge */}
                <td className="py-4 px-6 text-right whitespace-nowrap">
                  {renderStatusBadge(email.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
