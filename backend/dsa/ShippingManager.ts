/**
 * Shipping Integration
 *
 * Features:
 * - Label generation (FedEx, UPS, USPS)
 * - Tracking updates via webhooks
 * - SLA monitoring
 * - Proof of delivery
 * - Return management
 */

import { supabase } from '../config/supabase';
import { logAdminAction } from './AuditLogger';

export type Carrier = 'fedex' | 'ups' | 'usps' | 'custom';
export type ShipmentStatus = 'pending' | 'created' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'returned';

export interface ShipmentLabel {
  trackingNumber: string;
  labelUrl: string;
  carrier: Carrier;
  estimatedDelivery: Date;
}

export interface TrackingEvent {
  timestamp: Date;
  status: ShipmentStatus;
  location: string;
  description: string;
}

/**
 * Create shipment label
 */
export async function createShipmentLabel(
  orderId: string,
  carrierChoice: Carrier = 'usps'
): Promise<ShipmentLabel> {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) throw new Error('Order not found');

  console.log(`📦 Creating shipment label for order ${orderId} via ${carrierChoice}`);

  // Create shipment record
  const { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .insert({
      order_id: orderId,
      carrier: carrierChoice,
      status: 'pending',
    })
    .select()
    .single();

  if (shipmentError) throw shipmentError;

  // Call carrier API to generate label
  const label = await generateCarrierLabel(order, carrierChoice);

  // Update shipment with label details
  const { error: updateError } = await supabase
    .from('shipments')
    .update({
      tracking_number: label.trackingNumber,
      label_url: label.labelUrl,
      estimated_delivery: label.estimatedDelivery.toISOString(),
      status: 'created',
    })
    .eq('id', shipment.id);

  if (updateError) throw updateError;

  console.log(`✅ Shipment label created: ${label.trackingNumber}`);

  return label;
}

/**
 * Generate label via carrier API (mock implementations)
 */
async function generateCarrierLabel(order: any, carrier: Carrier): Promise<ShipmentLabel> {
  switch (carrier) {
    case 'usps':
      return generateUSPSLabel(order);
    case 'fedex':
      return generateFedExLabel(order);
    case 'ups':
      return generateUPSLabel(order);
    case 'custom':
      return generateCustomLabel(order);
    default:
      throw new Error(`Unknown carrier: ${carrier}`);
  }
}

/**
 * Generate USPS label (mock)
 */
async function generateUSPSLabel(order: any): Promise<ShipmentLabel> {
  // In production, call USPS Web Tools API
  const trackingNumber = `9400111899${generateRandomId(8)}`;

  return {
    trackingNumber,
    labelUrl: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    carrier: 'usps',
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
  };
}

/**
 * Generate FedEx label (mock)
 */
async function generateFedExLabel(order: any): Promise<ShipmentLabel> {
  // In production, call FedEx Web Services API
  const trackingNumber = `${generateRandomId(12)}`;

  return {
    trackingNumber,
    labelUrl: `https://tracking.fedex.com/tracking/${trackingNumber}`,
    carrier: 'fedex',
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
  };
}

/**
 * Generate UPS label (mock)
 */
async function generateUPSLabel(order: any): Promise<ShipmentLabel> {
  // In production, call UPS API
  const trackingNumber = `1Z${generateRandomId(14)}`;

  return {
    trackingNumber,
    labelUrl: `https://www.ups.com/track?tracknum=${trackingNumber}`,
    carrier: 'ups',
    estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days
  };
}

/**
 * Generate custom label
 */
async function generateCustomLabel(order: any): Promise<ShipmentLabel> {
  const trackingNumber = `AURA-${generateRandomId(10).toUpperCase()}`;

  return {
    trackingNumber,
    labelUrl: `https://aura-auction.local/track/${trackingNumber}`,
    carrier: 'custom',
    estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  };
}

/**
 * Handle carrier tracking webhook
 */
