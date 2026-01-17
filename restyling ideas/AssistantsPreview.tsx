import React, { useState } from 'react';
import {
  Bot,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Sparkles,
  CheckCircle,
  ArrowUpDown
} from 'lucide-react';

const assistants = [
  {
    id: 1,
    name: 'Asistente de Ventas',
    description: 'Asistente para responder y enviar los precios a los clientes',
    status: 'active',
    team: 'T',
    created: '10 de enero de 2026',
    color: 'from-purple-500 to-purple-600'
  },
  {
    id: 2,
    name: 'Asistente de Soporte',
    description: 'Responde preguntas frecuentes y deriva a agentes cuando es necesario',
    status: 'active',
    team: 'V',
    created: '8 de enero de 2026',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 3,
    name: 'Asistente de Calificación',
    description: 'Califica leads automáticamente según criterios predefinidos',
    status: 'inactive',
    team: 'S',
    created: '5 de enero de 2026',
    color: 'from-emerald-500 to-emerald-600'
  },
];

export default function AssistantsPreview() {
  const [filter, setFilter] = useState('all');

  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Asistentes</h1>
            <p className="text-slate-600">Gestiona tus asistentes de IA</p>
          </div>
          <button className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center gap-2 group">
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            Nuevo Asistente
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-8">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar asistentes..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
          />
        </div>
        <button className="px-4 py-3 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 font-medium transition-all flex items-center gap-2 hover:shadow-md">
          <ArrowUpDown className="w-4 h-4" />
          Más recientes
        </button>
      </div>

      {/* Team Filters */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm font-medium text-slate-600">Equipos:</span>
        <div className="flex gap-2">
          <button
            className={`w-10 h-10 rounded-full font-semibold transition-all duration-200 ${
              filter === 'T'
                ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg scale-110'
                : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-purple-300 hover:scale-105'
            }`}
            onClick={() => setFilter('T')}
          >
            T
          </button>
          <button
            className={`w-10 h-10 rounded-full font-semibold transition-all duration-200 ${
              filter === 'V'
                ? 'bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-lg scale-110'
                : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-pink-300 hover:scale-105'
            }`}
            onClick={() => setFilter('V')}
          >
            V
          </button>
          <button
            className={`w-10 h-10 rounded-full font-semibold transition-all duration-200 ${
              filter === 'S'
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg scale-110'
                : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-emerald-300 hover:scale-105'
            }`}
            onClick={() => setFilter('S')}
          >
            S
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:border-slate-300 transition-all cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-slate-300" />
            Solo asistente predeterminado
          </label>
        </div>
        <span className="ml-auto text-sm font-medium text-slate-600">1 asistente</span>
      </div>

      {/* Assistants Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {assistants.map((assistant) => (
          <div
            key={assistant.id}
            className="group bg-white rounded-2xl border-2 border-slate-200 p-6 transition-all duration-300 hover:shadow-2xl hover:scale-[1.03] hover:border-blue-300 cursor-pointer"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${assistant.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <Bot className="w-7 h-7" />
              </div>
              <div className="flex gap-2 items-center">
                {assistant.status === 'active' ? (
                  <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold shadow-sm">
                    Activo
                  </span>
                ) : (
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold">
                    Inactivo
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
              {assistant.name}
            </h3>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              {assistant.description}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Creado: {assistant.created}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <button className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-200 hover:scale-105">
                Ver
              </button>
              <button className="p-2.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-xl transition-all duration-200 hover:scale-110">
                <Edit className="w-4 h-4" />
              </button>
              <button className="p-2.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-all duration-200 hover:scale-110">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>
        ))}
      </div>

      {/* Empty State for Filtered View */}
      {assistants.filter(a => filter === 'all' || a.team === filter).length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay asistentes</h3>
          <p className="text-slate-600 mb-6">Crea tu primer asistente de IA para automatizar conversaciones</p>
          <button className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 shadow-lg shadow-blue-500/30">
            Crear Asistente
          </button>
        </div>
      )}
    </div>
  );
}
