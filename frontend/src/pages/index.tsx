import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { LoginScreen } from '../components/LoginScreen';
import { Sidebar } from '../components/Sidebar';
import { EmailListView } from '../components/EmailListView';
import { ComposeView } from '../components/ComposeView';
import { EmailDetailView } from '../components/EmailDetailView';
import { User, EmailJob, SlackStatus } from '../types';
import { getScheduledEmails, getSentEmails, searchEmails, getSlackStatus } from '../services/api';
import { Mail } from 'lucide-react';

type DashboardView = 'LIST' | 'COMPOSE';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'SCHEDULED' | 'SENT'>('SCHEDULED');
  const [currentView, setCurrentView] = useState<DashboardView>('LIST');
  const [selectedEmail, setSelectedEmail] = useState<EmailJob | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real dynamic states loaded strictly from backend
  const [emails, setEmails] = useState<EmailJob[]>([]);
  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [sentCount, setSentCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });

  // Load user from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('reachinbox_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('reachinbox_user');
      }
    }
    setIsCheckingAuth(false);

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('slack') === 'connected') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Fetch real counts for both tabs from PostgreSQL
  const refreshCounts = useCallback(async () => {
    try {
      const [scheduledData, sentData] = await Promise.all([
        getScheduledEmails(),
        getSentEmails(),
      ]);
      setScheduledCount(scheduledData ? scheduledData.length : 0);
      setSentCount(sentData ? sentData.length : 0);
    } catch (err) {
      console.error('Failed to update live counts from backend:', err);
    }
  }, []);

  // Fetch real emails for the active tab from PostgreSQL (or Elasticsearch if searching)
  const loadEmails = useCallback(async () => {
    setIsLoading(true);

    try {
      let fetched: EmailJob[] = [];
      if (searchQuery.trim()) {
        const statusFilter = activeTab === 'SCHEDULED' ? 'PENDING' : 'SENT';
        fetched = await searchEmails(searchQuery.trim(), statusFilter);
      } else {
        if (activeTab === 'SCHEDULED') {
          fetched = await getScheduledEmails();
          setScheduledCount(fetched ? fetched.length : 0);
        } else {
          fetched = await getSentEmails();
          setSentCount(fetched ? fetched.length : 0);
        }
      }

      setEmails(fetched || []);

      // Auto-select the first email if none is selected, or refresh selected email
      if (fetched && fetched.length > 0) {
        setSelectedEmail((prev) => {
          if (!prev) return fetched[0];
          const matched = fetched.find((e) => e.id === prev.id);
          return matched || fetched[0];
        });
      } else {
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error('Failed to load real emails from backend:', error);
      setEmails([]);
      setSelectedEmail(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery]);

  // Load Slack status from backend
  const loadSlackStatus = useCallback(async () => {
    try {
      const status = await getSlackStatus(user?.id, user?.email);
      setSlackStatus(status);
    } catch {
      // Ignored for dev
    }
  }, [user?.id, user?.email]);

  // Load on mount and tab change
  useEffect(() => {
    loadEmails();
    refreshCounts();
    loadSlackStatus();
  }, [activeTab, loadEmails, refreshCounts, loadSlackStatus]);

  // Real-time polling every 3 seconds to observe live queue status transitions
  useEffect(() => {
    const interval = setInterval(() => {
      loadEmails();
      refreshCounts();
    }, 3000);
    return () => clearInterval(interval);
  }, [loadEmails, refreshCounts]);

  // Search debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadEmails();
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery, loadEmails]);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('reachinbox_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('reachinbox_user');
    setEmails([]);
    setSelectedEmail(null);
    setScheduledCount(0);
    setSentCount(0);
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-8 h-8 border-3 border-[#00A843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Head>
          <title>Login | ONG Outbox</title>
        </Head>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>ONG Outbox | Email Job Scheduler</title>
      </Head>

      <div className="flex h-screen w-screen overflow-hidden bg-white">
        {/* Figma Sidebar (Left) */}
        <Sidebar
          user={user}
          activeTab={activeTab}
          scheduledCount={scheduledCount}
          sentCount={sentCount}
          slackStatus={slackStatus}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setCurrentView('LIST');
          }}
          onOpenCompose={() => setCurrentView('COMPOSE')}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex overflow-hidden">
          {currentView === 'COMPOSE' ? (
            /* Compose New Email View */
            <ComposeView
              user={user}
              onBack={() => setCurrentView('LIST')}
              onSuccess={() => {
                setActiveTab('SCHEDULED');
                setCurrentView('LIST');
                loadEmails();
                refreshCounts();
              }}
            />
          ) : (
            /* Master-Detail Two-Pane View (Email List on Left, Email Details on Right) */
            <div className="flex-1 flex h-full overflow-hidden">
              {/* Middle Column: Email List (w-[380px]) */}
              <div className="w-[380px] border-r border-slate-200 flex flex-col h-full bg-white flex-shrink-0">
                <EmailListView
                  emails={emails}
                  selectedEmailId={selectedEmail?.id}
                  activeTab={activeTab}
                  searchQuery={searchQuery}
                  isLoading={isLoading}
                  onSearchChange={setSearchQuery}
                  onRefresh={() => {
                    loadEmails();
                    refreshCounts();
                  }}
                  onSelectEmail={(email) => setSelectedEmail(email)}
                />
              </div>

              {/* Right Column: Email Detail Pane (flex-1) */}
              <div className="flex-1 h-full overflow-y-auto bg-white">
                {selectedEmail ? (
                  <EmailDetailView
                    email={selectedEmail}
                    onBack={() => setSelectedEmail(null)}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-3">
                      <Mail className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No email selected</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Click on an email from the list to display its recipient, subject, status, and full message body.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
