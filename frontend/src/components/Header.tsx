import React from 'react';
import { User, SlackStatus } from '../types';
import { Mail, CheckCircle2, LogOut, ExternalLink } from 'lucide-react';

interface HeaderProps {
  user: User;
  slackStatus: SlackStatus;
  onLogout: () => void;
  onRefreshSlack: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, slackStatus, onLogout }) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleConnectSlack = () => {
    const userIdParam = user.id ? `?userId=${encodeURIComponent(user.id)}` : '';
    window.location.href = `${apiBaseUrl}/api/slack/oauth/start${userIdParam}`;
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">ReachInbox</span>
              <span className="ml-1.5 text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                Outbox
              </span>
            </div>
          </div>

          {/* Right Actions: Queue Dashboard, Slack Status, User Profile */}
          <div className="flex items-center space-x-4">
            {/* Bull-Board Live Queue Link */}
            <a
              href={`${apiBaseUrl}/admin/queues`}
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition"
            >
              <span>Queue Metrics</span>
              <ExternalLink className="w-3 h-3 ml-1.5 opacity-70" />
            </a>

            {/* Slack Integration Status */}
            {slackStatus.connected ? (
              <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                <span>Slack Connected</span>
                {slackStatus.channel && (
                  <span className="ml-1 opacity-75 font-mono">({slackStatus.channel})</span>
                )}
              </div>
            ) : (
              <button
                onClick={handleConnectSlack}
                className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.527 2.527 0 0 1 2.523 2.522A2.527 2.527 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
                <span>Connect Slack</span>
              </button>
            )}

            {/* User Profile */}
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</p>
                <p className="text-xs text-slate-500 leading-tight truncate max-w-[150px]">{user.email}</p>
              </div>

              <button
                onClick={onLogout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
