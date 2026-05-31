import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function KpiCard({
  label,
  value,
  sub,
  delay = 0,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn('card-premium', className)}
    >
      <div className="label-mono mb-2">{label}</div>
      <div className="font-serif text-3xl font-semibold gold-text leading-none mb-2">
        {value}
      </div>
      {sub && <div className="text-[11px] text-admiral-mist">{sub}</div>}
    </motion.div>
  );
}
