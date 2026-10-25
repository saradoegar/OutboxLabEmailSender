import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import {
  ArrowLeft,
  Clock,
  Upload,
  ChevronDown,
  X,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  List,
  ListOrdered,
  Quote,
  Code,
  Strikethrough,
  AlertCircle,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { scheduleEmailBatch } from '../services/api';
import { User } from '../types';

interface ComposeViewProps {
  user: User;
  onBack: () => void;
  onSuccess: () => void;
}

export const ComposeView: React.FC<ComposeViewProps> = ({ user, onBack, onSuccess }) => {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualEmailInput, setManualEmailInput] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync initial body if provided
  useEffect(() => {
    if (editorRef.current && body && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = body;
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      setBody(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      setBody(editorRef.current.innerHTML);
    }
  };
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(10);
  const [scheduledAt, setScheduledAt] = useState(() => {
    // Default to 15 seconds from now
    const d = new Date(Date.now() + 15 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle CSV / TXT lead upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const flattened = (results.data as string[][]).flat();
        const valid = flattened
          .map((item) => item?.trim().toLowerCase())
          .filter((item) => item && emailRegex.test(item));

        if (valid.length > 0) {
          setRecipients((prev) => Array.from(new Set([...prev, ...valid])));
          setErrorMessage('');
        } else {
          setErrorMessage('No valid email addresses found in the uploaded file.');
        }
      },
      error: (err) => {
        setErrorMessage(`CSV Parsing error: ${err.message}`);
      },
    });
  };

  const handleAddManualEmail = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = manualEmailInput.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (trimmed && emailRegex.test(trimmed)) {
        if (!recipients.includes(trimmed)) {
          setRecipients([...recipients, trimmed]);
        }
        setManualEmailInput('');
        setErrorMessage('');
      } else if (trimmed) {
        setErrorMessage('Please enter a valid email address.');
      }
    }
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    setRecipients(recipients.filter((r) => r !== emailToRemove));
  };

  const handleSendLater = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    let finalRecipients = [...recipients];
    const trimmedInput = manualEmailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (trimmedInput && emailRegex.test(trimmedInput) && !finalRecipients.includes(trimmedInput)) {
      finalRecipients.push(trimmedInput);
      setRecipients(finalRecipients);
      setManualEmailInput('');
    }

    if (finalRecipients.length === 0) {
      setErrorMessage('Please enter at least one recipient email or upload a CSV file.');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Please enter an email subject.');
      return;
    }

    const currentHtml = editorRef.current ? editorRef.current.innerHTML : body;
    const textContent = editorRef.current ? (editorRef.current.innerText || '').trim() : body.trim();

    if (!textContent && (!currentHtml || currentHtml === '<br>' || currentHtml === '<div><br></div>' || !currentHtml.trim())) {
      setErrorMessage('Please enter the email body.');
      return;
    }

    setIsSubmitting(true);

    try {
      await scheduleEmailBatch({
        recipients: finalRecipients,
        subject,
        body: currentHtml,
        scheduledAt: new Date(scheduledAt).toISOString(),
        delaySeconds,
        hourlyLimit,
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.name,
      });

      setSuccessMessage(`Successfully enqueued ${finalRecipients.length} email(s) into BullMQ!`);

      // Refresh parent and return to Scheduled tab after 600ms
      setTimeout(() => {
        onSuccess();
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to schedule emails.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-white p-6 md:p-8">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Compose New Email</h1>
        </div>

        {/* Action icons & "Send Later" button */}
        <div className="flex items-center space-x-4">
          {/* Schedule clock toggle */}
          <button
            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            title="Set target timestamp"
            className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg transition flex items-center space-x-1"
          >
            <Clock className="w-5 h-5" />
            <span className="text-xs font-mono text-slate-500">
              {new Date(scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>

          {/* Send Later Button */}
          <button
            type="button"
            onClick={handleSendLater}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-full border border-[#00A843] bg-[#00A843] text-white hover:bg-[#00923a] font-medium text-xs transition flex items-center space-x-1.5 disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-1.5">
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Scheduling...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <Send className="w-3.5 h-3.5" />
                <span>Send Later</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Date Picker Drawer if Clock icon clicked */}
      {isDatePickerOpen && (
        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700">Scheduled Target Time:</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono outline-none"
          />
        </div>
      )}

      {/* Form Fields */}
      <div className="mt-6 space-y-4 max-w-4xl">
        {/* From Row */}
        <div className="flex items-center space-x-4">
          <span className="text-xs text-slate-400 w-16">From</span>
          <div className="inline-flex items-center space-x-2 bg-[#F0F2F5] px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-800">
            <span>{user?.email || 'oliver.brown@domain.io'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* To Row with Real Tags and Upload List */}
        <div className="flex items-start space-x-4 pt-1">
          <span className="text-xs text-slate-400 w-16 pt-2">To</span>
          <div className="flex-1 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
            {/* Display recipient tags */}
            {recipients.map((r) => (
              <span
                key={r}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#E8F5E9] text-[#00A843] border border-[#C8E6C9]"
              >
                {r}
                <button
                  type="button"
                  onClick={() => handleRemoveRecipient(r)}
                  className="ml-1 text-[#00A843] hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Input to type new email */}
            <input
              type="text"
              value={manualEmailInput}
              onChange={(e) => setManualEmailInput(e.target.value)}
              onKeyDown={handleAddManualEmail}
              placeholder={recipients.length === 0 ? "Type recipient email and press enter..." : "Add another..."}
              className="text-xs text-slate-700 outline-none flex-1 min-w-[220px] py-1"
            />

            {/* Upload List (CSV) */}
            <label className="ml-auto inline-flex items-center space-x-1.5 text-xs text-[#00A843] font-medium cursor-pointer hover:underline pl-2">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload List (.csv)</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Subject Row */}
        <div className="flex items-center space-x-4 border-b border-slate-100 pb-3">
          <span className="text-xs text-slate-400 w-16">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none font-medium"
          />
        </div>

        {/* Delay & Hourly Limit Row */}
        <div className="flex items-center space-x-8 py-2">
          {/* Delay */}
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-700 font-medium">Delay between 2 emails</span>
            <input
              type="number"
              min="0"
              max="60"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Number(e.target.value))}
              className="w-14 px-2 py-1.5 text-center text-xs font-mono border border-slate-200 rounded-lg outline-none focus:border-slate-400"
            />
            <span className="text-xs text-slate-400">sec</span>
          </div>

          {/* Hourly Limit */}
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-700 font-medium">Hourly Limit</span>
            <input
              type="number"
              min="1"
              max="1000"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              className="w-14 px-2 py-1.5 text-center text-xs font-mono border border-slate-200 rounded-lg outline-none focus:border-slate-400"
            />
            <span className="text-xs text-slate-400">/ hr</span>
          </div>
        </div>

        {/* Rich Text Editor Box */}
        <div className="border border-slate-200 rounded-2xl bg-[#F9FAFB] overflow-hidden mt-2 shadow-sm">
          {/* Functional Toolbar */}
          <div className="flex items-center space-x-1 px-3 py-2 bg-white border-b border-slate-200 text-slate-600 overflow-x-auto text-xs select-none">
            {/* History */}
            <button
              type="button"
              title="Undo (Ctrl+Z)"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('undo');
              }}
              className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Redo (Ctrl+Y)"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('redo');
              }}
              className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1.5" />

            {/* In-line Formatting */}
            <button
              type="button"
              title="Bold (Ctrl+B)"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('bold');
              }}
              className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition font-bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Italic (Ctrl+I)"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('italic');
              }}
              className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Underline (Ctrl+U)"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('underline');
              }}
              className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Strikethrough"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('strikeThrough');
              }}
              className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1.5" />

            {/* Alignment */}
            <button
              type="button"
              title="Align Left"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('justifyLeft');
              }}
              className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Align Center"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('justifyCenter');
              }}
              className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1.5" />

            {/* Lists */}
            <button
              type="button"
              title="Numbered List"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('insertOrderedList');
              }}
              className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Bullet List"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('insertUnorderedList');
              }}
              className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition"
            >
              <List className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1.5" />

            {/* Blocks */}
            <button
              type="button"
              title="Quote Block"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('formatBlock', 'blockquote');
              }}
              className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Code Block"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('formatBlock', 'pre');
              }}
              className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ContentEditable Rich Text Area with Placeholder */}
          <div
            className="relative min-h-[240px] bg-white cursor-text"
            onClick={() => editorRef.current?.focus()}
          >
            {(!body || body === '<br>' || body === '<div><br></div>' || body.trim() === '') && (
              <div className="absolute top-4 left-4 text-sm text-slate-400 pointer-events-none select-none">
                Type Your Reply...
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              className="w-full min-h-[240px] max-h-[500px] overflow-y-auto p-4 bg-transparent text-sm text-slate-800 outline-none leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[#00A843] [&_blockquote]:bg-slate-50 [&_blockquote]:pl-3 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-2 [&_pre]:bg-slate-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:font-mono [&_pre]:text-xs [&_pre]:my-2 [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_strike]:line-through [&_s]:line-through"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
