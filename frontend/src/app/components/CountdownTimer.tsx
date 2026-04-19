import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface CountdownTimerProps {
  endTime: string;
  large?: boolean;
}

export function CountdownTimer({ endTime, large = false }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
  });

  useEffect(() => {
    const updateTime = () => {
      const end = new Date(endTime).getTime();
      const now = Date.now();
      const diff = Math.max(0, end - now);

      setTimeRemaining({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        total: diff,
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const isUrgent = timeRemaining.total < 5 * 60 * 1000; // Less than 5 minutes
  const isCritical = timeRemaining.total < 60 * 1000; // Less than 1 minute

  if (large) {
    return (
      <div className="relative">
        {/* Pulsing background effect when urgent */}
        {isUrgent && (
          <motion.div
            className="absolute inset-0 bg-red-500/20 rounded-2xl blur-xl"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: isCritical ? 0.5 : 1,
              repeat: Infinity,
            }}
          />
        )}

        <div className={`relative backdrop-blur-xl rounded-2xl p-6 border ${
          isCritical
            ? 'bg-red-500/10 border-red-500/50'
            : isUrgent
            ? 'bg-yellow-500/10 border-yellow-500/50'
            : 'bg-white/5 border-white/10'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className={`w-5 h-5 ${isCritical ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-gray-400'}`} />
            <span className="text-sm text-gray-400">
              {isCritical ? 'Final Seconds!' : isUrgent ? 'Ending Soon' : 'Time Remaining'}
            </span>
          </div>

          <div className="flex gap-4">
            <TimeUnit value={timeRemaining.hours} label="Hours" isUrgent={isUrgent} />
            <div className="text-3xl font-bold text-gray-500">:</div>
            <TimeUnit value={timeRemaining.minutes} label="Minutes" isUrgent={isUrgent} />
            <div className="text-3xl font-bold text-gray-500">:</div>
            <TimeUnit value={timeRemaining.seconds} label="Seconds" isUrgent={isUrgent} isCritical={isCritical} />
          </div>

          {isUrgent && (
            <motion.p
              className={`text-xs mt-4 ${isCritical ? 'text-red-400' : 'text-yellow-400'}`}
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {isCritical ? '⚡ Place your bid now!' : '⏰ Don\'t miss out!'}
            </motion.p>
          )}
        </div>
      </div>
    );
  }

  // Compact version
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
      isCritical
        ? 'bg-red-500/20 text-red-400'
        : isUrgent
        ? 'bg-yellow-500/20 text-yellow-400'
        : 'bg-white/5 text-gray-300'
    }`}>
      <Clock className="w-4 h-4" />
      <span className="text-sm font-medium">
        {timeRemaining.hours > 0 && `${timeRemaining.hours}h `}
        {timeRemaining.minutes}m {timeRemaining.seconds}s
      </span>
    </div>
  );
}

function TimeUnit({ 
  value, 
  label, 
  isUrgent, 
  isCritical 
}: { 
  value: number; 
  label: string; 
  isUrgent: boolean; 
  isCritical?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        className={`text-3xl font-bold tabular-nums ${
          isCritical ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-white'
        }`}
        key={value}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {String(value).padStart(2, '0')}
      </motion.div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
