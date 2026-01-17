import React, { useState } from 'react';
import {
  MessageCircle,
  Search,
  Filter,
  Phone,
  Clock,
  CheckCheck,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  Users,
  Contact,
  UsersRound,
  Bot,
  Settings,
  PlusCircle,
  ChevronDown,
  Image as ImageIcon,
  MessageSquare,
  ArrowLeft,
  UserPlus,
  Bell
} from 'lucide-react';

const conversations = [
  {
    id: 1,
    name: 'Federico Marquez',
    phone: '+5493511234567',
    lastMessage: 'Hola, podrías mandarme la imagen de los productos?',
    time: '10/1',
    status: 'active',
    channel: 'whatsapp',
    unread: 0,
    tags: ['VIP'],
    avatar: 'FM',
    hasImage: true,
  },
  {
    id: 2,
    name: 'María García',
    phone: '+54911987654',
    lastMessage: 'Perfecto, ¿cuándo podemos agendar?',
    time: '10/1',
    status: 'intervened',
    channel: 'telegram',
    unread: 2,
    tags: [],
    avatar: 'MG',
    hasImage: false,
  },
  {
    id: 3,
    name: 'Carlos Rodríguez',
    phone: '+5493514567890',
    lastMessage: 'Gracias por la información',
    time: '9/1',
    status: 'active',
    channel: 'whatsapp',
    unread: 0,
    tags: [],
    avatar: 'CR',
    hasImage: false,
  },
];

const messages = [
  {
    id: 1,
    type: 'received',
    sender: 'Cliente',
    text: 'Hola, podrías mandarme la imagen de los productos?',
    time: '10/1, 11:48 a. m.',
  },
  {
    id: 2,
    type: 'sent',
    sender: 'Bot',
    text: 'Como no pa, ya te los manda un agente anasheee',
    time: '10/1, 11:53 a. m.',
  },
  {
    id: 3,
    type: 'sent',
    sender: 'Agente',
    text: 'Aqui estan los productos',
    time: '10/1, 11:58 a. m.',
    attachment: 'productos_eclipta.jpg',
  },
];

const statusConfig = {
  active: {
    label: 'active',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200'
  },
  intervened: {
    label: 'intervenida',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200'
  },
};

export default function DashboardPreview() {
  const [selectedConv, setSelectedConv] = useState(1);

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-lg font-bold text-white">C</span>
            </div>
            <span className="text-xl font-semibold text-slate-900">chadbot</span>
          </div>
        </div>

        {/* Nuevo Button */}
        <div className="p-4">
          <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />
            Nuevo
            <ChevronDown className="w-4 h-4 ml-auto" />
          </button>
        </div>

        {/* Canal Selector */}
        <div className="px-4 pb-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors">
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Canal</div>
              <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                <span className="text-emerald-600">●</span>
                WhatsApp Business
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 px-3 py-2 mt-2">
            CONVERSACIONES
          </div>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 text-blue-700 font-medium transition-colors">
            <MessageCircle className="w-5 h-5" />
            Conversaciones
          </a>

          <div className="text-xs font-semibold text-slate-500 px-3 py-2 mt-4">
            ADMINISTRACIÓN
          </div>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
            <Users className="w-5 h-5" />
            Usuarios
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
            <Contact className="w-5 h-5" />
            Contactos
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
            <UsersRound className="w-5 h-5" />
            Equipos
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
            <Bot className="w-5 h-5" />
            Asistentes
          </a>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 rounded-lg p-2 transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-semibold shadow-lg relative">
              N
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900">Matias Admin</div>
              <div className="text-xs text-slate-500 truncate">matias@eclipta.ar</div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Conversaciones</h2>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                1
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar conversaciones... ⌘K"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded transition-colors">
              <Filter className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Conversation Items */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelectedConv(conv.id)}
              className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50 ${
                selectedConv === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-700 font-semibold text-sm">
                    {conv.avatar}
                  </div>
                  {conv.unread > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white font-bold border-2 border-white">
                      {conv.unread}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">
                      {conv.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {conv.time}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusConfig[conv.status].bgColor} ${statusConfig[conv.status].textColor} border ${statusConfig[conv.status].borderColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[conv.status].color}`}></span>
                      {statusConfig[conv.status].label}
                    </div>
                    {conv.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    {conv.hasImage && <ImageIcon className="w-3.5 h-3.5" />}
                    <p className="truncate">{conv.lastMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {/* Chat Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-700 font-semibold">
                  FM
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
              </div>

              <div>
                <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-base">
                  Federico Marquez
                </h2>
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  +5493511234567
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Asignar
              </button>
              <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">
                Resumir
              </button>
              <button className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                Cambiar Estado
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'sent' ? 'justify-start' : 'justify-end'}`}
            >
              <div className="max-w-lg">
                <div className="flex items-center gap-2 mb-1">
                  {message.type === 'sent' ? (
                    <>
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${
                        message.sender === 'Bot' ? 'text-purple-600' : 'text-emerald-600'
                      }`}>
                        {message.sender === 'Bot' ? (
                          <Bot className="w-3.5 h-3.5" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[8px] font-bold">
                            AG
                          </div>
                        )}
                        {message.sender}
                      </div>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {message.time}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {message.time}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                        <Users className="w-3.5 h-3.5" />
                        {message.sender}
                      </div>
                    </>
                  )}
                </div>

                <div
                  className={`px-4 py-3 rounded-2xl shadow-sm ${
                    message.type === 'sent'
                      ? 'bg-blue-600 text-white rounded-tl-md'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-tr-md'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  {message.attachment && (
                    <div className="mt-2 pt-2 border-t border-blue-500/20">
                      <div className="flex items-center gap-2 text-sm">
                        <ImageIcon className="w-4 h-4" />
                        <span className="font-medium">{message.attachment}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* AI Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 text-sm mb-1">
                Esta conversación está siendo controlada por inteligencia artificial
              </h4>
              <p className="text-sm text-blue-700">
                Haz clic{' '}
                <button className="font-semibold underline hover:no-underline">
                  aquí
                </button>{' '}
                para intervenir y tomar el control manual
              </p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="bg-white border-t border-slate-200 p-4">
          <div className="flex items-end gap-3">
            <button className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
              <Paperclip className="w-5 h-5 text-slate-600" />
            </button>

            <div className="flex-1 relative">
              <textarea
                placeholder="Escribe tu mensaje..."
                rows={1}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>

            <button className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
              <Smile className="w-5 h-5 text-slate-600" />
            </button>

            <button className="p-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30 flex-shrink-0">
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
