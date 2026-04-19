/**
 * BidderGraph - Collusion Detection using Graph Theory
 *
 * A directed graph that models relationships between bidders.
 * Edges represent "has bid against" relationships with weights
 * capturing interaction frequency.
 *
 * Uses DFS cycle detection to identify potential collusion rings
 * where multiple bidders repeatedly interact across auctions.
 *
 * Time Complexity:
 * - Add interaction: O(1)
 * - Detect collusion rings: O(V + E) where V = bidders, E = interactions
 */

export interface EdgeData {
  weight: number;
  auctions: string[];
  lastInteraction: Date;
  suspicionScore: number;
}

export interface CollusionRing {
  participants: string[];
  totalInteractions: number;
  sharedAuctions: string[];
  riskScore: number;
}

export interface BidderStats {
  bidderId: string;
  totalInteractions: number;
  uniqueOpponents: number;
  avgInteractionFrequency: number;
  suspicionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class BidderGraph {
  private adjacencyList: Map<string, Map<string, EdgeData>> = new Map();
  private bidderMetadata: Map<string, { totalBids: number; auctions: Set<string> }> = new Map();

  /**
   * Add a bidding interaction between two bidders in an auction
   */
  addInteraction(bidderA: string, bidderB: string, auctionId: string): void {
    // Skip self-interactions
    if (bidderA === bidderB) return;

    // Initialize bidder nodes if not present
    if (!this.adjacencyList.has(bidderA)) {
      this.adjacencyList.set(bidderA, new Map());
    }
    if (!this.adjacencyList.has(bidderB)) {
      this.adjacencyList.set(bidderB, new Map());
    }

    // Add bidirectional edges (collusion is mutual)
    this.addEdge(bidderA, bidderB, auctionId);
    this.addEdge(bidderB, bidderA, auctionId);

    // Update metadata
    this.updateMetadata(bidderA, auctionId);
    this.updateMetadata(bidderB, auctionId);
  }

  private addEdge(from: string, to: string, auctionId: string): void {
    const edges = this.adjacencyList.get(from)!;

    if (!edges.has(to)) {
      edges.set(to, {
        weight: 0,
        auctions: [],
        lastInteraction: new Date(),
        suspicionScore: 0,
      });
    }

    const edge = edges.get(to)!;
    edge.weight++;
    if (!edge.auctions.includes(auctionId)) {
      edge.auctions.push(auctionId);
    }
    edge.lastInteraction = new Date();

    // Calculate suspicion score based on interaction patterns
    edge.suspicionScore = this.calculateEdgeSuspicion(edge);
  }

  private updateMetadata(bidderId: string, auctionId: string): void {
    if (!this.bidderMetadata.has(bidderId)) {
      this.bidderMetadata.set(bidderId, { totalBids: 0, auctions: new Set() });
    }
    const meta = this.bidderMetadata.get(bidderId)!;
    meta.totalBids++;
    meta.auctions.add(auctionId);
  }

  private calculateEdgeSuspicion(edge: EdgeData): number {
    let score = 0;

    // High interaction frequency
    if (edge.weight >= 10) score += 0.4;
    else if (edge.weight >= 5) score += 0.2;
    else if (edge.weight >= 3) score += 0.1;

    // Multiple shared auctions
    if (edge.auctions.length >= 5) score += 0.3;
    else if (edge.auctions.length >= 3) score += 0.15;

    // Recent activity (within last hour)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (edge.lastInteraction > hourAgo) score += 0.2;

    return Math.min(1, score);
  }

  /**
   * Detect collusion rings using DFS cycle detection
   * Time Complexity: O(V + E)
   */
  detectCollusionRings(minInteractions: number = 3): CollusionRing[] {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const rings: CollusionRing[] = [];

    for (const [node] of this.adjacencyList) {
      if (!visited.has(node)) {
        this.dfs(node, visited, recStack, [], rings, minInteractions);
      }
    }

    // Sort by risk score
    return rings.sort((a, b) => b.riskScore - a.riskScore);
  }

  private dfs(
    node: string,
    visited: Set<string>,
    recStack: Set<string>,
    path: string[],
    rings: CollusionRing[],
    minInteractions: number
  ): void {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = this.adjacencyList.get(node) || new Map();

    for (const [neighbor, edge] of neighbors) {
      // Only consider edges with enough interactions
      if (edge.weight < minInteractions) continue;

      if (!visited.has(neighbor)) {
        this.dfs(neighbor, visited, recStack, path, rings, minInteractions);
      } else if (recStack.has(neighbor)) {
        // Cycle detected - potential collusion ring!
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const ringParticipants = path.slice(cycleStart);

          // Only consider rings with 2+ participants
          if (ringParticipants.length >= 2) {
            const ring = this.analyzeRing(ringParticipants);
            if (ring.riskScore > 0.3) {
              rings.push(ring);
            }
          }
        }
      }
    }

    path.pop();
    recStack.delete(node);
  }

  private analyzeRing(participants: string[]): CollusionRing {
    let totalInteractions = 0;
    const sharedAuctionsSet = new Set<string>();

    // Analyze interactions within the ring
    for (let i = 0; i < participants.length; i++) {
      const from = participants[i];
      const to = participants[(i + 1) % participants.length];

      const edges = this.adjacencyList.get(from);
      if (edges && edges.has(to)) {
        const edge = edges.get(to)!;
        totalInteractions += edge.weight;
        edge.auctions.forEach(a => sharedAuctionsSet.add(a));
      }
    }

    // Calculate risk score
    let riskScore = 0;

    // More participants = higher risk
    riskScore += Math.min(0.3, participants.length * 0.1);

    // More interactions = higher risk
    riskScore += Math.min(0.3, totalInteractions * 0.02);

    // More shared auctions = higher risk
    riskScore += Math.min(0.4, sharedAuctionsSet.size * 0.05);

    return {
      participants,
      totalInteractions,
      sharedAuctions: Array.from(sharedAuctionsSet),
      riskScore: Math.min(1, riskScore),
    };
  }

