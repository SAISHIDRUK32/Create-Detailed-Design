/**
 * HeapVisualizer Component
 *
 * An educational component that visualizes the Max-Heap data structure
 * used for bid management. Shows:
 * - Tree visualization of the heap
 * - Array representation
 * - Operation log (inserts, swaps, heapify operations)
 * - Statistics about the heap
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  Binary,
  ListOrdered,
  Activity,
  BarChart3,
  Info,
  Trash2,
} from 'lucide-react';

interface HeapVisualizerProps {
  heapArray: Array<{ value: number; bidderName: string }>;
  treeVisualization: string;
  operationLog: string[];
  stats: {
    totalBids: number;
    heapHeight: number;
    priceIncrease: number;
    priceIncreasePercent: number;
    averageBidIncrement: number;
  };
  onClearLog?: () => void;
}

export function HeapVisualizer({
  heapArray,
  treeVisualization,
  operationLog,
  stats,
  onClearLog,
}: HeapVisualizerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'tree' | 'array' | 'log' | 'stats'>('tree');

  const tabs = [
    { id: 'tree' as const, label: 'Tree View', icon: Binary },
    { id: 'array' as const, label: 'Array', icon: ListOrdered },
    { id: 'log' as const, label: 'Operations', icon: Activity },
    { id: 'stats' as const, label: 'Stats', icon: BarChart3 },
  ];

  return (
    <div className="backdrop-blur-xl bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
            <Binary className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold">Max-Heap Visualizer</h3>
            <p className="text-sm text-gray-400">
              DSA: {heapArray.length} nodes, height {stats.heapHeight}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
            O(log n) insert
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Tab Navigation */}
            <div className="flex border-b border-white/10">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-all ${
                      activeTab === tab.id
                        ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="p-4 min-h-[300px] max-h-[400px] overflow-auto">
              {activeTab === 'tree' && (
                <TreeView heapArray={heapArray} />
              )}

              {activeTab === 'array' && (
                <ArrayView heapArray={heapArray} />
              )}

              {activeTab === 'log' && (
                <LogView operationLog={operationLog} onClear={onClearLog} />
              )}

              {activeTab === 'stats' && (
                <StatsView stats={stats} heapArray={heapArray} />
              )}
            </div>

            {/* DSA Info Footer */}
            <div className="px-4 py-3 bg-purple-500/5 border-t border-white/10">
              <div className="flex items-start gap-2 text-sm text-gray-400">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  <span className="text-purple-400 font-medium">Max-Heap Property:</span>{' '}
                  Parent nodes are always greater than or equal to their children.
                  The root always contains the maximum value (highest bid).
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Tree Visualization
 */
function TreeView({ heapArray }: { heapArray: Array<{ value: number; bidderName: string }> }) {
  if (heapArray.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No bids yet. Place a bid to see the heap!
      </div>
    );
  }

  const height = Math.floor(Math.log2(heapArray.length)) + 1;

  return (
    <div className="space-y-4">
      {/* Visual Tree */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[600px]">
          {Array.from({ length: height }).map((_, level) => {
            const levelStart = Math.pow(2, level) - 1;
            const levelSize = Math.pow(2, level);
            const nodesInLevel = Math.min(
              levelSize,
              heapArray.length - levelStart
            );

            return (
              <div key={level} className="flex justify-center mb-4">
                {Array.from({ length: nodesInLevel }).map((_, i) => {
                  const nodeIndex = levelStart + i;
                  const node = heapArray[nodeIndex];
                  const isRoot = nodeIndex === 0;

                  return (
                    <motion.div
                      key={nodeIndex}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: nodeIndex * 0.05 }}
                      className="flex flex-col items-center mx-2"
                      style={{
                        width: `${100 / levelSize}%`,
                        maxWidth: '120px',
                      }}
                    >
                      {/* Connection lines */}
                      {level > 0 && (
                        <div className="w-px h-4 bg-gradient-to-b from-purple-500/50 to-transparent" />
                      )}

                      {/* Node */}
                      <div
                        className={`
                          relative px-3 py-2 rounded-lg text-center transition-all
                          ${isRoot
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 ring-2 ring-purple-400/50'
                            : 'bg-slate-700 border border-white/10'
                          }
                        `}
                      >
                        <div className="font-bold text-sm">
                          ${node.value.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400 truncate max-w-[80px]">
                          {node.bidderName.split(' ')[0]}
                        </div>
                        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-600 text-xs flex items-center justify-center border border-white/10">
                          {nodeIndex}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-gray-400 pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-600 to-pink-600" />
          <span>Root (Max)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-700 border border-white/10" />
          <span>Child nodes</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Array Representation
 */
function ArrayView({ heapArray }: { heapArray: Array<{ value: number; bidderName: string }> }) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400 mb-3">
        Heap stored as array (index-based parent/child relationships)
      </div>

      {/* Array visualization */}
      <div className="flex flex-wrap gap-2">
        {heapArray.map((node, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.03 }}
            className={`
              relative p-3 rounded-lg text-center min-w-[80px]
              ${index === 0
                ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                : 'bg-slate-700 border border-white/10'
              }
            `}
          >
            <div className="text-xs text-gray-400 mb-1">idx: {index}</div>
            <div className="font-bold">${node.value.toLocaleString()}</div>
            <div className="text-xs text-gray-400 truncate">{node.bidderName.split(' ')[0]}</div>
          </motion.div>
        ))}
      </div>

      {/* Index calculations */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-sm">
        <div className="p-3 bg-slate-700/50 rounded-lg">
          <div className="text-gray-400 mb-1">Parent Index</div>
          <code className="text-purple-300">floor((i - 1) / 2)</code>
        </div>
        <div className="p-3 bg-slate-700/50 rounded-lg">
          <div className="text-gray-400 mb-1">Left Child</div>
          <code className="text-purple-300">2 * i + 1</code>
        </div>
        <div className="p-3 bg-slate-700/50 rounded-lg">
          <div className="text-gray-400 mb-1">Right Child</div>
          <code className="text-purple-300">2 * i + 2</code>
        </div>
      </div>
    </div>
  );
}

/**
 * Operation Log
 */
function LogView({
  operationLog,
  onClear,
}: {
  operationLog: string[];
  onClear?: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Recent heap operations ({operationLog.length})
        </div>
        {onClear && operationLog.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-slate-700 rounded transition-all"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <div className="space-y-1 font-mono text-sm">
        {operationLog.length === 0 ? (
          <div className="text-gray-500 italic">No operations recorded yet</div>
        ) : (
          operationLog.slice(-20).map((log, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`
                px-3 py-2 rounded-lg
                ${log.includes('Insert') ? 'bg-emerald-500/10 text-emerald-300' :
                  log.includes('Swap') ? 'bg-yellow-500/10 text-yellow-300' :
                  log.includes('Extract') ? 'bg-red-500/10 text-red-300' :
                  'bg-slate-700/50 text-gray-300'
                }
              `}
            >
              <span className="text-gray-500 mr-2">{operationLog.length - 20 + index + 1}.</span>
              {log}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Statistics View
 */
function StatsView({
  stats,
  heapArray,
}: {
  stats: {
    totalBids: number;
    heapHeight: number;
    priceIncrease: number;
    priceIncreasePercent: number;
    averageBidIncrement: number;
  };
  heapArray: Array<{ value: number; bidderName: string }>;
}) {
  const statItems = [
    {
      label: 'Total Bids',
      value: stats.totalBids.toString(),
      description: 'Number of bids in heap',
    },
    {
      label: 'Heap Height',
      value: stats.heapHeight.toString(),
      description: 'log\u2082(n) + 1 levels',
    },
    {
      label: 'Price Increase',
      value: `$${stats.priceIncrease.toLocaleString()}`,
      description: `+${stats.priceIncreasePercent.toFixed(1)}% from start`,
    },
    {
      label: 'Avg Increment',
      value: `$${Math.round(stats.averageBidIncrement).toLocaleString()}`,
      description: 'Average bid jump',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 bg-slate-700/50 rounded-lg"
          >
            <div className="text-2xl font-bold text-purple-400">{stat.value}</div>
            <div className="text-sm font-medium">{stat.label}</div>
            <div className="text-xs text-gray-400">{stat.description}</div>
          </motion.div>
        ))}
      </div>

      {/* Time Complexity Info */}
      <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
        <h4 className="font-semibold mb-3">Time Complexity Analysis</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Get Highest Bid</span>
            <code className="text-emerald-400">O(1)</code>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Insert New Bid</span>
            <code className="text-yellow-400">O(log n)</code>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Extract Max</span>
            <code className="text-yellow-400">O(log n)</code>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Build Heap</span>
            <code className="text-blue-400">O(n)</code>
          </div>
        </div>
      </div>

      {/* Space Complexity */}
      <div className="text-sm text-gray-400">
        <span className="font-medium text-white">Space Complexity:</span> O(n) - Linear array storage
      </div>
    </div>
  );
}