export async function handleTrackingWebhook(
  carrier: Carrier,
  webhookData: any
): Promise<void> {
  console.log(`🔔 Received tracking webhook from ${carrier}`);

  const trackingNumber = webhookData.tracking_number || webhookData.trackNumber;

  // Find shipment
  const { data: shipment, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('tracking_number', trackingNumber)
    .single();

  if (error || !shipment) {
    console.warn(`Shipment not found for tracking ${trackingNumber}`);
    return;
  }

  // Parse tracking event
  const event: TrackingEvent = parseTrackingEvent(carrier, webhookData);

  // Add tracking event
  await supabase
    .from('tracking_events')
    .insert({
      shipment_id: shipment.id,
      event_type: event.status,
      status: event.status,
      location: event.location,
      timestamp: event.timestamp.toISOString(),
      raw_data: webhookData,
    });

  // Update shipment status
  await supabase
    .from('shipments')
    .update({
      status: event.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', shipment.id);

  console.log(`📍 Tracking updated: ${trackingNumber} - ${event.status}`);

  // Handle delivery
  if (event.status === 'delivered') {
    await handleShipmentDelivered(shipment.order_id);
  }
}

/**
 * Parse tracking event from different carriers
 */
function parseTrackingEvent(carrier: Carrier, webhookData: any): TrackingEvent {
  switch (carrier) {
    case 'usps':
      return parseUSPSTracking(webhookData);
    case 'fedex':
      return parseFedExTracking(webhookData);
    case 'ups':
      return parseUPSTracking(webhookData);
    default:
      return parseGenericTracking(webhookData);
  }
}

function parseUSPSTracking(data: any): TrackingEvent {
  const statusMap: Record<string, ShipmentStatus> = {
    'Delivered, In/At Mailbox': 'delivered',
    'Out for Delivery': 'in_transit',
    'Picked Up': 'picked_up',
    'Delivery Failed': 'failed',
    'Returned': 'returned',
  };

  return {
    timestamp: new Date(data.timestamp || Date.now()),
    status: statusMap[data.status] || ('in_transit' as ShipmentStatus),
    location: data.location || 'USPS Facility',
    description: data.status || 'In transit',
  };
}

function parseFedExTracking(data: any): TrackingEvent {
  const statusMap: Record<string, ShipmentStatus> = {
    'Delivered': 'delivered',
    'In Transit': 'in_transit',
    'Picked Up': 'picked_up',
    'Delivery Exception': 'failed',
    'Returned': 'returned',
  };

  return {
    timestamp: new Date(data.timestamp || Date.now()),
    status: statusMap[data.status] || ('in_transit' as ShipmentStatus),
    location: data.city || 'FedEx Facility',
    description: data.status || 'In transit',
  };
}

function parseUPSTracking(data: any): TrackingEvent {
  const statusMap: Record<string, ShipmentStatus> = {
    'Delivered': 'delivered',
    'On the Way': 'in_transit',
    'Picked Up': 'picked_up',
    'Delivery Attempted': 'failed',
    'Returned': 'returned',
  };

  return {
    timestamp: new Date(data.timestamp || Date.now()),
    status: statusMap[data.status] || ('in_transit' as ShipmentStatus),
    location: data.location || 'UPS Facility',
    description: data.status || 'In transit',
  };
}

function parseGenericTracking(data: any): TrackingEvent {
  return {
    timestamp: new Date(data.timestamp || Date.now()),
    status: (data.status as ShipmentStatus) || 'in_transit',
    location: data.location || 'Unknown',
    description: data.description || 'In transit',
  };
}

/**
 * Handle shipment delivery (update order status)
 */
async function handleShipmentDelivered(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'delivered',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error('Failed to update order status:', error);
    return;
  }

  // Schedule payout release (72 hours after delivery for disputes)
  const releaseDate = new Date(Date.now() + 72 * 60 * 60 * 1000);

  console.log(`✅ Shipment delivered. Payout scheduled for ${releaseDate.toISOString()}`);

  // Create payment release schedule
  await supabase
    .from('payouts')
    .update({
      release_date: releaseDate.toISOString(),
    })
    .eq('order_id', orderId)
    .eq('status', 'pending');
}

/**
 * Monitor SLA (Service Level Agreement)
 */
export async function monitorShippingSLA(): Promise<void> {
  const now = new Date();

  // Get all in-transit shipments
  const { data: shipments } = await supabase
    .from('shipments')
    .select('*')
    .eq('status', 'in_transit');

  if (!shipments) return;

  for (const shipment of shipments) {
    const estimatedDelivery = new Date(shipment.estimated_delivery);

    // Check if overdue (24 hours past estimated)
    if (now > new Date(estimatedDelivery.getTime() + 24 * 60 * 60 * 1000)) {
      console.warn(`⚠️  Shipment ${shipment.tracking_number} is OVERDUE`);

      // Create note in order
      await supabase
        .from('orders')
        .update({
          notes: `Shipment ${shipment.tracking_number} is overdue. Expected ${estimatedDelivery.toDateString()}`,
        })
        .eq('id', shipment.order_id);

      // Notify buyer
      // await notifyBuyerShipmentOverdue(shipment.order_id);
    }
  }
}

/**
 * Create return shipment
 */
export async function createReturnShipment(
  originalShipmentId: string,
  reason: string,
  returnCarrier?: Carrier
): Promise<ShipmentLabel> {
  const { data: originalShipment, error: fetchError } = await supabase
    .from('shipments')
    .select('*')
    .eq('id', originalShipmentId)
    .single();

  if (fetchError || !originalShipment) throw new Error('Shipment not found');

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', originalShipment.order_id)
    .single();

  if (!order) throw new Error('Order not found');

  console.log(`🔄 Creating return shipment for order ${order.id}`);

  // Create return shipment
  const carrier = returnCarrier || (originalShipment.carrier as Carrier);
  const label = await generateCarrierLabel(order, carrier);

  // Store return label
  const { data: returnShipment, error: createError } = await supabase
    .from('shipments')
    .insert({
      order_id: order.id,
      carrier,
      tracking_number: label.trackingNumber,
      label_url: label.labelUrl,
      estimated_delivery: label.estimatedDelivery.toISOString(),
      status: 'created',
    })
    .select()
    .single();

  if (createError) throw createError;

  console.log(`✅ Return shipment created: ${label.trackingNumber}`);

  return label;
}

/**
 * Get shipment tracking history
 */
export async function getShipmentTracking(shipmentId: string): Promise<TrackingEvent[]> {
  const { data: events, error } = await supabase
    .from('tracking_events')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Failed to fetch tracking events:', error);
    return [];
  }

  return (events || []).map(e => ({
    timestamp: new Date(e.timestamp),
    status: e.status as ShipmentStatus,
    location: e.location,
    description: e.event_type,
  }));
}

/**
 * Generate random ID
 */
function generateRandomId(length: number): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

export default {
  createShipmentLabel,
  handleTrackingWebhook,
  monitorShippingSLA,
  createReturnShipment,
  getShipmentTracking,
};
