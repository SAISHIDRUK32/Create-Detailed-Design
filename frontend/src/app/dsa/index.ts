/**
 * AURA-Auction DSA Module
 *
 * This module contains the core data structures and algorithms
 * used in the AURA-Auction platform.
 *
 * Data Structures:
 * - MaxHeap: Binary heap for O(1) max access, O(log n) insert/extract
 * - BidManager: Auction bid management using MaxHeap
 * - BidderGraph: Graph for collusion detection using DFS
 * - PriorityQueue: Min-heap for processing fraud alerts
 * - SignedAuditLogger: HMAC-signed tamper-proof audit trail
 *
 * Algorithms:
 * - FraudDetector: AI-powered fraud detection with feature vectors
 * - AdaptiveRuleEngine: Dynamic auction rule management
 */

// Core Data Structures
export { MaxHeap } from './MaxHeap';
export type { HeapNode } from './MaxHeap';

export { BidManager } from './BidManager';
export type { Bid, BidValidationResult, AuctionConfig } from './BidManager';

// Graph-Based Collusion Detection
export { BidderGraph } from './BidderGraph';
export type { EdgeData, CollusionRing, BidderStats } from './BidderGraph';

// Priority Queue
export { PriorityQueue, FraudAlertQueue, fraudAlertQueue } from './PriorityQueue';
export type { PriorityQueueItem } from './PriorityQueue';

// Fraud Detection
export { FraudDetector, fraudDetector } from './FraudDetector';
export type {
  BidFeatureVector,
  FraudResult,
  FraudAlert,
  RiskLevel,
  FraudAction,
  ShillBiddingResult,
  SnipingResult,
} from './FraudDetector';

// HMAC-Signed Audit Logging
export { SignedAuditLogger, auditLogger } from './SignedAuditLogger';
export type {
  AuditEventType,
  AuditEntry,
  SignedAuditEntry,
  ChainValidationResult,
} from './SignedAuditLogger';

// Adaptive Rule Engine
export { AdaptiveRuleEngine, ruleEngine } from './AdaptiveRuleEngine';
export type {
  AuctionContext,
  AdaptiveRule,
  RuleActionResult,
  AppliedRule,
  RuleEngineConfig,
} from './AdaptiveRuleEngine';
