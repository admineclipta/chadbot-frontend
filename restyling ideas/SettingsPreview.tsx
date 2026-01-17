import React, { useState } from 'react';
import {
  User,
  Palette,
  MessageSquare,
  Key,
  Sun,
  Moon,
  Monitor,
  Check,
  RefreshCw,
  Bell,
  Hash,
  Calendar,
  Mail
} from 'lucide-react';

export default function SettingsPreview() {
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'messages' | 'credentials'>('profile');
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>('light');

  const tabs = [
    { id: 'profile' as const, label: 'Sobre Mi', icon: User },
    { id: 'appearance' as const, label: 'Apariencia', icon: Palette },
    { id: 'messages' as const, label: 'Mensajes', icon: MessageSquare },
    { id: 'credentials' as const, label: 'Credenciales', icon: Key },
  ];

  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Configuración</h1>
        <p className="text-slate-600">Administra tu perfil, preferencias y credenciales de servicios</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-lg">
        <div className="border-b-2 border-slate-200 bg-slate-50 px-2 py-2">
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-md'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Información Personal</h2>
                <p className="text-slate-600 mb-6">Datos de tu cuenta</p>

                {/* User Card */}
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border-2 border-slate-200 p-6 mb-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white font-bold text-2xl shadow-xl">
                      MA
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Matias Admin</h3>
                      <p className="text-slate-600">matias</p>
                      <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
                        <Check className="w-3 h-3" />
                        Activo
                      </span>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Email</div>
                          <div className="text-sm font-medium text-slate-900">matias@eclipta.ar</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Hash className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div>
                          <div className="text-xs text-slate-500 mb-1">ID de Cliente</div>
                          <div className="text-xs font-mono text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                            2e7ad628-b63f-458f-ac1b-634878e3a3b7
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Fecha de Creación</div>
                          <div className="text-sm font-medium text-slate-900">10 de enero de 2026 a las 12:14</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Hash className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div>
                          <div className="text-xs text-slate-500 mb-1">ID de Usuario</div>
                          <div className="text-xs font-mono text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                            a2a318dd-7678-481f-aacf-63dec28f2df4
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Hash className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div>
                          <div className="text-xs text-slate-500 mb-1">ID de Agente</div>
                          <div className="text-xs font-mono text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                            30767b3d-e3db-41c2-9f9e-45fbe2c33cc6
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Último Acceso</div>
                          <div className="text-sm font-medium text-slate-900">15 de enero de 2026 a las 16:21</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Tema de la aplicación</h2>
                <p className="text-slate-600 mb-6">Personaliza la apariencia de la aplicación</p>

                {/* Theme Cards */}
                <div className="grid grid-cols-3 gap-6">
                  {/* Light Theme */}
                  <button
                    onClick={() => setSelectedTheme('light')}
                    className={`relative bg-white rounded-2xl border-2 p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl group ${
                      selectedTheme === 'light'
                        ? 'border-blue-600 shadow-xl shadow-blue-500/20'
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {selectedTheme === 'light' && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                      <Sun className="w-8 h-8 text-white" />
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${
                      selectedTheme === 'light' ? 'text-blue-600' : 'text-slate-900'
                    }`}>
                      Claro
                    </h3>
                    <p className="text-sm text-slate-600">Tema claro para el día</p>
                  </button>

                  {/* Dark Theme */}
                  <button
                    onClick={() => setSelectedTheme('dark')}
                    className={`relative bg-white rounded-2xl border-2 p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl group ${
                      selectedTheme === 'dark'
                        ? 'border-blue-600 shadow-xl shadow-blue-500/20'
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {selectedTheme === 'dark' && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                      <Moon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${
                      selectedTheme === 'dark' ? 'text-blue-600' : 'text-slate-900'
                    }`}>
                      Oscuro
                    </h3>
                    <p className="text-sm text-slate-600">Tema oscuro para la noche</p>
                  </button>

                  {/* System Theme */}
                  <button
                    onClick={() => setSelectedTheme('system')}
                    className={`relative bg-white rounded-2xl border-2 p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl group ${
                      selectedTheme === 'system'
                        ? 'border-blue-600 shadow-xl shadow-blue-500/20'
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {selectedTheme === 'system' && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                      <Monitor className="w-8 h-8 text-white" />
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${
                      selectedTheme === 'system' ? 'text-blue-600' : 'text-slate-900'
                    }`}>
                      Sistema
                    </h3>
                    <p className="text-sm text-slate-600">Usa la configuración de tu sistema</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Auto Refresh */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border-2 border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Actualización Automática</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Configura con qué frecuencia se actualizan los mensajes en las conversaciones
                    </p>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-2 block">
                        Intervalo de actualización
                      </label>
                      <select className="w-full max-w-xs px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-slate-300 cursor-pointer">
                        <option>10 segundos</option>
                        <option>15 segundos</option>
                        <option>30 segundos</option>
                        <option>60 segundos</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Browser Notifications */}
              <div className="bg-gradient-to-br from-slate-50 to-purple-50 rounded-2xl border-2 border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Notificaciones del Navegador</h3>
                      <p className="text-sm text-slate-600">
                        Recibe notificaciones cuando lleguen nuevos mensajes
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Credentials Tab */}
          {activeTab === 'credentials' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="bg-gradient-to-br from-slate-50 to-amber-50 rounded-2xl border-2 border-slate-200 p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Credenciales de Servicios</h3>
                <p className="text-slate-600 mb-6">
                  Gestiona tus credenciales de WhatsApp Business, Telegram y servicios de IA
                </p>
                <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 shadow-lg shadow-blue-500/30">
                  Configurar Credenciales
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
