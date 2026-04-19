/**
 * MaxHeap Data Structure for AURA-Auction
 *
 * A Max-Heap is a complete binary tree where each parent node
 * is greater than or equal to its children. This gives us:
 *
 * - O(1) access to the maximum element (highest bid)
 * - O(log n) insertion of new elements
 * - O(log n) extraction of maximum element
 * - O(n) heapify operation
 *
 * For auctions, this is perfect because we always need quick
 * access to the highest bid without sorting the entire array.
 */

export interface HeapNode<T> {
  value: number;
  data: T;
}

export class MaxHeap<T> {
  private heap: HeapNode<T>[] = [];
  private operationLog: string[] = [];

  constructor(initialItems?: HeapNode<T>[]) {
    if (initialItems && initialItems.length > 0) {
      this.buildHeap(initialItems);
    }
  }

  /**
   * Get the number of items in the heap
   */
  get size(): number {
    return this.heap.length;
  }

  /**
   * Check if heap is empty
   */
  get isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Get operation log for visualization/debugging
   */
  getOperationLog(): string[] {
    return [...this.operationLog];
  }

  /**
   * Clear operation log
   */
  clearLog(): void {
    this.operationLog = [];
  }

  /**
   * Get parent index of a node
   * Parent of node at index i is at floor((i-1)/2)
   */
  private getParentIndex(index: number): number {
    return Math.floor((index - 1) / 2);
  }

  /**
   * Get left child index of a node
   * Left child of node at index i is at 2i + 1
   */
  private getLeftChildIndex(index: number): number {
    return 2 * index + 1;
  }

  /**
   * Get right child index of a node
   * Right child of node at index i is at 2i + 2
   */
  private getRightChildIndex(index: number): number {
    return 2 * index + 2;
  }

  /**
   * Check if a node has a parent
   */
  private hasParent(index: number): boolean {
    return this.getParentIndex(index) >= 0;
  }

  /**
   * Check if a node has a left child
   */
  private hasLeftChild(index: number): boolean {
    return this.getLeftChildIndex(index) < this.heap.length;
  }

  /**
   * Check if a node has a right child
   */
  private hasRightChild(index: number): boolean {
    return this.getRightChildIndex(index) < this.heap.length;
  }

  /**
   * Get parent node
   */
  private parent(index: number): HeapNode<T> {
    return this.heap[this.getParentIndex(index)];
  }

  /**
   * Get left child node
   */
  private leftChild(index: number): HeapNode<T> {
    return this.heap[this.getLeftChildIndex(index)];
  }

  /**
   * Get right child node
   */
  private rightChild(index: number): HeapNode<T> {
    return this.heap[this.getRightChildIndex(index)];
  }

  /**
   * Swap two nodes in the heap
   */
  private swap(index1: number, index2: number): void {
    const temp = this.heap[index1];
    this.heap[index1] = this.heap[index2];
    this.heap[index2] = temp;
    this.operationLog.push(
      `Swap: $${this.heap[index1].value.toLocaleString()} ↔ $${this.heap[index2].value.toLocaleString()}`
    );
  }

  /**
   * Heapify Up (Bubble Up)
   * Used after insertion to maintain heap property
   * Time Complexity: O(log n)
   */
  private heapifyUp(): void {
    let index = this.heap.length - 1;
    this.operationLog.push(
      `HeapifyUp: Starting with $${this.heap[index].value.toLocaleString()} at index ${index}`
    );

    while (
      this.hasParent(index) &&
      this.parent(index).value < this.heap[index].value
    ) {
      const parentIndex = this.getParentIndex(index);
      this.swap(parentIndex, index);
      index = parentIndex;
    }

    this.operationLog.push(`HeapifyUp: Complete. Node now at index ${index}`);
  }

  /**
   * Heapify Down (Bubble Down / Sift Down)
   * Used after extraction to maintain heap property
   * Time Complexity: O(log n)
   */
  private heapifyDown(): void {
    let index = 0;
    this.operationLog.push(
      `HeapifyDown: Starting with $${this.heap[index]?.value.toLocaleString()} at root`
    );

    while (this.hasLeftChild(index)) {
      // Find the larger child
      let largerChildIndex = this.getLeftChildIndex(index);

      if (
        this.hasRightChild(index) &&
        this.rightChild(index).value > this.leftChild(index).value
      ) {
        largerChildIndex = this.getRightChildIndex(index);
      }

      // If current node is larger than both children, heap property is satisfied
      if (this.heap[index].value >= this.heap[largerChildIndex].value) {
        break;
      }

      // Otherwise, swap with the larger child and continue
      this.swap(index, largerChildIndex);
      index = largerChildIndex;
    }

    this.operationLog.push(`HeapifyDown: Complete. Node now at index ${index}`);
  }

