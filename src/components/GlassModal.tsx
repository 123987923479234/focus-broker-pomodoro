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
      className="modal-backdrop"
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
        className={`modal ${wide ? 'wide' : ''}`}
        initial={{ y: 56, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 44, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </motion.section>
    </motion.div>
  );
}
