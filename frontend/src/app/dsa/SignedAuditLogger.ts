/**
 * SignedAuditLogger - HMAC-Signed Tamper-Proof Audit Trail
 *
 * Every critical action is logged with an HMAC signature that chains
 * to the previous entry, creating a blockchain-like tamper-proof log.
 *
 * If any entry is modified, the chain verification will fail,
 * indicating exactly where tampering occurred.
 */

export type AuditEventType =
  | 'BID_PLACED'
  | 'BID_CANCELLED'
  | 'BID_REJECTED'
  | 'AUCTION_CREATED'
  | 'AUCTION_STARTED'
  | 'AUCTION_ENDED'
  | 'AUCTION_EXTENDED'
  | 'FRAUD_DETECTED'
  | 'FRAUD_RESOLVED'
  | 'RULE_APPLIED'
  | 'RULE_OVERRIDDEN'
  | 'USER_BLOCKED'
  | 'USER_UNBLOCKED'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED'
  | 'PAYOUT_RELEASED'
  | 'DISPUTE_FILED'
  | 'DISPUTE_RESOLVED'
  | 'MFA_ENABLED'
  | 'MFA_VERIFIED'
  | 'ADMIN_ACTION';

export interface AuditEntry {
  type: AuditEventType;
  data: Record<string, unknown>;
  userId?: string;
  auctionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SignedAuditEntry extends AuditEntry {
  id: string;
  timestamp: Date;
  signature: string;
  previousHash: string;
  sequenceNumber: number;
}

export interface ChainValidationResult {
  valid: boolean;
  totalEntries: number;
  brokenAt?: number;
  brokenEntry?: SignedAuditEntry;
  errorMessage?: string;
}

/**
 * Simple HMAC-SHA256 implementation for browser environment
 * In production, use Web Crypto API or a proper crypto library
 */
async function hmacSHA256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);

  // Use Web Crypto API if available
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Fallback: Simple hash (NOT cryptographically secure - for demo only)
  let hash = 0;
  const combined = key + message;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

export class SignedAuditLogger {
  private secret: string;
  private entries: SignedAuditEntry[] = [];
  private sequenceCounter: number = 0;

  constructor(hmacSecret: string = 'aura-auction-secret-key-2024') {
    this.secret = hmacSecret;
  }

  /**
   * Get the hash of the last entry (or genesis hash)
   */
  private getLastHash(): string {
    if (this.entries.length === 0) {
      return '0'.repeat(64); // Genesis hash
    }
    return this.entries[this.entries.length - 1].signature;
  }

  /**
   * Create a signed audit log entry
   */
  async log(entry: AuditEntry): Promise<SignedAuditEntry> {
    const timestamp = new Date();
    const previousHash = this.getLastHash();
    this.sequenceCounter++;

    // Create payload for signing
    const payload = JSON.stringify({
      ...entry,
      timestamp: timestamp.toISOString(),
      previousHash,
      sequenceNumber: this.sequenceCounter,
    });

    // Generate HMAC signature
    const signature = await hmacSHA256(this.secret, payload);

    const signedEntry: SignedAuditEntry = {
      ...entry,
      id: `audit-${this.sequenceCounter}-${Date.now()}`,
      timestamp,
      signature,
      previousHash,
      sequenceNumber: this.sequenceCounter,
    };

    this.entries.push(signedEntry);
    return signedEntry;
  }

  /**
   * Verify the integrity of the entire audit chain
   */
  async verifyChain(): Promise<ChainValidationResult> {
    if (this.entries.length === 0) {
      return { valid: true, totalEntries: 0 };
    }

    // Verify genesis entry
    const genesisHash = '0'.repeat(64);
    if (this.entries[0].previousHash !== genesisHash) {
      return {
        valid: false,
        totalEntries: this.entries.length,
        brokenAt: 0,
        brokenEntry: this.entries[0],
        errorMessage: 'Genesis entry has invalid previous hash',
      };
    }

    // Verify each subsequent entry
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Recreate the payload
      const payload = JSON.stringify({
        type: entry.type,
        data: entry.data,
        userId: entry.userId,
        auctionId: entry.auctionId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        timestamp: entry.timestamp.toISOString(),
        previousHash: entry.previousHash,
        sequenceNumber: entry.sequenceNumber,
      });

      // Verify signature
      const expectedSignature = await hmacSHA256(this.secret, payload);
      if (expectedSignature !== entry.signature) {
        return {
          valid: false,
          totalEntries: this.entries.length,
          brokenAt: i,
          brokenEntry: entry,
          errorMessage: `Entry ${i} has invalid signature (content was tampered)`,
        };
      }

      // Verify chain link (except for first entry)
      if (i > 0 && entry.previousHash !== this.entries[i - 1].signature) {
        return {
          valid: false,
          totalEntries: this.entries.length,
          brokenAt: i,
          brokenEntry: entry,
          errorMessage: `Entry ${i} has broken chain link (entry inserted or removed)`,
        };
      }
    }

    return { valid: true, totalEntries: this.entries.length };
  }

  /**
   * Get all audit entries
   */
  getAllEntries(): SignedAuditEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries by type
   */
  getEntriesByType(type: AuditEventType): SignedAuditEntry[] {
    return this.entries.filter(e => e.type === type);
  }

  /**
   * Get entries for a specific auction
   */
  getEntriesForAuction(auctionId: string): SignedAuditEntry[] {
    return this.entries.filter(e => e.auctionId === auctionId);
  }

  /**
   * Get entries for a specific user
   */
  getEntriesForUser(userId: string): SignedAuditEntry[] {
    return this.entries.filter(e => e.userId === userId);
  }

  /**
   * Get entries within a time range
   */
  getEntriesInRange(start: Date, end: Date): SignedAuditEntry[] {
    return this.entries.filter(
      e => e.timestamp >= start && e.timestamp <= end
    );
  }

  /**
   * Get recent entries
   */
  getRecentEntries(count: number = 50): SignedAuditEntry[] {
    return this.entries.slice(-count);
  }

  /**
   * Get audit statistics
   */
  getStats(): {
    totalEntries: number;
    byType: Record<string, number>;
    firstEntry: Date | null;
    lastEntry: Date | null;
  } {
    const byType: Record<string, number> = {};
    for (const entry of this.entries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
    }

    return {
      totalEntries: this.entries.length,
      byType,
      firstEntry: this.entries.length > 0 ? this.entries[0].timestamp : null,
      lastEntry: this.entries.length > 0 ? this.entries[this.entries.length - 1].timestamp : null,
    };
  }

  /**
   * Export entries for backup/transfer
   */
  export(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Import entries (for testing/migration)
   * Note: This will replace existing entries
   */
  import(json: string): void {
    const imported = JSON.parse(json) as SignedAuditEntry[];
    this.entries = imported.map(e => ({
      ...e,
      timestamp: new Date(e.timestamp),
    }));
    this.sequenceCounter = imported.length;
  }
}

// Export singleton instance
export const auditLogger = new SignedAuditLogger();
