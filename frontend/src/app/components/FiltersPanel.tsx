import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FiltersPanelProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  categories: string[];
  status: string[];
  priceRange: [number, number];
  sortBy: string;
}

const categories = ['All', 'Watches', 'Art', 'Books', 'Musical Instruments', 'Fashion', 'Collectibles'];
const statusOptions = ['Live', 'Ending Soon', 'Reserve Met', 'Trending'];
const sortOptions = ['Ending Soon', 'Newest', 'Price: Low to High', 'Price: High to Low', 'Most Bids'];

export function FiltersPanel({ onFilterChange }: FiltersPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    categories: ['All'],
    status: [],
    priceRange: [0, 200000],
    sortBy: 'Ending Soon',
  });

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  const toggleCategory = (category: string) => {
    if (category === 'All') {
      updateFilters({ categories: ['All'] });
    } else {
      const newCategories = filters.categories.includes(category)
        ? filters.categories.filter(c => c !== category && c !== 'All')
        : [...filters.categories.filter(c => c !== 'All'), category];
      
      updateFilters({ 
        categories: newCategories.length === 0 ? ['All'] : newCategories 
      });
    }
  };

  const toggleStatus = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    updateFilters({ status: newStatus });
  };

  const activeFiltersCount = 
    (filters.categories.includes('All') ? 0 : filters.categories.length) +
    filters.status.length +
    (filters.sortBy !== 'Ending Soon' ? 1 : 0);

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm">Filters</span>
        {activeFiltersCount > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* Filters Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-12 left-0 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Filters</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Categories */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => toggleCategory(category)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                          filters.categories.includes(category)
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map(status => (
                      <button
                        key={status}
                        onClick={() => toggleStatus(status)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                          filters.status.includes(status)
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort By */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Sort By</h4>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilters({ sortBy: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                  >
                    {sortOptions.map(option => (
                      <option key={option} value={option} className="bg-slate-900">
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Price Range</h4>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="200000"
                      step="1000"
                      value={filters.priceRange[1]}
                      onChange={(e) => updateFilters({ 
                        priceRange: [0, Number(e.target.value)] 
                      })}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">$0</span>
                      <span className="text-white font-medium">
                        ${filters.priceRange[1].toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Clear Filters */}
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      const defaultFilters = {
                        categories: ['All'],
                        status: [],
                        priceRange: [0, 200000] as [number, number],
                        sortBy: 'Ending Soon',
                      };
                      setFilters(defaultFilters);
                      onFilterChange(defaultFilters);
                    }}
                    className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-all"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
