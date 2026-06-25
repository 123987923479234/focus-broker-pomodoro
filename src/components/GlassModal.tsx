import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface GlassModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}

export function GlassModal({ title, children, onClose, wide = false }: GlassModalProps) {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.section
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.16}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120) onClose();
        }}
        className={`modal max-h-[88vh] w-full overflow-hidden rounded-2xl border border-white/30 bg-glass-day shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-glass-night ${wide ? 'max-w-5xl' : 'max-w-xl'}`}
        initial={{ y: 56, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 44, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      >
        <header className="flex items-center justify-between border-b border-white/20 px-5 py-4 dark:border-white/10">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="max-h-[calc(88vh-64px)] overflow-auto p-5">{children}</div>
      </motion.section>
    </motion.div>
  );
}

