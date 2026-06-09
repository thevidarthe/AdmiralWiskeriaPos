'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Bot, BotOff, X, Send, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiError } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';

interface Conversation {
  id: string;
  phone: string;
  status: string;
  botEnabled: boolean;
  lastMessageAt?: string;
  createdAt: string;
}

interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  messageType: string;
  body?: string;
  status: string;
  createdAt: string;
}

export default function WhatsAppInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(() => {
    api.get('/whatsapp/inbox/conversations', { params: { page: 1, pageSize: 50 } })
      .then((r) => setConversations(r.data.data || []))
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));
  }, []);

  const loadMessages = useCallback((convId: string) => {
    api.get(`/whatsapp/inbox/conversations/${convId}/messages`)
      .then((r) => setMessages(r.data || []))
      .catch((e) => toast.error(apiError(e)));
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (selected) loadMessages(selected.id);
  }, [selected, loadMessages]);

  const handleToggleBot = async (convId: string, enabled: boolean) => {
    try {
      await api.post(`/whatsapp/inbox/conversations/${convId}/toggle-bot`, { enabled });
      toast.success(enabled ? 'Bot activado' : 'Bot desactivado');
      loadConversations();
    } catch (e) { toast.error(apiError(e)); }
  };

  const handleClose = async (convId: string) => {
    try {
      await api.post(`/whatsapp/inbox/conversations/${convId}/close`);
      toast.success('Conversación cerrada');
      setSelected(null);
      loadConversations();
    } catch (e) { toast.error(apiError(e)); }
  };

  const handleSend = async () => {
    if (!selected || !replyText.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/whatsapp/inbox/conversations/${selected.id}/send`, {
        phone: selected.phone,
        body: replyText.trim(),
      });
      setReplyText('');
      toast.success('Mensaje encolado');
      loadMessages(selected.id);
    } catch (e) { toast.error(apiError(e)); }
    finally { setSending(false); }
  };

  if (loading) return <Skeleton className="h-64" />;

  return (
    <>
      <PageHeader title="WhatsApp Inbox" subtitle="Conversaciones activas" />
      <div className="flex gap-4 h-[calc(100vh-180px)]">
        <div className="w-80 flex-shrink-0 overflow-y-auto space-y-2">
          {conversations.length === 0 && (
            <p className="text-admiral-mist text-sm text-center mt-8">Sin conversaciones</p>
          )}
          {conversations.map((c) => (
            <motion.button
              key={c.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelected(c)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selected?.id === c.id
                  ? 'bg-admiral-navy-2 border-admiral-gold/40'
                  : 'bg-admiral-midnight border-admiral-navy-3/30 hover:border-admiral-gold/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-admiral-ivory">{c.phone}</span>
                {c.botEnabled ? (
                  <Bot size={14} className="text-admiral-gold" />
                ) : (
                  <BotOff size={14} className="text-admiral-mist" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  c.status === 'OPEN' ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-400'
                }`}>{c.status}</span>
                {c.lastMessageAt && (
                  <span className="text-[10px] text-admiral-mist">
                    {new Date(c.lastMessageAt).toLocaleDateString('es-CO')}
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        <div className="flex-1 flex flex-col bg-admiral-midnight rounded-2xl border border-admiral-navy-3/30 overflow-hidden">
          {selected ? (
            <>
              <div className="p-4 border-b border-admiral-navy-3/30 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg text-admiral-ivory">{selected.phone}</h3>
                  <span className="text-xs text-admiral-mist">{selected.status} · Bot: {selected.botEnabled ? 'ON' : 'OFF'}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleBot(selected.id, !selected.botEnabled)}
                    className="px-3 py-1.5 rounded-lg text-xs border border-admiral-gold/30 text-admiral-gold hover:bg-admiral-gold/10 transition"
                  >
                    {selected.botEnabled ? 'Desactivar Bot' : 'Activar Bot'}
                  </button>
                  <button
                    onClick={() => handleClose(selected.id)}
                    className="px-3 py-1.5 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 transition flex items-center gap-1"
                  >
                    <X size={12} /> Cerrar
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                      m.direction === 'INBOUND'
                        ? 'bg-admiral-navy-2 text-admiral-ivory self-start'
                        : 'bg-admiral-gold/20 text-admiral-ivory ml-auto'
                    }`}
                  >
                    <p>{m.body || `[${m.messageType}]`}</p>
                    <span className="text-[10px] text-admiral-mist mt-1 block">
                      {new Date(m.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-admiral-navy-3/30 flex gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-admiral-navy border border-admiral-navy-3/40 rounded-xl px-4 py-2 text-sm text-admiral-ivory placeholder:text-admiral-mist focus:outline-none focus:border-admiral-gold/40"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !replyText.trim()}
                  className="px-4 py-2 bg-admiral-gold text-admiral-night rounded-xl font-medium text-sm hover:bg-admiral-gold-2 transition disabled:opacity-40 flex items-center gap-1"
                >
                  <Send size={14} /> Enviar
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-admiral-mist text-sm">
              <MessageCircle size={24} className="mr-2 opacity-40" />
              Selecciona una conversación
            </div>
          )}
        </div>
      </div>
    </>
  );
}
