'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ChevronLeft, CheckCircle2, AlertTriangle, MapPin, Shield, RefreshCw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthGuard } from '@/components/ui/AuthGuard';
import { Logo } from '@/components/ui/Logo';
import { Skeleton } from '@/components/ui/Skeleton';
import { attendanceApi, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useBranchId } from '@/store/branch.store';
import { cn } from '@/lib/utils';

export default function AsistenciaPage() {
  return (
    <AuthGuard allow={['ADMIN', 'MANAGER', 'WAITER']}>
      <AsistenciaScreen />
    </AuthGuard>
  );
}

function AsistenciaScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const branchId = useBranchId();

  // Estados de cámara y GPS
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState(false);

  // Estados de carga e historial
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Cargar historial
  const loadHistory = () => {
    attendanceAlert(attendanceApi.history())
      .then((r) => setHistory(r.data))
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoadingHistory(false));
  };

  // Helper para no levantar alerta si da error silencioso
  const attendanceAlert = async (promise: Promise<any>) => {
    return promise;
  };

  // Iniciar cámara
  const startCamera = async () => {
    setCameraError(false);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Error de cámara:', err);
      setCameraError(true);
      setCameraActive(false);
    }
  };

  // Obtener GPS
  const getGeoLocation = () => {
    setGpsLoading(true);
    setGpsError(false);
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
          setGpsLoading(false);
        },
        (err) => {
          console.error('Error de GPS:', err);
          setGpsError(true);
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsError(true);
      setGpsLoading(false);
    }
  };

  useEffect(() => {
    startCamera();
    getGeoLocation();
    loadHistory();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  // Capturar foto y registrar
  const handleClock = async (type: 'CLOCK_IN' | 'CLOCK_OUT') => {
    if (gpsError || !coords) {
      toast.error('Es obligatorio activar la geolocalización para certificar tu asistencia.');
      return;
    }

    setSubmitting(type);
    try {
      const fd = new FormData();
      fd.append('eventType', type);
      fd.append('branchId', branchId || '');
      fd.append('latitude', coords.lat.toString());
      fd.append('longitude', coords.lon.toString());

      // Capturar frame desde el video
      if (videoRef.current && cameraActive) {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 300, 300);
          
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
          if (blob) {
            fd.append('photo', blob, 'face.jpg');
          }
        }
      }

      await attendanceApi.clock(fd);
      toast.success(type === 'CLOCK_IN' ? '¡Entrada registrada con éxito!' : '¡Salida registrada con éxito!');
      
      // Recargar historial
      loadHistory();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-admiral-night max-w-md mx-auto pb-10">
      {/* Header */}
      <header className="h-16 px-4 flex items-center gap-3 border-b border-admiral-gold/12 glass-strong sticky top-0 z-10">
        <button
          onClick={() => router.push('/mesero')}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-admiral-gold/15 text-admiral-gold hover:bg-admiral-gold/10"
        >
          <ChevronLeft size={16} />
        </button>
        <Logo size={28} />
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-sm gold-text leading-none">Registro de Asistencia</h1>
          <p className="text-[9px] text-admiral-mist mt-0.5">{user?.name}</p>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {/* Lector Facial Virtual */}
        <div className="card-premium relative overflow-hidden flex flex-col items-center p-6 bg-[#0B1428]/60 border border-admiral-gold/20">
          <div className="absolute top-0 right-0 p-2 text-admiral-gold/5">
            <Shield size={96} />
          </div>

          <h3 className="font-serif text-xs font-bold uppercase tracking-wider gold-text mb-4 text-center">
            Escaneo Facial de Auditoría
          </h3>

          {/* Círculo Cámara */}
          <div className="w-48 h-48 rounded-full border-2 border-dashed border-[#00b0ff] bg-admiral-navy/40 relative overflow-hidden flex items-center justify-center shadow-gold animate-pulse-gold">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : cameraError ? (
              <div className="text-center p-4">
                <AlertTriangle className="text-admiral-warn mx-auto mb-2" size={28} />
                <p className="text-[10px] text-admiral-mist">Permiso de cámara denegado</p>
                <button
                  onClick={startCamera}
                  className="mt-2 text-[9px] font-bold text-admiral-gold underline uppercase"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Camera className="text-admiral-gold/30 mx-auto animate-bounce" size={32} />
                <p className="text-[10px] text-admiral-mist mt-1 animate-pulse">Iniciando feed facial…</p>
              </div>
            )}

            {/* Marcación holográfica estilo HUD */}
            {cameraActive && (
              <div className="absolute inset-0 border-2 border-[#00F5D4]/30 rounded-full pointer-events-none flex items-center justify-center">
                <div className="w-40 h-40 border border-dashed border-[#00b0ff]/30 rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Estado de Geolocalización */}
          <div className="mt-5 w-full flex items-center justify-center gap-2 bg-admiral-navy-2/30 p-2.5 rounded-xl border border-admiral-gold/10 text-xs">
            <MapPin size={14} className={cn(coords ? "text-[#00F5D4]" : "text-admiral-warn")} />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-admiral-cream block text-[10px] uppercase tracking-wider">Geolocalización GPS</span>
              {gpsLoading ? (
                <span className="text-[9px] text-admiral-mist/75 animate-pulse block">Obteniendo coordenadas de Sandoná…</span>
              ) : coords ? (
                <span className="text-[9px] text-[#00F5D4] font-mono block">Lat: {coords.lat.toFixed(6)} | Lon: {coords.lon.toFixed(6)}</span>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-admiral-warn block">GPS obligatorio desactivado</span>
                  <button onClick={getGeoLocation} className="text-[8px] font-bold text-admiral-gold uppercase tracking-wider underline flex items-center gap-0.5">
                    <RefreshCw size={8} /> Activar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Botones de Registro */}
          <div className="mt-6 grid grid-cols-2 gap-3 w-full">
            <button
              onClick={() => handleClock('CLOCK_IN')}
              disabled={submitting !== null || gpsLoading || !coords}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-admiral-night bg-gradient-to-r from-[#00F5D4] to-[#00b0ff] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97] transition-all shadow-md"
            >
              {submitting === 'CLOCK_IN' ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span>Registrar Entrada</span>
            </button>

            <button
              onClick={() => handleClock('CLOCK_OUT')}
              disabled={submitting !== null || gpsLoading || !coords}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-admiral-gold border border-admiral-gold/30 bg-[#0F1B33]/60 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97] transition-all shadow-md hover:bg-admiral-gold/10"
            >
              {submitting === 'CLOCK_OUT' ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}
              <span>Registrar Salida</span>
            </button>
          </div>
        </div>

        {/* Historial Auditoría */}
        <div className="card-premium p-4 rounded-2xl bg-[#0F1B33]/65 border border-admiral-gold/15 flex flex-col">
          <h3 className="font-serif text-xs font-bold uppercase tracking-wider gold-text mb-3">
            Historial de Marcaciones (Últimas 30)
          </h3>

          {loadingHistory ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-admiral-mist text-xs">
              No se registran marcaciones de entrada/salida hoy.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-admiral-gold/10 bg-admiral-navy-2/30 text-xs"
                >
                  {/* Foto miniatura */}
                  <div className="w-10 h-10 rounded-full border border-admiral-gold/15 bg-admiral-navy/40 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                    {h.photoUrl ? (
                      <img
                        src={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace('/api/v1', '')}${h.photoUrl}`}
                        alt="Auditoría"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera size={12} className="text-admiral-gold/30" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className={cn(
                        "text-[9px] font-extrabold uppercase tracking-wider",
                        h.eventType === 'CLOCK_IN' ? "text-[#00F5D4]" : "text-admiral-gold"
                      )}>
                        {h.eventType === 'CLOCK_IN' ? 'ENTRADA' : 'SALIDA'}
                      </span>
                      <span className="text-[9px] text-admiral-mist/80 font-mono">
                        {new Date(h.timestamp).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="text-[10px] text-admiral-cream mt-0.5">
                      {new Date(h.timestamp).toLocaleDateString('es-CO', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>

                    <div className="flex justify-between text-[8px] text-admiral-mist/70 font-mono mt-1">
                      <span>IP: {h.ipAddress}</span>
                      {h.latitude && (
                        <span>GPS: {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
