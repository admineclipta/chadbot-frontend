import React from 'react';
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  CheckCheck,
  Clock,
  Image as ImageIcon,
  FileText
} from 'lucide-react';

const messages = [
  {
    id: 1,
    type: 'received',
    text: 'Hola, buen día. Me interesa conocer más sobre sus servicios.',
    time: '13:45',
    status: 'read',
  },
  {
    id: 2,
    type: 'sent',
    text: 'Hola Juan, ¡buen día! Gracias por contactarnos. Con gusto te ayudo.',
    time: '13:46',
    status: 'read',
  },
  {
    id: 3,
    type: 'sent',
    text: '¿Qué servicio en particular te interesa? Tenemos planes Basic, Pro y Enterprise.',
    time: '13:46',
    status: 'read',
  },
  {
    id: 4,
    type: 'received',
    text: 'Me interesa el plan Enterprise. ¿Podrías darme más detalles sobre las funcionalidades incluidas?',
    time: '13:52',
    status: 'read',
  },
  {
    id: 5,
    type: 'sent',
    text: 'Por supuesto. El plan Enterprise incluye:\n\n• IA conversacional avanzada\n• Asistentes ilimitados\n• WhatsApp + Telegram\n• API completa\n• Soporte prioritario 24/7\n• Onboarding personalizado',
    time: '13:55',
    status: 'read',
  },
  {
    id: 6,
    type: 'received',
    text: 'Suena muy bien. ¿Cuál es el precio?',
    time: '14:02',
    status: 'read',
  },
  {
    id: 7,
    type: 'sent',
    text: 'El plan Enterprise tiene un costo de $299 USD/mes con facturación anual, o $349 USD/mes con pago mensual.',
    time: '14:03',
    status: 'delivered',
  },
  {
    id: 8,
    type: 'sent',
    text: '¿Te gustaría que agendemos una demo personalizada?',
    time: '14:03',
    status: 'sent',
  },
];

export default function ChatPreview() {
  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>

            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold shadow-lg">
                JP
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></div>
            </div>

            <div>
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                Juan Pérez
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                  Activa
                </span>
              </h2>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
                +52 555 123 4567
                <span className="text-slate-300">•</span>
                <span className="text-emerald-600">📱 WhatsApp</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors">
              <Phone className="w-5 h-5 text-slate-600" />
            </button>
            <button className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors">
              <Video className="w-5 h-5 text-slate-600" />
            </button>
            <button className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {/* Date Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 border-t border-slate-200"></div>
          <span className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
            Hoy, 15 de enero
          </span>
          <div className="flex-1 border-t border-slate-200"></div>
        </div>

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'sent' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-md lg:max-w-lg xl:max-w-xl ${
                message.type === 'sent'
                  ? 'bg-blue-600 text-white rounded-2xl rounded-tl-md'
                  : 'bg-white text-slate-900 border border-slate-200 rounded-2xl rounded-tr-md'
              } px-4 py-3 shadow-sm hover:shadow-md transition-shadow`}
            >
              <p className="text-[15px] leading-relaxed whitespace-pre-line">
                {message.text}
              </p>
              <div
                className={`flex items-center justify-end gap-1.5 mt-2 text-xs ${
                  message.type === 'sent' ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                <span>{message.time}</span>
                {message.type === 'sent' && (
                  <>
                    {message.status === 'sending' && (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {message.status === 'sent' && (
                      <CheckCheck className="w-4 h-4" />
                    )}
                    {message.status === 'delivered' && (
                      <CheckCheck className="w-4 h-4 text-blue-200" />
                    )}
                    {message.status === 'read' && (
                      <CheckCheck className="w-4 h-4 text-blue-300" />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        <div className="flex justify-end">
          <div className="bg-white border border-slate-200 rounded-2xl rounded-tr-md px-5 py-4 shadow-sm">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white border-t border-slate-200 px-6 py-3">
        <div className="flex gap-2 overflow-x-auto">
          <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium whitespace-nowrap transition-colors">
            <FileText className="w-4 h-4" />
            Enviar catálogo
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium whitespace-nowrap transition-colors">
            📅 Agendar demo
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium whitespace-nowrap transition-colors">
            💳 Enviar cotización
          </button>
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-slate-200 px-6 py-4">
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
  );
}
