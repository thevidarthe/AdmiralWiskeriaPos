import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface LogoProps {
  size?: number;
  glow?: boolean;
  interactive?: boolean;
  className?: string;
}

export function Logo({
  size = 48,
  glow = false,
  interactive = false,
  className,
}: LogoProps) {
  const content = (
    <div
      className={cn(
        'relative rounded-full overflow-hidden select-none flex items-center justify-center bg-black/40',
        glow && 'neon-logo-glow border border-[#00F5D4]/20',
        'animate-shine', // sweeps light rays
        className
      )}
      style={{
        width: size,
        height: size,
      }}
    >
      <img
        src="/logo.png"
        alt="Admiral Whisky Bar"
        width={size}
        height={size}
        className="object-contain w-full h-full pointer-events-none"
      />
    </div>
  );

  const inner = interactive ? (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      whileHover={{
        scale: 1.05,
        rotateY: 10,
        rotateX: -5,
        filter: 'brightness(1.1)',
      }}
      style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
      className="cursor-pointer"
    >
      {content}
    </motion.div>
  ) : (
    <div className="cursor-pointer">{content}</div>
  );

  return (
    <Link href="/" className="inline-block cursor-pointer focus:outline-none">
      {inner}
    </Link>
  );
}