  /**
   * Get statistics for a specific bidder
   */
  getBidderStats(bidderId: string): BidderStats | null {
    const edges = this.adjacencyList.get(bidderId);
    if (!edges) return null;

    let totalInteractions = 0;
    let totalSuspicion = 0;

    for (const edge of edges.values()) {
      totalInteractions += edge.weight;
      totalSuspicion += edge.suspicionScore;
    }

    const uniqueOpponents = edges.size;
    const avgInteractionFrequency = uniqueOpponents > 0 ? totalInteractions / uniqueOpponents : 0;
    const avgSuspicion = uniqueOpponents > 0 ? totalSuspicion / uniqueOpponents : 0;

    let suspicionLevel: BidderStats['suspicionLevel'] = 'LOW';
    if (avgSuspicion >= 0.7) suspicionLevel = 'CRITICAL';
    else if (avgSuspicion >= 0.5) suspicionLevel = 'HIGH';
    else if (avgSuspicion >= 0.3) suspicionLevel = 'MEDIUM';

    return {
      bidderId,
      totalInteractions,
      uniqueOpponents,
      avgInteractionFrequency,
      suspicionLevel,
    };
  }

  /**
   * Get all bidders with high suspicion levels
   */
  getSuspiciousBidders(): BidderStats[] {
    const suspicious: BidderStats[] = [];

    for (const bidderId of this.adjacencyList.keys()) {
      const stats = this.getBidderStats(bidderId);
      if (stats && (stats.suspicionLevel === 'HIGH' || stats.suspicionLevel === 'CRITICAL')) {
        suspicious.push(stats);
      }
    }

    return suspicious.sort((a, b) => {
      const levelOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return levelOrder[a.suspicionLevel] - levelOrder[b.suspicionLevel];
    });
  }

  /**
   * Check if two bidders might be colluding
   */
  checkPairCollusion(bidderA: string, bidderB: string): {
    isColluding: boolean;
    confidence: number;
    evidence: string[];
  } {
    const edgesA = this.adjacencyList.get(bidderA);
    if (!edgesA || !edgesA.has(bidderB)) {
      return { isColluding: false, confidence: 0, evidence: [] };
    }

    const edge = edgesA.get(bidderB)!;
    const evidence: string[] = [];
    let confidence = 0;

    if (edge.weight >= 10) {
      evidence.push(`High interaction count: ${edge.weight} times`);
      confidence += 0.3;
    }

    if (edge.auctions.length >= 5) {
      evidence.push(`Multiple shared auctions: ${edge.auctions.length}`);
      confidence += 0.3;
    }

    if (edge.suspicionScore >= 0.5) {
      evidence.push(`Elevated suspicion score: ${(edge.suspicionScore * 100).toFixed(0)}%`);
      confidence += 0.2;
    }

    // Check for bid pattern similarity (simplified)
    const metaA = this.bidderMetadata.get(bidderA);
    const metaB = this.bidderMetadata.get(bidderB);
    if (metaA && metaB) {
      const commonAuctions = [...metaA.auctions].filter(a => metaB.auctions.has(a));
      if (commonAuctions.length >= 3) {
        evidence.push(`Frequently compete in same auctions: ${commonAuctions.length}`);
        confidence += 0.2;
      }
    }

    return {
      isColluding: confidence >= 0.5,
      confidence: Math.min(1, confidence),
      evidence,
    };
  }

  /**
   * Get graph statistics for visualization
   */
  getGraphStats(): {
    totalBidders: number;
    totalEdges: number;
    avgDegree: number;
    density: number;
  } {
    const totalBidders = this.adjacencyList.size;
    let totalEdges = 0;

    for (const edges of this.adjacencyList.values()) {
      totalEdges += edges.size;
    }

    // Divide by 2 since edges are bidirectional
    totalEdges = totalEdges / 2;

    const avgDegree = totalBidders > 0 ? (totalEdges * 2) / totalBidders : 0;
    const maxEdges = (totalBidders * (totalBidders - 1)) / 2;
    const density = maxEdges > 0 ? totalEdges / maxEdges : 0;

    return {
      totalBidders,
      totalEdges,
      avgDegree,
      density,
    };
  }

  /**
   * Export graph for visualization (D3.js format)
   */
  toVisualizationData(): {
    nodes: Array<{ id: string; suspicion: number }>;
    links: Array<{ source: string; target: string; weight: number }>;
  } {
    const nodes: Array<{ id: string; suspicion: number }> = [];
    const links: Array<{ source: string; target: string; weight: number }> = [];
    const addedLinks = new Set<string>();

    for (const [bidderId, edges] of this.adjacencyList) {
      const stats = this.getBidderStats(bidderId);
      nodes.push({
        id: bidderId,
        suspicion: stats ? { LOW: 0.1, MEDIUM: 0.4, HIGH: 0.7, CRITICAL: 1 }[stats.suspicionLevel] : 0,
      });

      for (const [target, edge] of edges) {
        const linkId = [bidderId, target].sort().join('-');
        if (!addedLinks.has(linkId)) {
          links.push({
            source: bidderId,
            target,
            weight: edge.weight,
          });
          addedLinks.add(linkId);
        }
      }
    }

    return { nodes, links };
  }
}
