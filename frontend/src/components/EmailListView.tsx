import React from 'react';
import { EmailJob, JobStatus } from '../types';
import { Search, Filter, RotateCcw, Clock, Star, Mail, CheckCircle2 } from 'lucide-react';

interface EmailListViewProps {
  emails: EmailJob[];
  selectedEmailId?: string;
  activeTab: 'SCHEDULED' | 'SENT';
  searchQuery: string;
  isLoading: boolean;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onSelectEmail: (email: EmailJob) => void;
}

export const EmailListView: React.FC<EmailListViewProps> = ({
  emails,
  selectedEmailId,
  activeTab,
  searchQuery,
  isLoading,
  onSearchChange,
  onRefresh,
  onSelectEmail,
}) => {
  const formatBadgeTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Pending';
    try {
      const d = new Date(dateStr);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = days[d.getDay()] || '';
      const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${dayName} ${time}`;
    } catch {
      return dateStr;
    }
  };

  const renderBadge = (status: JobStatus, scheduledAt: string) => {
    if (status === 'SENT') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F1F3F5] text-[#6C757D]">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
          Sent
        </span>
      );
    }

    if (status === 'RESCHEDULED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700">
          <Clock className="w-3 h-3 mr-1 text-indigo-600" />
          Rescheduled
        </span>
      );
    }

    if (status === 'FAILED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700">
          Failed
        </span>
      );
    }

    // Default Scheduled (PENDING)
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FFF3E0] text-[#D97706]">
        <Clock className="w-3 h-3 mr-1" />
        {formatBadgeTime(scheduledAt)}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
      {/* Top Search Bar */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between space-x-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search emails..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#F0F2F5] hover:bg-[#EBEEF2] focus:bg-white text-xs text-slate-800 rounded-full border border-transparent focus:border-slate-300 outline-none transition"
          />
        </div>

        <div className="flex items-center space-x-1 text-slate-400 flex-shrink-0">
          <button
            title="Filter"
            className="p-1.5 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRefresh}
            title="Refresh from server"
            className="p-1.5 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-700' : ''}`} />
          </button>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {isLoading && emails.length === 0 ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="space-y-2 animate-pulse">
                <div className="w-24 h-3.5 bg-slate-100 rounded" />
                <div className="w-40 h-4 bg-slate-100 rounded" />
                <div className="w-full h-3 bg-slate-50 rounded" />
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
              <Mail className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">
              No {activeTab === 'SCHEDULED' ? 'scheduled' : 'sent'} emails
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
              Click &quot;Compose&quot; in the sidebar to schedule real outreach.
            </p>
          </div>
        ) : (
          emails.map((email) => {
            const isSelected = email.id === selectedEmailId;

            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email)}
                className={`p-4 cursor-pointer transition relative group ${
                  isSelected
                    ? 'bg-[#F4FBF6] border-l-4 border-[#00A843]'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                {/* Header Row: Recipient & Badge */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                    To: {email.recipientEmail}
                  </span>
                  <div>{renderBadge(email.status, email.scheduledAt)}</div>
                </div>

                {/* Subject */}
                <p className="text-xs font-semibold text-slate-800 truncate mb-0.5">
                  {email.subject}
                </p>

                {/* Body Snippet */}
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {email.body.replace(/<[^>]*>?/gm, '')}
                </p>

                {/* Star icon */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="absolute right-3 bottom-3 text-slate-300 hover:text-amber-400 transition"
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
