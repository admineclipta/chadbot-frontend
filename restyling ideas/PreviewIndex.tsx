import React, { useState } from 'react';
import LoginPreview from './LoginPreview';
import DashboardPreview from './DashboardPreview';
import ChatPreview from './ChatPreview';
import UsersPreview from './UsersPreview';
import ContactsPreview from './ContactsPreview';
import AssistantsPreview from './AssistantsPreview';
import SettingsPreview from './SettingsPreview';
import {
  MessageCircle,
  Users,
  Contact,
  Bot,
  Settings,
  LogIn,
  MessageSquare
} from 'lucide-react';

type View = 'login' | 'dashboard' | 'chat' | 'users' | 'contacts' | 'assistants' | 'settings';

// Sidebar component for navigation
function Sidebar({ currentView, setCurrentView }: { currentView: View; setCurrentView: (view: View) => void }) {
  const views: { id: View; label: string; icon: any; section?: string }[] = [
    { id: 'login', label: 'Login', icon: LogIn, section: 'auth' },
    { id: 'dashboard', label: 'Dashboard', icon: MessageCircle, section: 'main' },
    { id: 'chat', label: 'Chat Solo', icon: MessageSquare, section: 'main' },
    { id: 'users', label: 'Usuarios', icon: Users, section: 'admin' },
    { id: 'contacts', label: 'Contactos', icon: Contact, section: 'admin' },
    { id: 'assistants', label: 'Asistentes', icon: Bot, section: 'admin' },
    { id: 'settings', label: 'Configuración', icon: Settings, section: 'admin' },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-lg">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-lg font-bold text-white">C</span>
          </div>
          <div>
            <div className="text-xl font-semibold text-slate-900">chadbot</div>
            <div className="text-xs text-slate-500">Design Preview</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Auth Section */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-500 px-3 py-2">
            AUTENTICACIÓN
          </div>
          {views.filter(v => v.section === 'auth').map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  currentView === view.id
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'text-slate-600 hover:bg-slate-100 hover:scale-102'
                }`}
              >
                <Icon className="w-5 h-5" />
                {view.label}
              </button>
            );
          })}
        </div>

        {/* Main Section */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-500 px-3 py-2">
            VISTAS PRINCIPALES
          </div>
          {views.filter(v => v.section === 'main').map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  currentView === view.id
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'text-slate-600 hover:bg-slate-100 hover:scale-102'
                }`}
              >
                <Icon className="w-5 h-5" />
                {view.label}
              </button>
            );
          })}
        </div>

        {/* Admin Section */}
        <div>
          <div className="text-xs font-semibold text-slate-500 px-3 py-2">
            ADMINISTRACIÓN
          </div>
          {views.filter(v => v.section === 'admin').map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  currentView === view.id
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'text-slate-600 hover:bg-slate-100 hover:scale-102'
                }`}
              >
                <Icon className="w-5 h-5" />
                {view.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Design Notes */}
      <div className="p-4 border-t border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-xs text-slate-600">
          <div className="font-semibold mb-2">✨ Efectos Mejorados:</div>
          <ul className="space-y-1 text-[11px]">
            <li>• Hover scale effects</li>
            <li>• Smooth transitions (200-300ms)</li>
            <li>• Dynamic shadows</li>
            <li>• Gradient backgrounds</li>
            <li>• Animated icons</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function PreviewIndex() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar Navigation */}
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Info Bar */}
        <div className="bg-slate-800 border-b border-slate-700 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-white font-medium">
                Vista Actual: <span className="text-blue-400">{currentView}</span>
              </div>
              <div className="h-4 w-px bg-slate-600"></div>
              <div className="text-slate-400 text-sm">
                Mockup estático para validación visual
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                Preview Mode
              </span>
              <span className="px-2 py-1 bg-emerald-600 text-white text-xs font-semibold rounded">
                7 Vistas
              </span>
            </div>
          </div>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-auto bg-white">
          {currentView === 'login' && <LoginPreview />}
          {currentView === 'dashboard' && (
            <div className="h-screen flex">
              <DashboardPreview />
            </div>
          )}
          {currentView === 'chat' && <ChatPreview />}
          {currentView === 'users' && (
            <div className="h-screen flex">
              <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
              <UsersPreview />
            </div>
          )}
          {currentView === 'contacts' && (
            <div className="h-screen flex">
              <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
              <ContactsPreview />
            </div>
          )}
          {currentView === 'assistants' && (
            <div className="h-screen flex">
              <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
              <AssistantsPreview />
            </div>
          )}
          {currentView === 'settings' && (
            <div className="h-screen flex">
              <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
              <SettingsPreview />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
