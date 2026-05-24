/**
 * Enhanced Search & Filter Service
 * Handles advanced search with multiple filters
 */

export interface SearchFilters {
  query: string;
  level?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  hasProgress?: boolean;
  completed?: boolean;
  placeIds?: string[];
  sortBy?: 'relevance' | 'newest' | 'popular';
}

export interface SearchResult {
  type: 'place' | 'situation' | 'learning_unit';
  id: string;
  title: string;
  subtitle?: string;
  placeId?: string;
  situationId?: string;
  level?: string;
  progress?: number;
  completed?: boolean;
  matchScore: number; // 0-100, dùng cho relevance sorting
}

/**
 * Normalize text cho search (case-insensitive, trim whitespace)
 */
export const normalizeText = (value: string): string => {
  return value.trim().toLowerCase();
};

/**
 * Tính điểm match giữa query và source text
 * Dùng cho relevance sorting
 */
export const calculateMatchScore = (source: string, query: string): number => {
  const normalized = normalizeText(source);
  const normalizedQuery = normalizeText(query);

  // Exact match: 100 points
  if (normalized === normalizedQuery) return 100;

  // Starts with: 80 points
  if (normalized.startsWith(normalizedQuery)) return 80;

  // Contains: 60 points
  if (normalized.includes(normalizedQuery)) return 60;

  // Partial match (word boundaries): 40 points
  const words = normalizedQuery.split(/\s+/);
  const matchCount = words.filter((word) => normalized.includes(word)).length;
  if (matchCount > 0) {
    return 40 * (matchCount / words.length);
  }

  return 0;
};

/**
 * Advanced search function
 * Tìm kiếm qua places, situations, learning units với filters
 */
export const advancedSearch = (
  data: any[],
  filters: SearchFilters,
): SearchResult[] => {
  const { query, level, difficulty, hasProgress, completed, placeIds, sortBy = 'relevance' } = filters;
  
  const results: SearchResult[] = [];
  const normalizedQuery = normalizeText(query);

  // Đi qua tất cả places
  data.forEach((place) => {
    // Kiểm tra filter placeIds
    if (placeIds && placeIds.length > 0 && !placeIds.includes(place.id)) {
      return;
    }

    // Check place match
    const placeMatch = calculateMatchScore(place.label || place.nameJa, normalizedQuery);

    if (placeMatch > 0) {
      results.push({
        type: 'place',
        id: place.id,
        title: place.label || place.nameJa,
        subtitle: place.subtitle || place.nameVi,
        matchScore: placeMatch,
      });
    }

    // Đi qua situations của place
    place.situations?.forEach((situation: any) => {
      const situationMatch = calculateMatchScore(situation.title, normalizedQuery);

      if (situationMatch > 0) {
        // Kiểm tra level filter
        if (level && situation.level !== level) return;

        // Kiểm tra difficulty filter
        if (difficulty && situation.difficulty !== difficulty) return;

        // Kiểm tra progress filters
        if (hasProgress && !situation.progress) return;
        if (completed && !situation.completed) return;

        results.push({
          type: 'situation',
          id: situation.id,
          placeId: place.id,
          title: situation.title,
          subtitle: situation.subtitle,
          level: situation.level,
          progress: situation.progress,
          completed: situation.completed,
          matchScore: situationMatch,
        });
      }

      // Đi qua learning units của situation
      situation.tasks?.forEach((task: any) => {
        const taskMatch = calculateMatchScore(task.title, normalizedQuery);

        if (taskMatch > 0) {
          // Kiểm tra filters
          if (level && task.level !== level) return;
          if (difficulty && task.difficulty !== difficulty) return;
          if (hasProgress && !task.progress) return;
          if (completed && !task.completed) return;

          results.push({
            type: 'learning_unit',
            id: task.id,
            placeId: place.id,
            situationId: situation.id,
            title: task.title,
            subtitle: situation.title,
            level: task.level,
            progress: task.progress,
            completed: task.completed,
            matchScore: taskMatch,
          });
        }
      });
    });
  });

  // Sort results
  switch (sortBy) {
    case 'relevance':
      results.sort((a, b) => b.matchScore - a.matchScore);
      break;
    case 'newest':
      results.sort((a, b) => (b.createdAt as any) - (a.createdAt as any));
      break;
    case 'popular':
      results.sort((a, b) => (b.viewCount as any) - (a.viewCount as any));
      break;
  }

  return results;
};

/**
 * Search history management
 */
export const searchHistoryService = {
  get: (): string[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('vv-search-history');
    return stored ? JSON.parse(stored) : [];
  },

  add: (query: string) => {
    if (typeof window === 'undefined') return;
    const history = searchHistoryService.get();
    const filtered = history.filter((item) => item !== query);
    const updated = [query, ...filtered].slice(0, 10); // Keep last 10
    localStorage.setItem('vv-search-history', JSON.stringify(updated));
  },

  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('vv-search-history');
  },
};

/**
 * Favorites management
 */
export const favoritesService = {
  get: (): string[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('vv-favorites');
    return stored ? JSON.parse(stored) : [];
  },

  add: (id: string) => {
    if (typeof window === 'undefined') return;
    const favorites = favoritesService.get();
    if (!favorites.includes(id)) {
      favorites.push(id);
      localStorage.setItem('vv-favorites', JSON.stringify(favorites));
    }
  },

  remove: (id: string) => {
    if (typeof window === 'undefined') return;
    const favorites = favoritesService.get();
    const updated = favorites.filter((item) => item !== id);
    localStorage.setItem('vv-favorites', JSON.stringify(updated));
  },

  isFavorite: (id: string): boolean => {
    return favoritesService.get().includes(id);
  },
};
