/**
 * AdminPanel - Admin Dashboard Page
 *
 * Central admin interface for:
 * - Fraud alert queue management
 * - Rule configuration
 * - User management
 * - Audit log viewing
 * - System statistics
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  AlertTriangle,
  Users,
  Gavel,
  Activity,
  Settings,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Ban,
  RefreshCw,
  ChevronRight,
  Filter,
  Download,
} from 'lucide-react';
import { FraudAlertBanner } from '../components/FraudAlertBanner';
import { TrustScoreBadge } from '../components/TrustScoreBadge';
import type { FraudAlert, RiskLevel } from '../dsa/FraudDetector';
import type { AppliedRule } from '../dsa/AdaptiveRuleEngine';
import type { SignedAuditEntry } from '../dsa/SignedAuditLogger';

// Mock data for demo
const mockAlerts: FraudAlert[] = [
  {
    id: 'alert-1',
    auctionId: 'auction-123',
    bidderId: 'user-456',
    bidId: 'bid-789',
    riskScore: 0.85,
    riskLevel: 'CRITICAL',
    signals: {
      bidVelocityAnomaly: 0.7,
      networkAnomaly: 0.9,
      accountTrustScore: 0.6,
      pricePatternAnomaly: 0.4,
    },
    actionTaken: 'BLOCK_AND_REVIEW',
    detectedAt: new Date(Date.now() - 5 * 60 * 1000),
    resolved: false,
  },
  {
    id: 'alert-2',
    auctionId: 'auction-456',
    bidderId: 'user-789',
    bidId: 'bid-012',
    riskScore: 0.65,
    riskLevel: 'HIGH',
    signals: {
      bidVelocityAnomaly: 0.5,
      timingAnomaly: 0.8,
      accountTrustScore: 0.3,
    },
    actionTaken: 'APPLY_ADAPTIVE_RULES',
    detectedAt: new Date(Date.now() - 15 * 60 * 1000),
    resolved: false,
  },
];

const mockRules: Array<{
  id: string;
  name: string;
  enabled: boolean;
  applications: number;
  lastApplied?: Date;
}> = [
  { id: 'anti-snipe', name: 'Anti-Snipe Extension', enabled: true, applications: 45, lastApplied: new Date() },
  { id: 'min-bid-increase', name: 'Min Bid Increase', enabled: true, applications: 12 },
  { id: 'extra-verification', name: 'Extra Verification', enabled: true, applications: 8 },
  { id: 'rate-limit', name: 'Bid Rate Limiting', enabled: true, applications: 23 },
  { id: 'auto-block', name: 'Auto-Block Users', enabled: false, applications: 3 },
];

const mockStats = {
  totalAuctions: 1234,
  activeAuctions: 89,
  totalBids: 45678,
  totalUsers: 12345,
  fraudAlertsToday: 15,
  resolvedToday: 12,
  blockedUsers: 23,
  avgFraudScore: 0.32,
};

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'rules' | 'users' | 'audit'>('overview');
  const [alerts, setAlerts] = useState<FraudAlert[]>(mockAlerts);
  const [rules, setRules] = useState(mockRules);
  const [stats, setStats] = useState(mockStats);

  const handleResolveAlert = (alertId: string, action: 'approve' | 'block' | 'void') => {
    setAlerts(prev => prev.map(a =>
      a.id === alertId ? { ...a, resolved: true, resolvedBy: 'Admin' } : a
    ));
  };

  const handleToggleRule = (ruleId: string) => {
    setRules(prev => prev.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Activity },
    { id: 'alerts' as const, label: 'Fraud Alerts', icon: AlertTriangle, badge: alerts.filter(a => !a.resolved).length },
    { id: 'rules' as const, label: 'Rule Engine', icon: Settings },
    { id: 'users' as const, label: 'Users', icon: Users },
    { id: 'audit' as const, label: 'Audit Log', icon: FileText },
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-16 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600">
                <Shield className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                System Healthy
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge && tab.badge > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500 rounded-full text-xs text-white">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab stats={stats} alerts={alerts} />}
        {activeTab === 'alerts' && (
          <AlertsTab alerts={alerts} onResolve={handleResolveAlert} />
        )}
        {activeTab === 'rules' && (
          <RulesTab rules={rules} onToggle={handleToggleRule} />
        )}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ stats, alerts }: { stats: typeof mockStats; alerts: FraudAlert[] }) {
  const statCards = [
    { label: 'Total Auctions', value: stats.totalAuctions.toLocaleString(), icon: Gavel, color: 'purple' },
    { label: 'Active Auctions', value: stats.activeAuctions.toString(), icon: Activity, color: 'green' },
    { label: 'Total Bids', value: stats.totalBids.toLocaleString(), icon: TrendingUp, color: 'blue' },
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'pink' },
    { label: 'Fraud Alerts Today', value: stats.fraudAlertsToday.toString(), icon: AlertTriangle, color: 'yellow' },
    { label: 'Resolved Today', value: stats.resolvedToday.toString(), icon: CheckCircle, color: 'emerald' },
    { label: 'Blocked Users', value: stats.blockedUsers.toString(), icon: Ban, color: 'red' },
    { label: 'Avg Fraud Score', value: `${(stats.avgFraudScore * 100).toFixed(0)}%`, icon: Shield, color: 'orange' },
  ];

  const colorClasses: Record<string, string> = {
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/30',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    red: 'from-red-500/20 to-red-500/5 border-red-500/30',
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30',
  };

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-xl bg-gradient-to-br ${colorClasses[stat.color]} border`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Alerts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Fraud Alerts</h2>
          <button className="text-sm text-purple-400 hover:text-purple-300">
            View All <ChevronRight className="w-4 h-4 inline" />
          </button>
        </div>
        <FraudAlertBanner alerts={alerts.slice(0, 3)} isAdmin />
      </div>
    </div>
  );
}

// Alerts Tab
function AlertsTab({
  alerts,
  onResolve,
}: {
  alerts: FraudAlert[];
  onResolve: (id: string, action: 'approve' | 'block' | 'void') => void;
}) {
  const [filter, setFilter] = useState<RiskLevel | 'all'>('all');

  const filteredAlerts = filter === 'all'
    ? alerts
    : alerts.filter(a => a.riskLevel === filter);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filter:</span>
        </div>
        {(['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(level => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filter === level
                ? 'bg-purple-500 text-white'
                : 'bg-slate-700 text-gray-400 hover:text-white'
            }`}
          >
            {level === 'all' ? 'All' : level}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <FraudAlertBanner
        alerts={filteredAlerts}
        onResolve={onResolve}
        isAdmin
      />

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
          <p>No alerts matching your filter</p>
        </div>
      )}
    </div>
  );
}

// Rules Tab
function RulesTab({
  rules,
  onToggle,
}: {
  rules: typeof mockRules;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Adaptive Rule Engine</h2>
        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm transition-colors">
          + Add Custom Rule
        </button>
      </div>

      {rules.map((rule, index) => (
        <motion.div
          key={rule.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="p-4 bg-slate-800/50 rounded-xl border border-white/10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => onToggle(rule.id)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  rule.enabled ? 'bg-purple-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    rule.enabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
              <div>
                <p className="font-medium">{rule.name}</p>
                <p className="text-sm text-gray-400">ID: {rule.id}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm">
                <span className="text-purple-400 font-medium">{rule.applications}</span>
                <span className="text-gray-400"> applications</span>
              </p>
              {rule.lastApplied && (
                <p className="text-xs text-gray-500">
                  Last: {rule.lastApplied.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Users Tab (Placeholder)
function UsersTab() {
  return (
    <div className="text-center py-12 text-gray-400">
      <Users className="w-12 h-12 mx-auto mb-4" />
      <p>User management interface coming soon</p>
    </div>
  );
}

// Audit Tab (Placeholder)
function AuditTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">HMAC-Signed Audit Log</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Verify Chain
          </button>
          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="font-medium text-emerald-400">Chain Integrity Verified</p>
            <p className="text-sm text-gray-400">All 1,234 log entries have valid signatures</p>
          </div>
        </div>
      </div>

      <div className="text-center py-8 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-4" />
        <p>Full audit log viewer coming soon</p>
      </div>
    </div>
  );
}
