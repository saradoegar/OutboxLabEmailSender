import React, { useState } from 'react';
import Papa from 'papaparse';
import { X, Upload, Clock, AlertCircle, CheckCircle, Send } from 'lucide-react';
import { scheduleEmailBatch } from '../services/api';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId?: string;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userId,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [manualEmails, setManualEmails] = useState('');
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(Date.now() + 60 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // Extract valid emails from text or CSV
  const extractValidEmails = (rawList: string[]): string[] => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const clean = rawList
      .map((e) => e.trim().toLowerCase())
      .filter((e) => emailRegex.test(e));
    return Array.from(new Set(clean));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const flattened = (results.data as string[][]).flat();
        const valid = extractValidEmails(flattened);
        setParsedEmails(valid);
        setErrorMessage('');
      },
      error: (err) => {
        setErrorMessage(`CSV Parsing error: ${err.message}`);
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Combine uploaded and manual emails
    const manualList = manualEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    const allRecipients = extractValidEmails([...parsedEmails, ...manualList]);

    if (allRecipients.length === 0) {
      setErrorMessage('Please provide at least one valid recipient email (via CSV or manual input).');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Please enter an email subject.');
      return;
    }

    if (!body.trim()) {
      setErrorMessage('Please enter an email body.');
      return;
    }

    setIsLoading(true);

    try {
      await scheduleEmailBatch({
        recipients: allRecipients,
        subject,
        body,
        scheduledAt: new Date(scheduledAt).toISOString(),
        delaySeconds,
        hourlyLimit,
        userId,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to schedule emails.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalRecipientsCount = extractValidEmails([
    ...parsedEmails,
    ...manualEmails.split(/[\n,;]+/).filter(Boolean),
  ]).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Compose & Schedule Batch</h3>
            <p className="text-xs text-slate-500 mt-0.5">Automate and throttle outreach emails via BullMQ</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Lead Upload / Recipients Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Recipients (CSV / TXT or Manual)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* File Dropzone */}
              <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/50 hover:bg-indigo-50/30">
                <Upload className="w-6 h-6 text-indigo-500 mb-1" />
                <span className="text-xs font-medium text-slate-700">Upload Leads (.csv, .txt)</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Auto-parses email column</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Manual input */}
              <textarea
                value={manualEmails}
                onChange={(e) => setManualEmails(e.target.value)}
                placeholder="Or paste emails (separated by comma or newline)..."
                rows={3}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
              />
            </div>

            {/* Detected count indicator */}
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="inline-flex items-center font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                {totalRecipientsCount} email{totalRecipientsCount === 1 ? '' : 's'} detected
              </span>
              {parsedEmails.length > 0 && (
                <button
                  type="button"
                  onClick={() => setParsedEmails([])}
                  className="text-slate-400 hover:text-red-500 text-[11px]"
                >
                  Clear uploaded CSV
                </button>
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Partnership Opportunity with ReachInbox"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              required
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Body (HTML or Plain Text)
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi there,&#10;&#10;I wanted to follow up regarding our recent conversation..."
              rows={4}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-y"
              required
            />
          </div>

          {/* Scheduling & Throttling Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Start Time */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Start Date & Time
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono"
                  required
                />
              </div>
            </div>

            {/* Delay between individual emails */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Delay Between Emails
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none pr-10"
                />
                <span className="absolute right-3 text-xs text-slate-400 pointer-events-none">sec</span>
              </div>
            </div>

            {/* Hourly Rate Limit */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Max / Hour Limit
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none pr-12"
                />
                <span className="absolute right-3 text-xs text-slate-400 pointer-events-none">/ hr</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || totalRecipientsCount === 0}
              className="inline-flex items-center px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-sm shadow-indigo-200"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  <span>Scheduling Queue...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  <span>Schedule {totalRecipientsCount} Email{totalRecipientsCount === 1 ? '' : 's'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
