import { motion } from 'motion/react';
import { Activity } from 'lucide-react';

export function LiveActivityIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full">
      <motion.div
        className="w-2 h-2 bg-red-500 rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.8, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <span className="text-xs font-medium text-red-400">LIVE</span>
      <Activity className="w-3 h-3 text-red-400" />
    </div>
  );
}
