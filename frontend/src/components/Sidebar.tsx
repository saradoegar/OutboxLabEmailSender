import React, { useState } from 'react';
import { User, SlackStatus } from '../types';
import { Clock, Send, ChevronDown, LogOut, CheckCircle2, ExternalLink } from 'lucide-react';
import { disconnectSlack, connectSlack, getApiBaseUrl } from '../services/api';

interface SidebarProps {
  user: User;
  activeTab: 'SCHEDULED' | 'SENT';
  scheduledCount: number;
  sentCount: number;
  slackStatus: SlackStatus;
  onSelectTab: (tab: 'SCHEDULED' | 'SENT') => void;
  onOpenCompose: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  scheduledCount,
  sentCount,
  slackStatus,
  onSelectTab,
  onOpenCompose,
  onLogout,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const apiBaseUrl = getApiBaseUrl();

  const handleConnectSlack = async () => {
    setIsConnecting(true);
    try {
      // In-page connection without redirecting to localhost
      await connectSlack(user?.id, user?.email);
      window.location.reload();
    } catch {
      const apiBaseUrl = getApiBaseUrl();
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const query = `?userId=${encodeURIComponent(user?.id || '')}&userEmail=${encodeURIComponent(user?.email || '')}&redirectUrl=${encodeURIComponent(currentOrigin)}`;
      window.location.href = `${apiBaseUrl}/api/slack/oauth/start${query}`;
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectSlack = async () => {
    try {
      await disconnectSlack(user?.id, user?.email);
      window.location.reload();
    } catch (err) {
      console.error('Failed to disconnect Slack:', err);
    }
  };

  return (
    <aside className="w-64 border-r border-slate-200 bg-white min-h-screen flex flex-col p-5 select-none flex-shrink-0">
      {/* 1. Logo "ONG" */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-1.5 cursor-pointer">
          <span className="text-2xl font-black tracking-tighter text-slate-900 font-mono">
            ONG
          </span>
        </div>
      </div>

      {/* 2. User Card with Dropdown */}
      <div className="relative mb-4">
        <div
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F4F5F7] hover:bg-[#EAECEF] cursor-pointer transition border border-slate-100"
        >
          <div className="flex items-center space-x-2.5 overflow-hidden">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-900 truncate leading-tight">
                {user.name}
              </p>
              <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                {user.email}
              </p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 text-xs animate-in fade-in duration-100">
            {/* Slack Connection */}
            <div className="px-3 py-2 border-b border-slate-100">
              {slackStatus.connected ? (
                <div className="flex items-center text-emerald-700 font-medium space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Slack Connected</span>
                  {slackStatus.channel && <span className="text-[10px] opacity-75">({slackStatus.channel})</span>}
                </div>
              ) : (
                <button
                  onClick={handleConnectSlack}
                  className="w-full text-left text-indigo-600 font-medium hover:text-indigo-700 flex items-center space-x-1"
                >
                  <span>Connect Slack</span>
                </button>
              )}
            </div>

            {/* BullMQ Dashboard */}
            <a
              href={`${apiBaseUrl}/admin/queues`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 text-slate-700 hover:bg-slate-50"
            >
              <span>Queue Metrics</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Compose Button */}
      <button
        onClick={onOpenCompose}
        className="w-full py-2.5 px-4 mb-6 rounded-full border border-[#00A843] text-[#00A843] hover:bg-[#E8F5E9] font-medium text-sm transition text-center shadow-2xs"
      >
        Compose
      </button>

      {/* 4. Core Navigation Section */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          CORE
        </p>

        {/* Scheduled Tab */}
        <button
          onClick={() => onSelectTab('SCHEDULED')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
            activeTab === 'SCHEDULED'
              ? 'bg-[#E8F5E9] text-slate-900 font-semibold'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Clock className={`w-4 h-4 ${activeTab === 'SCHEDULED' ? 'text-slate-800' : 'text-slate-500'}`} />
            <span>Scheduled</span>
          </div>
          <span className="text-xs text-slate-400 font-normal">{scheduledCount}</span>
        </button>

        {/* Sent Tab */}
        <button
          onClick={() => onSelectTab('SENT')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
            activeTab === 'SENT'
              ? 'bg-[#E8F5E9] text-slate-900 font-semibold'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Send className={`w-4 h-4 ${activeTab === 'SENT' ? 'text-slate-800' : 'text-slate-500'}`} />
            <span>Sent</span>
          </div>
          <span className="text-xs text-slate-400 font-normal">{sentCount}</span>
        </button>
      </div>

      {/* Slack integration bottom badge */}
      <div className="mt-auto pt-4 border-t border-slate-100">
        {slackStatus.connected ? (
          <div className="flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
            <span className="flex items-center font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              Slack Connected ({slackStatus.channel || '#email-alerts'})
            </span>
            <button
              onClick={handleDisconnectSlack}
              title="Disconnect Slack"
              className="text-[11px] text-slate-400 hover:text-red-500 transition ml-1 px-1 font-bold"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectSlack}
            className="w-full text-left text-[11px] text-slate-600 hover:text-slate-900 flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition border border-dashed border-slate-200"
          >
            <span className="flex items-center font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-2" />
              + Connect Slack
            </span>
          </button>
        )}
      </div>
    </aside>
  );
};
