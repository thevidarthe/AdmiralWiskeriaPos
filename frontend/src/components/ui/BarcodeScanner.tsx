'use client';
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion } from 'framer-motion';
import { X, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (text: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [loading, setLoading] = useState(true);
  const [hasCamera, setHasCamera] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'barcode-scanner-container';

  useEffect(() => {
    // Inicializar el lector de forma segura en el cliente
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size * 0.5 }; // caja rectangular para códigos de barra
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // ¡Éxito! Detener escáner y enviar resultado
          onScan(decodedText);
        },
        () => {
          // Ignorar errores normales de escaneo de fotogramas
        }
      )
      .then(() => {
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error iniciando cámara:', err);
        setHasCamera(false);
        setLoading(false);
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
          })
          .catch((e) => console.error('Error deteniendo scanner:', e));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-admiral-night/95 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md card-premium p-6 bg-[#0F1B33]/80 border border-admiral-gold/20 shadow-2xl relative overflow-hidden"
      >
        {/* Barra brillante superior */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-admiral-gold via-[#00F5D4] to-admiral-gold animate-pulse" />

        <header className="flex justify-between items-center mb-5">
          <div>
            <h3 className="font-serif text-lg gold-text font-semibold">Escanear Código</h3>
            <p className="text-[10px] text-admiral-mist uppercase tracking-widest mt-0.5">Barcode / QR</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-admiral-gold/10 hover:border-admiral-gold/40 text-admiral-mist hover:text-admiral-gold transition-all"
          >
            <X size={16} />
          </button>
        </header>

        {/* Cámara Viewfinder */}
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-admiral-gold/15 bg-admiral-night flex items-center justify-center">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-admiral-night">
              <div className="w-10 h-10 rounded-full border-2 border-admiral-gold/20 border-t-admiral-gold animate-spin" />
              <p className="text-xs text-admiral-mist mt-3 font-medium">Iniciando cámara nativa...</p>
            </div>
          )}

          {!hasCamera && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-admiral-night p-6 text-center">
              <Camera size={40} className="text-admiral-danger mb-3" />
              <p className="text-sm font-semibold text-admiral-cream">No se detectó cámara</p>
              <p className="text-xs text-admiral-mist mt-1 max-w-[240px]">
                Asegúrate de otorgar permisos de cámara y utilizar una conexión HTTPS segura.
              </p>
            </div>
          )}

          {/* Contenedor DOM para html5-qrcode */}
          <div id={containerId} className="w-full h-full object-cover" />

          {/* Mira holográfica Cyberpunk */}
          {hasCamera && !loading && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Rectángulo de escaneo */}
              <div className="w-[75%] h-[40%] border-2 border-[#00F5D4]/40 rounded-xl relative shadow-[0_0_20px_rgba(0,245,212,0.15)] flex items-center justify-center">
                {/* Esquinas Neón */}
                <span className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#00F5D4]" />
                <span className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#00F5D4]" />
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#00F5D4]" />
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#00F5D4]" />

                {/* Línea Láser Roja */}
                <motion.div
                  animate={{
                    y: ['-45%', '45%', '-45%'],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute inset-x-2 h-0.5 bg-[#FF007F] shadow-[0_0_12px_#FF007F]"
                />
              </div>

              {/* Leyenda flotante */}
              <div className="absolute bottom-4 px-3 py-1 rounded-full bg-admiral-night/85 border border-admiral-gold/10 backdrop-blur-md text-[9px] text-admiral-gold font-serif uppercase tracking-widest">
                Alinea el código de barra con la línea láser
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2 justify-center">
          <div className="text-[10px] text-admiral-mist text-center">
            Compatible con códigos EAN, UPC, QR y Code 128 nativos
          </div>
        </div>
      </motion.div>
    </div>
  );
}
