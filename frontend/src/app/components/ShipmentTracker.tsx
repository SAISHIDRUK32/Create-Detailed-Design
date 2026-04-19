/**
 * ShipmentTracker - Visual Delivery Timeline Component
 *
 * Displays shipment status with an animated timeline showing
 * all tracking events from label creation to delivery.
 */

import { motion } from 'motion/react';
import {
  Package,
  Truck,
  MapPin,
  Home,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react';

export type ShipmentStatus =
  | 'label_created'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'exception';

export interface TrackingEvent {
  status: ShipmentStatus;
  location: string;
  timestamp: Date;
  details: string;
}

export interface Shipment {
  id: string;
  carrier: string;
  trackingNumber: string;
  estimatedDelivery?: Date;
  currentStatus: ShipmentStatus;
  events: TrackingEvent[];
  shippedAt?: Date;
  deliveredAt?: Date;
  address: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

interface ShipmentTrackerProps {
  shipment: Shipment;
  onTrackExternal?: () => void;
}

const statusConfig: Record<ShipmentStatus, {
  label: string;
  icon: typeof Package;
  color: string;
  bgColor: string;
}> = {
  label_created: {
    label: 'Label Created',
    icon: Package,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  picked_up: {
    label: 'Picked Up',
    icon: Truck,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  in_transit: {
    label: 'In Transit',
    icon: Truck,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    icon: MapPin,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
  },
  delivered: {
    label: 'Delivered',
    icon: Home,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
  },
  exception: {
    label: 'Exception',
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
};

const statusOrder: ShipmentStatus[] = [
  'label_created',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
];

export function ShipmentTracker({ shipment, onTrackExternal }: ShipmentTrackerProps) {
  const currentStatusIndex = statusOrder.indexOf(shipment.currentStatus);
  const isException = shipment.currentStatus === 'exception';

  return (
    <div className="backdrop-blur-xl bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Shipment Tracking</h3>
            <p className="text-sm text-gray-400 mt-1">
              {shipment.carrier} • {shipment.trackingNumber}
            </p>
          </div>
          {onTrackExternal && (
            <button
              onClick={onTrackExternal}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
            >
              Track on {shipment.carrier}
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Current Status Banner */}
        <div className={`mt-4 p-4 rounded-xl ${statusConfig[shipment.currentStatus].bgColor} border border-white/10`}>
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = statusConfig[shipment.currentStatus].icon;
              return <Icon className={`w-6 h-6 ${statusConfig[shipment.currentStatus].color}`} />;
            })()}
            <div>
              <p className={`font-semibold ${statusConfig[shipment.currentStatus].color}`}>
                {statusConfig[shipment.currentStatus].label}
              </p>
              {shipment.estimatedDelivery && shipment.currentStatus !== 'delivered' && (
                <p className="text-sm text-gray-400">
                  Estimated delivery: {shipment.estimatedDelivery.toLocaleDateString()}
                </p>
              )}
              {shipment.deliveredAt && (
                <p className="text-sm text-gray-400">
                  Delivered on {shipment.deliveredAt.toLocaleDateString()} at {shipment.deliveredAt.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          {statusOrder.map((status, index) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            const isActive = index <= currentStatusIndex && !isException;
            const isCurrent = index === currentStatusIndex && !isException;

            return (
              <div key={status} className="flex items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                    opacity: isActive ? 1 : 0.4,
                  }}
                  className={`relative flex items-center justify-center w-10 h-10 rounded-full ${
                    isActive ? config.bgColor : 'bg-slate-700'
                  } border-2 ${isCurrent ? 'border-' + config.color.replace('text-', '') : 'border-transparent'}`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? config.color : 'text-gray-500'}`} />
                  {isCurrent && (
                    <motion.div
                      className={`absolute inset-0 rounded-full ${config.bgColor}`}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.div>
                {index < statusOrder.length - 1 && (
                  <div
                    className={`w-8 sm:w-16 h-0.5 mx-1 ${
                      index < currentStatusIndex && !isException
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                        : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          {statusOrder.map((status) => (
            <span key={status} className="text-xs text-gray-500 text-center w-10">
              {statusConfig[status].label.split(' ')[0]}
            </span>
          ))}
        </div>
      </div>

      {/* Tracking Events Timeline */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-gray-400 mb-4">Tracking History</h4>
        <div className="space-y-4">
          {shipment.events.map((event, index) => {
            const config = statusConfig[event.status];
            const Icon = config.icon;
            const isLatest = index === 0;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4"
              >
                {/* Timeline Line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isLatest ? config.bgColor : 'bg-slate-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isLatest ? config.color : 'text-gray-500'}`} />
                  </div>
                  {index < shipment.events.length - 1 && (
                    <div className="w-0.5 h-full min-h-[40px] bg-slate-700 my-1" />
                  )}
                </div>

                {/* Event Details */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-medium ${isLatest ? 'text-white' : 'text-gray-400'}`}>
                        {event.details}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{event.timestamp.toLocaleDateString()}</p>
                      <p>{event.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Delivery Address */}
      <div className="p-6 bg-slate-900/50 border-t border-white/10">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Delivery Address</h4>
        <div className="text-sm">
          <p className="font-medium">{shipment.address.name}</p>
          <p className="text-gray-400">{shipment.address.street}</p>
          <p className="text-gray-400">
            {shipment.address.city}, {shipment.address.state} {shipment.address.zip}
          </p>
          <p className="text-gray-400">{shipment.address.country}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact shipment status badge
 */
export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
