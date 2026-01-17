import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Shield,
  UserCheck,
  Filter
} from 'lucide-react';

const users = [
  {
    id: 1,
    name: 'Admin Eclipta',
    username: 'aeclipta',
    email: 'admin@eclipta.ar',
    status: 'active',
    role: 'Admin',
    avatar: 'AE',
    color: 'from-orange-400 to-orange-500'
  },
  {
    id: 2,
    name: 'Matias Admin',
    username: 'matias',
    email: 'matias@eclipta.ar',
    status: 'active',
    role: 'Admin',
    avatar: 'MA',
    color: 'from-emerald-400 to-emerald-500'
  },
  {
    id: 3,
    name: 'Juan Pérez',
    username: 'jperez',
    email: 'juan@eclipta.ar',
    status: 'active',
    role: 'Agente',
    avatar: 'JP',
    color: 'from-blue-400 to-blue-500'
  },
  {
    id: 4,
    name: 'María García',
    username: 'mgarcia',
    email: 'maria@eclipta.ar',
    status: 'inactive',
    role: 'Supervisor',
    avatar: 'MG',
    color: 'from-purple-400 to-purple-500'
  },
];

export default function UsersPreview() {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Administración de Usuarios</h1>
            <p className="text-slate-600">Gestiona usuarios del sistema (ABMC)</p>
          </div>
          <button className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center gap-2 group">
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, usuario o email..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-lg transition-all">
            <Filter className="w-5 h-5 text-slate-500" />
          </button>
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
                Usuario
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr
                key={user.id}
                onMouseEnter={() => setHoveredRow(user.id)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`transition-all duration-200 ${
                  hoveredRow === user.id
                    ? 'bg-blue-50 shadow-lg scale-[1.01] z-10 relative'
                    : 'hover:bg-slate-50'
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-full bg-gradient-to-br ${user.color} flex items-center justify-center text-white font-semibold shadow-lg transition-all duration-300 ${
                        hoveredRow === user.id ? 'scale-110 shadow-xl' : ''
                      }`}
                    >
                      {user.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Shield className="w-3 h-3" />
                        {user.role}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-slate-700 font-medium">{user.username}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {user.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.status === 'active' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold shadow-sm">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      className={`p-2 hover:bg-blue-100 text-slate-600 hover:text-blue-600 rounded-lg transition-all duration-200 ${
                        hoveredRow === user.id ? 'scale-110' : ''
                      }`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 hover:bg-red-100 text-slate-600 hover:text-red-600 rounded-lg transition-all duration-200 ${
                        hoveredRow === user.id ? 'scale-110' : ''
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-all duration-200 ${
                        hoveredRow === user.id ? 'scale-110' : ''
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
              <Users className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold">4</div>
          </div>
          <div className="text-sm text-blue-100">Total Usuarios</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold">3</div>
          </div>
          <div className="text-sm text-emerald-100">Usuarios Activos</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold">2</div>
          </div>
          <div className="text-sm text-purple-100">Administradores</div>
        </div>
      </div>
    </div>
  );
}
