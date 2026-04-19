import { X, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationTrayProps {
  onClose: () => void;
}

interface Notification {
  id: string;
  type: 'outbid' | 'winning' | 'ending_soon' | 'won';
  message: string;
  timestamp: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'outbid',
    message: 'You\'ve been outbid on Vintage Rolex Submariner 1960s',
    timestamp: '2 min ago',
    read: false,
  },
  {
    id: '2',
    type: 'winning',
    message: 'You\'re in the lead for 1957 Fender Stratocaster Sunburst',
    timestamp: '15 min ago',
    read: false,
  },
  {
    id: '3',
    type: 'ending_soon',
    message: 'Patek Philippe Nautilus 5711 ending in 20 minutes!',
    timestamp: '30 min ago',
    read: false,
  },
  {
    id: '4',
    type: 'won',
    message: 'Congratulations! You won Art Deco Chandelier',
    timestamp: '2 hours ago',
    read: true,
  },
];

export function NotificationTray({ onClose }: NotificationTrayProps) {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'outbid':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'winning':
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'ending_soon':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'won':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-xl font-semibold">Notifications</h2>
              <p className="text-sm text-gray-400 mt-1">Live auction updates</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
              aria-label="Close notifications"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto h-[calc(100vh-100px)]">
            {mockNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer ${
                  !notification.read ? 'bg-white/5' : ''
                }`}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.timestamp}</p>
                  </div>
                  {!notification.read && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
