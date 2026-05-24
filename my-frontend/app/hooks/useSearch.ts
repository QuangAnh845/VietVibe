/**
 * Custom hooks for managing searches, filters, and favorites
 */

import { useState, useCallback, useEffect } from 'react';
import { SearchFilters, searchHistoryService, favoritesService } from '@/lib/search.service';

/**
 * Hook for managing search functionality
 */
export const useSearch = (initialQuery: string = '') => {
  const [query, setQuery] = useState(initialQuery);
  const [history, setHistory] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load history on mount
  useEffect(() => {
    setHistory(searchHistoryService.get());
  }, []);

  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.trim()) {
      searchHistoryService.add(searchQuery);
      setHistory(searchHistoryService.get());
    }
  }, []);

  const clearHistory = useCallback(() => {
    searchHistoryService.clear();
    setHistory([]);
  }, []);

  const clearQuery = useCallback(() => {
    setQuery('');
    setIsOpen(false);
  }, []);

  return {
    query,
    setQuery: handleSearch,
    clearQuery,
    history,
    clearHistory,
    isOpen,
    setIsOpen,
  };
};

/**
 * Hook for managing search filters
 */
export const useSearchFilters = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    sortBy: 'relevance',
  });

  const updateFilter = useCallback(
    (key: keyof SearchFilters, value: any) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      query: '',
      sortBy: 'relevance',
    });
  }, []);

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
  };
};

/**
 * Hook for managing favorites
 */
export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites on mount
  useEffect(() => {
    setFavorites(favoritesService.get());
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    if (favoritesService.isFavorite(id)) {
      favoritesService.remove(id);
    } else {
      favoritesService.add(id);
    }
    setFavorites(favoritesService.get());
  }, []);

  const addFavorite = useCallback((id: string) => {
    favoritesService.add(id);
    setFavorites(favoritesService.get());
  }, []);

  const removeFavorite = useCallback((id: string) => {
    favoritesService.remove(id);
    setFavorites(favoritesService.get());
  }, []);

  const isFavorite = useCallback((id: string) => {
    return favoritesService.isFavorite(id);
  }, []);

  return {
    favorites,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    isFavorite,
  };
};
