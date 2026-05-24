/**
 * Enhanced Search Panel Component
 * Shows search input with filters, suggestions, and results
 */

'use client';

import { useState } from 'react';
import { SearchFilters } from '@/lib/search.service';

interface SearchPanelProps {
  query: string;
  onQueryChange: (query: string) => void;
  filters: SearchFilters;
  onFiltersChange: (filters: Partial<SearchFilters>) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  history?: string[];
  onHistoryItemClick?: (query: string) => void;
  onClearHistory?: () => void;
}

// Level options for filtering
const LEVEL_OPTIONS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Phù hợp nhất' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'popular', label: 'Phổ biến' },
];

// SVG Icons
const SearchIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

export function SearchPanel({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  isOpen,
  onOpenChange,
  history = [],
  onHistoryItemClick,
  onClearHistory,
}: SearchPanelProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    filters.level ||
    filters.difficulty ||
    filters.hasProgress ||
    filters.completed ||
    (filters.placeIds && filters.placeIds.length > 0);

  return (
    <div className="relative z-30 vv-rise-in vv-delay-1 w-full">
      <div className="flex gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-(--vv-muted)" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => onOpenChange(true)}
            placeholder="場所や状況を検索..."
            className="h-12 w-full rounded-2xl border border-transparent bg-white/90 pl-12 pr-12 text-sm text-foreground shadow-sm ring-1 ring-(--vv-ring) transition focus:border-(--vv-accent) focus:outline-none"
          />
          {query && (
            <button
              onClick={() => onQueryChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-(--vv-muted) hover:text-(--vv-accent) transition"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center justify-center h-12 px-3 rounded-2xl transition ${
            hasActiveFilters
              ? 'bg-(--vv-accent) text-white'
              : 'bg-white/90 text-(--vv-muted) ring-1 ring-(--vv-ring) hover:bg-(--vv-accent-soft)'
          }`}
          title="Toggle filters"
        >
          <FilterIcon className="h-5 w-5" />
          {hasActiveFilters && <span className="ml-2 text-xs font-semibold">Active</span>}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-white p-4 shadow-[0_18px_28px_rgba(0,0,0,0.12)] ring-1 ring-(--vv-ring) z-50">
          <div className="grid grid-cols-2 gap-4">
            {/* Level Filter */}
            <div>
              <label className="block text-xs font-semibold text-(--vv-muted) mb-2">
                Cấp độ
              </label>
              <div className="flex flex-wrap gap-2">
                {LEVEL_OPTIONS.map((level) => (
                  <button
                    key={level}
                    onClick={() =>
                      onFiltersChange({
                        level: filters.level === level ? undefined : level,
                      })
                    }
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      filters.level === level
                        ? 'bg-(--vv-accent) text-white'
                        : 'bg-(--vv-border) text-(--vv-muted) hover:bg-(--vv-accent-soft)'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-xs font-semibold text-(--vv-muted) mb-2">
                Độ khó
              </label>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY_OPTIONS.map((difficulty) => (
                  <button
                    key={difficulty}
                    onClick={() =>
                      onFiltersChange({
                        difficulty: filters.difficulty === difficulty ? undefined : difficulty,
                      })
                    }
                    className={`px-3 py-1 rounded-full text-xs font-medium transition capitalize ${
                      filters.difficulty === difficulty
                        ? 'bg-(--vv-accent) text-white'
                        : 'bg-(--vv-border) text-(--vv-muted) hover:bg-(--vv-accent-soft)'
                    }`}
                  >
                    {difficulty === 'easy' ? 'Dễ' : difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Option */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-(--vv-muted) mb-2">
                Sắp xếp theo
              </label>
              <div className="flex gap-2">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onFiltersChange({ sortBy: option.value as any })}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      filters.sortBy === option.value
                        ? 'bg-(--vv-accent) text-white'
                        : 'bg-(--vv-border) text-(--vv-muted) hover:bg-(--vv-accent-soft)'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress/Completion Filters */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-(--vv-muted) mb-2">
                Trạng thái
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.hasProgress || false}
                    onChange={(e) => onFiltersChange({ hasProgress: e.target.checked })}
                    className="rounded"
                  />
                  <span>Đang học</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.completed || false}
                    onChange={(e) => onFiltersChange({ completed: e.target.checked })}
                    className="rounded"
                  />
                  <span>Hoàn thành</span>
                </label>
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => onFiltersChange({})}
              className="mt-4 w-full rounded-lg bg-(--vv-border) py-2 text-xs font-semibold text-(--vv-muted) hover:bg-(--vv-accent-soft) transition"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* Search Suggestions / History */}
      {isOpen && !query && history.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl bg-white p-3 shadow-[0_18px_28px_rgba(0,0,0,0.12)] ring-1 ring-(--vv-ring)">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-(--vv-muted)">Lịch sử tìm kiếm</p>
            {onClearHistory && (
              <button
                onClick={onClearHistory}
                className="text-xs text-(--vv-muted) hover:text-(--vv-accent) transition"
              >
                Xóa
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((item) => (
              <button
                key={item}
                onClick={() => onHistoryItemClick?.(item)}
                className="rounded-full bg-(--vv-border) px-3 py-1 text-xs font-medium text-(--vv-muted) hover:bg-(--vv-accent-soft) transition"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
