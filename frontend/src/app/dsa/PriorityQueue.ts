/**
 * PriorityQueue - Min-Heap Based Priority Queue
 *
 * Used for processing fraud alerts with highest priority first.
 * Priority 1 = Critical (processed first), Priority 5 = Low
 *
 * Time Complexity:
 * - enqueue: O(log n)
 * - dequeue: O(log n)
 * - peek: O(1)
 */

export interface PriorityQueueItem<T> {
  priority: number;  // Lower = higher priority (1 = most urgent)
  data: T;
  timestamp: Date;
}

export class PriorityQueue<T> {
  private heap: PriorityQueueItem<T>[] = [];

  /**
   * Get the number of items in the queue
   */
  get size(): number {
    return this.heap.length;
  }

  /**
   * Check if queue is empty
   */
  get isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Add an item to the queue
   * Time Complexity: O(log n)
   */
  enqueue(data: T, priority: number): void {
    const item: PriorityQueueItem<T> = {
      priority,
      data,
      timestamp: new Date(),
    };
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Remove and return the highest priority item
   * Time Complexity: O(log n)
   */
  dequeue(): PriorityQueueItem<T> | null {
    if (this.isEmpty) return null;

    const min = this.heap[0];
    const last = this.heap.pop()!;

    if (!this.isEmpty) {
      this.heap[0] = last;
      this.sinkDown(0);
    }

    return min;
  }

  /**
   * View the highest priority item without removing
   * Time Complexity: O(1)
   */
  peek(): PriorityQueueItem<T> | null {
    return this.isEmpty ? null : this.heap[0];
  }

  /**
   * Get all items by priority (without removing)
   */
  toArray(): PriorityQueueItem<T>[] {
    return [...this.heap].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get items within a priority range
   */
  getByPriorityRange(minPriority: number, maxPriority: number): PriorityQueueItem<T>[] {
    return this.heap.filter(
      item => item.priority >= minPriority && item.priority <= maxPriority
    ).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.heap = [];
  }

  private getParentIndex(index: number): number {
    return Math.floor((index - 1) / 2);
  }

  private getLeftChildIndex(index: number): number {
    return 2 * index + 1;
  }

  private getRightChildIndex(index: number): number {
    return 2 * index + 2;
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = this.getParentIndex(index);
      if (this.heap[index].priority >= this.heap[parentIndex].priority) break;
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;

    while (true) {
      let smallest = index;
      const left = this.getLeftChildIndex(index);
      const right = this.getRightChildIndex(index);

      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }

      if (smallest === index) break;

      this.swap(index, smallest);
      index = smallest;
    }
  }
}

/**
 * FraudAlertQueue - Specialized Priority Queue for Fraud Alerts
 */
import { FraudAlert, RiskLevel } from './FraudDetector';

export class FraudAlertQueue {
  private queue: PriorityQueue<FraudAlert>;
  private processed: FraudAlert[] = [];

  constructor() {
    this.queue = new PriorityQueue<FraudAlert>();
  }

  /**
   * Convert risk level to priority number
   */
  private riskToPriority(level: RiskLevel): number {
    switch (level) {
      case 'CRITICAL': return 1;
      case 'HIGH': return 2;
      case 'MEDIUM': return 3;
      case 'LOW': return 4;
      default: return 5;
    }
  }

  /**
   * Add a fraud alert to the queue
   */
  addAlert(alert: FraudAlert): void {
    const priority = this.riskToPriority(alert.riskLevel);
    this.queue.enqueue(alert, priority);
  }

  /**
   * Get and remove the highest priority alert
   */
  getNextAlert(): FraudAlert | null {
    const item = this.queue.dequeue();
    if (item) {
      this.processed.push(item.data);
      return item.data;
    }
    return null;
  }

  /**
   * Peek at the highest priority alert
   */
  peekNextAlert(): FraudAlert | null {
    const item = this.queue.peek();
    return item ? item.data : null;
  }

  /**
   * Get all pending alerts
   */
  getAllPending(): FraudAlert[] {
    return this.queue.toArray().map(item => item.data);
  }

  /**
   * Get critical alerts only
   */
  getCriticalAlerts(): FraudAlert[] {
    return this.queue.getByPriorityRange(1, 1).map(item => item.data);
  }

  /**
   * Get high priority alerts (critical + high)
   */
  getHighPriorityAlerts(): FraudAlert[] {
    return this.queue.getByPriorityRange(1, 2).map(item => item.data);
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    processed: number;
  } {
    const all = this.queue.toArray();
    return {
      total: all.length,
      critical: all.filter(i => i.priority === 1).length,
      high: all.filter(i => i.priority === 2).length,
      medium: all.filter(i => i.priority === 3).length,
      low: all.filter(i => i.priority === 4).length,
      processed: this.processed.length,
    };
  }

  /**
   * Get processed alerts history
   */
  getProcessedHistory(): FraudAlert[] {
    return [...this.processed];
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue.clear();
  }
}

// Export singleton instance
export const fraudAlertQueue = new FraudAlertQueue();
