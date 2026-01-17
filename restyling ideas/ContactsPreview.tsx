import React, { useState } from 'react';
import {
  Contact,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Eye,
  MoreVertical,
  MessageCircle,
  CheckCircle
} from 'lucide-react';

const contacts = [
  {
    id: 1,
    name: 'Federico Marquez',
    phone: '+5493511234567',
    channel: 'WhatsApp Business',
    status: 'active',
    created: '10 de ene de 2026, 11:58 a. m.',
    avatar: 'FM',
    color: 'from-blue-400 to-blue-500'
  },
  {
    id: 2,
    name: 'María García',
    phone: '+54911987654',
    channel: 'Telegram',
    status: 'active',
    created: '8 de ene de 2026, 10:30 a. m.',
    avatar: 'MG',
    color: 'from-pink-400 to-pink-500'
  },
  {
    id: 3,
    name: 'Carlos Rodríguez',
    phone: '+5493514567890',
    channel: 'WhatsApp Business',
    status: 'inactive',
    created: '5 de ene de 2026, 15:20 p. m.',
    avatar: 'CR',
    color: 'from-amber-400 to-amber-500'
  },
];

export default function ContactsPreview() {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestión de Contactos</h1>
            <p className="text-slate-600">Administra y visualiza los contactos de tu organización</p>
          </div>
          <button className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center gap-2 group">
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            Nuevo Contacto
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar contactos..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Canal Principal
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Creado
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                onMouseEnter={() => setHoveredRow(contact.id)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`transition-all duration-200 ${
                  hoveredRow === contact.id
                    ? 'bg-blue-50 shadow-lg scale-[1.01] z-10 relative'
                    : 'hover:bg-slate-50'
                }`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-full bg-gradient-to-br ${contact.color} flex items-center justify-center text-white font-semibold shadow-lg transition-all duration-300 ${
                        hoveredRow === contact.id ? 'scale-110 shadow-xl' : ''
                      }`}
                    >
                      {contact.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{contact.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {contact.phone}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${
                      contact.channel === 'WhatsApp Business'
                        ? 'bg-emerald-100'
                        : 'bg-blue-100'
                    } flex items-center justify-center transition-all duration-200 ${
                      hoveredRow === contact.id ? 'scale-110' : ''
                    }`}>
                      <span className="text-base">
                        {contact.channel === 'WhatsApp Business' ? '📱' : '✈️'}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{contact.channel}</div>
                      <div className="text-xs text-slate-500">{contact.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {contact.status === 'active' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold shadow-sm">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {contact.created}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      className={`p-2 hover:bg-blue-100 text-slate-600 hover:text-blue-600 rounded-lg transition-all duration-200 ${
                        hoveredRow === contact.id ? 'scale-110' : ''
                      }`}
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 rounded-lg transition-all duration-200 ${
                        hoveredRow === contact.id ? 'scale-110' : ''
                      }`}
                      title="Iniciar conversación"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-all duration-200 ${
                        hoveredRow === contact.id ? 'scale-110' : ''
                      }`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mt-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
              <Contact className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold">3</div>
          </div>
          <div className="text-sm text-blue-100">Total Contactos</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold">2</div>
          </div>
          <div className="text-sm text-emerald-100">Contactos Activos</div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold">12</div>
          </div>
          <div className="text-sm text-amber-100">Conversaciones Totales</div>
        </div>
      </div>
    </div>
  );
}