  /**
   * Build heap from an array of items
   * Time Complexity: O(n) - more efficient than inserting one by one O(n log n)
   */
  private buildHeap(items: HeapNode<T>[]): void {
    this.heap = [...items];
    this.operationLog.push(`BuildHeap: Starting with ${items.length} items`);

    // Start from the last non-leaf node and heapify down each node
    // Last non-leaf node is at index floor(n/2) - 1
    const startIndex = Math.floor(this.heap.length / 2) - 1;

    for (let i = startIndex; i >= 0; i--) {
      this.heapifyDownFrom(i);
    }

    this.operationLog.push(`BuildHeap: Complete. Heap size: ${this.heap.length}`);
  }

  /**
   * Heapify down starting from a specific index
   * Used in buildHeap
   */
  private heapifyDownFrom(startIndex: number): void {
    let index = startIndex;

    while (this.hasLeftChild(index)) {
      let largerChildIndex = this.getLeftChildIndex(index);

      if (
        this.hasRightChild(index) &&
        this.rightChild(index).value > this.leftChild(index).value
      ) {
        largerChildIndex = this.getRightChildIndex(index);
      }

      if (this.heap[index].value >= this.heap[largerChildIndex].value) {
        break;
      }

      this.swap(index, largerChildIndex);
      index = largerChildIndex;
    }
  }

  /**
   * Insert a new element into the heap
   * Time Complexity: O(log n)
   */
  insert(value: number, data: T): void {
    const node: HeapNode<T> = { value, data };
    this.heap.push(node);
    this.operationLog.push(
      `Insert: Adding $${value.toLocaleString()} to heap (size: ${this.heap.length})`
    );
    this.heapifyUp();
  }

  /**
   * Peek at the maximum element without removing it
   * Time Complexity: O(1)
   */
  peek(): HeapNode<T> | null {
    if (this.isEmpty) {
      return null;
    }
    return this.heap[0];
  }

  /**
   * Extract (remove and return) the maximum element
   * Time Complexity: O(log n)
   */
  extractMax(): HeapNode<T> | null {
    if (this.isEmpty) {
      return null;
    }

    const max = this.heap[0];
    this.operationLog.push(
      `ExtractMax: Removing $${max.value.toLocaleString()} from heap`
    );

    // Move the last element to the root
    this.heap[0] = this.heap[this.heap.length - 1];
    this.heap.pop();

    // Restore heap property
    if (!this.isEmpty) {
      this.heapifyDown();
    }

    return max;
  }

  /**
   * Get all elements in heap order (for visualization)
   * This returns a copy, not the actual heap
   */
  toArray(): HeapNode<T>[] {
    return [...this.heap];
  }

  /**
   * Get all elements sorted by value (highest first)
   * Time Complexity: O(n log n)
   * Note: This creates a copy and doesn't modify the original heap
   */
  toSortedArray(): HeapNode<T>[] {
    const tempHeap = new MaxHeap<T>([...this.heap]);
    const sorted: HeapNode<T>[] = [];

    while (!tempHeap.isEmpty) {
      const max = tempHeap.extractMax();
      if (max) sorted.push(max);
    }

    return sorted;
  }

  /**
   * Get the top K elements
   * Time Complexity: O(k log n)
   */
  getTopK(k: number): HeapNode<T>[] {
    const tempHeap = new MaxHeap<T>([...this.heap]);
    const result: HeapNode<T>[] = [];

    for (let i = 0; i < k && !tempHeap.isEmpty; i++) {
      const max = tempHeap.extractMax();
      if (max) result.push(max);
    }

    return result;
  }

  /**
   * Get heap statistics
   */
  getStats(): {
    size: number;
    maxValue: number | null;
    minValue: number | null;
    height: number;
  } {
    if (this.isEmpty) {
      return { size: 0, maxValue: null, minValue: null, height: 0 };
    }

    const values = this.heap.map(n => n.value);
    return {
      size: this.heap.length,
      maxValue: this.heap[0].value,
      minValue: Math.min(...values),
      height: Math.floor(Math.log2(this.heap.length)) + 1,
    };
  }

  /**
   * Visualize the heap as a tree structure (for console/debugging)
   */
  visualize(): string {
    if (this.isEmpty) return 'Empty Heap';

    const lines: string[] = [];
    const height = Math.floor(Math.log2(this.heap.length)) + 1;
    let levelStart = 0;
    let levelSize = 1;

    for (let level = 0; level < height; level++) {
      const levelNodes: string[] = [];
      for (let i = 0; i < levelSize && levelStart + i < this.heap.length; i++) {
        levelNodes.push(`$${this.heap[levelStart + i].value.toLocaleString()}`);
      }

      const spacing = ' '.repeat(Math.pow(2, height - level - 1) * 4);
      lines.push(spacing + levelNodes.join(spacing));

      levelStart += levelSize;
      levelSize *= 2;
    }

    return lines.join('\n');
  }
}
