# VietVibe System Architecture - Visual Guide

## 📊 Current Architecture vs Improved Architecture

### Current: Sequential API Calls

```
User Browser                    Backend API                Database
┌──────────────┐
│              │
│  Home Page   │                                            ┌──────────┐
│              │──────── 1️⃣ GET /places ────────────────────>│ Places   │
│              │                                            │          │
│              │◄─ Response [places] ──────────────────────┐│ Coll.    │
│              │                                           ││          │
│              │──────── 2️⃣ GET /places/:id/situations ───>│          │
│              │                                           ││ ✗ N+1    │
│              │◄─ Response [situations] ──────────────────┤│ Problem  │
│              │                                           ││          │
│              │──────── 3️⃣ GET /situations/:id/units ────>│ + Slower │
│              │         (x N situations)                 ││ + Higher │
│              │                                           ││ latency  │
│              │◄─ Response [learning units] ──────────────┘└──────────┘
│              │
│              │  Total: ~2-3 seconds
│              │  Calls: 3-5 requests
└──────────────┘  Load: Multiple sequential
```

### Improved: Single Optimized Call

```
User Browser                    Backend API                Database
┌──────────────┐
│              │
│  Home Page   │                                            ┌──────────┐
│              │                                            │ Places   │
│              │──────── 1️⃣ GET /places/full ────────────────>│          │
│              │                                            │ + Join   │
│              │                                            │ Situations
│              │                                            │ + Join   │
│              │                                            │ Learning │
│              │◄─ Complete hierarchy ──────────────────────┤ Units    │
│              │   (Places + Situations + Units)           │          │
│              │                                            │ ✓ Optimized
│              │  Total: ~300-500ms                        │ ✓ Fast   │
│              │  Calls: 1 request                         │ ✓ Single│
└──────────────┘  Load: Parallel aggregation                └──────────┘
```

---

## 🔄 Data Flow Diagram

### Before: Home Screen Data Loading

```
┌─────────────────────────────────────────────────────┐
│             HomePage useEffect()                     │
│  - setIsLoadingData(true)                           │
│  - Fetch /listening/places                          │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────┴─────────┐
        │                  │
        ▼                  ▼
   Places loaded    For each place:
   [100ms]          ┌──────────────────┐
        │           │ Fetch situations │
        │           │ [50ms × N]       │
        │           └────────┬─────────┘
        │                    │
        │           For each situation:
        │           ┌──────────────────┐
        │           │ Fetch units      │
        │           │ [40ms × M]       │
        │           └────────┬─────────┘
        │                    │
        └────────┬───────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ All data loaded │   Total: 2-3s
        │ setSections()   │
        │ Render          │
        └─────────────────┘
```

### After: Optimized Data Loading

```
┌──────────────────────────────────────────┐
│      HomePage useEffect()                 │
│  - setIsLoadingData(true)                │
│  - Fetch /listening/places/full          │
└────────────┬─────────────────────────────┘
             │
    ┌────────▼────────┐
    │ Backend computes │
    │ full hierarchy   │
    │ (aggregation)    │
    └────────┬────────┘
             │
    ┌────────▼────────────────┐
    │ Single response with:     │
    │ - Places [places[]]      │
    │ - Situations in each    │
    │ - Units in each situation│   Total: 300-500ms
    └────────┬────────────────┘
             │
    ┌────────▼────────┐
    │ Frontend maps   │
    │ to sections[]   │
    │ setSections()   │
    │ Render          │
    └────────────────┘
```

---

## 🔍 Search & Filter Architecture

### Search Flow

```
┌───────────────────┐
│   User Input      │
│  "レストラン"      │
└────────┬──────────┘
         │
         ▼
┌───────────────────────────────────┐
│   Frontend: Search Panel          │
│  - Normalize query                │
│  - Apply filters (level, status)  │
│  - Debounce (300ms)              │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Option 1: Frontend Search          │
│  - Client-side search               │
│  - Use: advancedSearch()            │
│  - Speed: < 100ms                   │
│  - Use case: Small datasets         │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Option 2: Backend Search           │
│  - Server-side search               │
│  - API: GET /listening/search       │
│  - Speed: 200-500ms                 │
│  - Use case: Large datasets         │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Result Processing                  │
│  - Sort by relevance score          │
│  - Filter by type (place/situation) │
│  - Pagination (10 per page)         │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Display Results                    │
│  - Show matched places              │
│  - Show matched situations          │
│  - Highlight search term            │
│  - Show relevance score             │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   User Action                        │
│  - Click result → Navigate          │
│  - Save to history → localStorage   │
│  - Add to favorites → localStorage  │
└──────────────────────────────────────┘
```

### Filter Hierarchy

```
SearchPanel
├─ Level Filter (N5, N4, N3, N2, N1)
│  └─ Updates filter.level in state
│
├─ Difficulty Filter (easy, medium, hard)
│  └─ Updates filter.difficulty in state
│
├─ Status Filter
│  ├─ Has Progress checkbox
│  │  └─ Updates filter.hasProgress
│  └─ Completed checkbox
│     └─ Updates filter.completed
│
├─ Sort Options
│  ├─ Relevance (by matchScore)
│  ├─ Newest (by createdAt)
│  └─ Popular (by viewCount)
│
└─ All filters combined:
   {
     query: "restaurant",
     level: "N4",
     difficulty: "easy",
     hasProgress: true,
     sortBy: "relevance"
   }
   
   Send to: advancedSearch(sections, filters)
   Returns: SearchResult[]
```

---

## 📁 Component Tree

### Before

```
App
└─ HomePage
   ├─ Header
   │  ├─ Logo
   │  └─ Profile Button
   ├─ SearchInput
   │  └─ SearchDropdown (if query)
   ├─ ProgressBar
   │  └─ Progress by section
   └─ PlacesList
      └─ for each Place:
         ├─ PlaceHeader
         │  ├─ Icon
         │  ├─ Title (JA + VI)
         │  └─ Expand/Collapse
         └─ if open:
            └─ SituationsList
               └─ for each Situation:
                  ├─ SituationCard
                  │  ├─ Title
                  │  └─ Tasks
                  └─ for each Task:
                     ├─ TaskCheckbox (vocab)
                     └─ TaskCheckbox (listen)
```

### After

```
App
└─ HomePage
   ├─ Header
   │  ├─ Logo
   │  └─ Profile Button
   ├─ SearchPanel (NEW)
   │  ├─ SearchInput
   │  │  ├─ Input Field
   │  │  └─ Clear Button
   │  ├─ FilterToggle Button
   │  ├─ SearchSuggestions (if open & !query)
   │  │  └─ History items
   │  └─ FilterPanel (if open)
   │     ├─ Level Filter
   │     ├─ Difficulty Filter
   │     ├─ Status Filter
   │     ├─ Sort Options
   │     └─ Clear Filters Button
   ├─ SearchResults (if query) (NEW)
   │  └─ for top 10 results:
   │     ├─ ResultType badge
   │     ├─ Title
   │     ├─ Subtitle
   │     └─ Click to navigate
   ├─ FavoritesSection (NEW)
   │  └─ Favorite places/situations
   ├─ ProgressBar
   │  └─ Progress by section
   └─ PlacesList
      └─ (same as before but from optimized API)
```

---

## 🗄️ Database Schema Changes

### Current Schema

```
Place
├─ _id
├─ name_vi
├─ name_ja
├─ description
├─ avatar_url
├─ created_at
└─ updated_at

Situation
├─ _id
├─ place_id (reference to Place)
├─ title_vi
├─ title_ja
├─ description
├─ created_at
└─ updated_at

LearningUnit
├─ _id
├─ situation_id (reference to Situation)
├─ level_id (reference to Level)
├─ title_vi
├─ title_ja
├─ description
├─ audio_url
├─ transcript_url
├─ difficulty      ← NEW FIELD (for filtering)
├─ created_at
└─ updated_at

Level
├─ _id
├─ name (e.g., "N4")
└─ difficulty_score
```

### Indexes to Add

```typescript
// Improve search performance
Place.collection.createIndex({ name_ja: 'text', name_vi: 'text' });
Place.collection.createIndex({ name_vi: 1 });

Situation.collection.createIndex({ place_id: 1 });
Situation.collection.createIndex({ title_ja: 'text', title_vi: 'text' });

LearningUnit.collection.createIndex({ situation_id: 1 });
LearningUnit.collection.createIndex({ level_id: 1 });
LearningUnit.collection.createIndex({ difficulty: 1 });
LearningUnit.collection.createIndex({
  title_ja: 'text',
  title_vi: 'text',
  description: 'text'
});
```

---

## ⚡ Performance Optimization Points

### Frontend Optimizations

```
┌─────────────────────────────────────┐
│      React Component Optimization    │
├─────────────────────────────────────┤
│ ✓ useMemo for search results        │
│ ✓ useCallback for handlers          │
│ ✓ React.memo for list items         │
│ ✓ Lazy loading for images           │
│ ✓ Code splitting with dynamic      │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│      Data Caching Strategy          │
├─────────────────────────────────────┤
│ Browser Cache:                      │
│  - GET requests cached by default   │
│  - Cache headers: max-age=300       │
│                                     │
│ Memory Cache (React Query):         │
│  - staleTime: 5 min                 │
│  - cacheTime: 10 min                │
│                                     │
│ Local Storage:                      │
│  - Search history (10 items)        │
│  - Favorites (unlimited)            │
│  - Progress (auto-sync)             │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│      Network Optimization           │
├─────────────────────────────────────┤
│ ✓ Single API call (vs 3-5)          │
│ ✓ Gzip compression enabled          │
│ ✓ HTTP/2 multiplexing              │
│ ✓ CDN for static assets            │
│ ✓ Debounced search (300ms)         │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│      Expected Metrics               │
├─────────────────────────────────────┤
│ Page Load:     2-3s  → 500ms        │
│ Search:        500ms → 100ms        │
│ TTI:           3-5s  → 1-2s         │
│ FCP:           2s    → 800ms        │
│ LCP:           2.5s  → 1.2s         │
│ CLS:           < 0.1 (same)         │
└─────────────────────────────────────┘
```

---

## 🔐 API Security Layer

```
User Request
     │
     ▼
┌──────────────────────┐
│ Authentication Check │
│ (JWT Token)          │
└────────┬─────────────┘
         │
    ┌────▼─────┐
    │  Valid?   │
    └─┬──────┬──┘
      │ No   │ Yes
      ▼      ▼
    401   ┌─────────────────────┐
    Error │ Authorization Check │
          │ (Roles/Permissions) │
          └────────┬────────────┘
                   │
              ┌────▼─────┐
              │ Allowed?  │
              └─┬──────┬──┘
                │ No   │ Yes
                ▼      ▼
              403   ┌─────────────────────┐
              Error │ Input Validation    │
                    │ (DTOs, Sanitization)│
                    └────────┬────────────┘
                             │
                        ┌────▼─────┐
                        │  Valid?   │
                        └─┬──────┬──┘
                          │ No   │ Yes
                          ▼      ▼
                        400   ┌─────────────────┐
                        Error │ Process Request │
                              │ (Business Logic)│
                              └────────┬────────┘
                                       │
                                  ┌────▼──────┐
                                  │  Success?  │
                                  └─┬──────┬───┘
                                    │ No   │ Yes
                                    ▼      ▼
                                  5xx   200/201
                                  Error Response
```

---

## 📈 Monitoring & Analytics

```
┌─────────────────────────────────────┐
│         Metrics Collection          │
├─────────────────────────────────────┤
│ Frontend:                           │
│  - Page load time (FCP, LCP)       │
│  - Search response time             │
│  - User interactions                │
│  - Error tracking                   │
│                                     │
│ Backend:                            │
│  - API response time                │
│  - Database query time              │
│  - Error rate                       │
│  - Request volume                   │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│       Analytics Dashboard           │
├─────────────────────────────────────┤
│ Real-time Monitoring:               │
│  - API health (Green/Yellow/Red)    │
│  - Error trends                     │
│  - Performance metrics              │
│                                     │
│ User Analytics:                     │
│  - Search trends                    │
│  - Popular places/situations        │
│  - User engagement                  │
└─────────────────────────────────────┘
```

---

## 🎯 Success Criteria Checklist

```
Performance Targets:
✓ API response time < 500ms (from 2-3s)
✓ Search latency < 100ms (from 500ms)
✓ Bundle size < 50KB increase
✓ Lighthouse score > 85

Functionality:
✓ All current features working
✓ Search with 5+ filter options
✓ Error states properly handled
✓ Favorites system working
✓ Search history persisted

Code Quality:
✓ TypeScript strict mode
✓ 80%+ test coverage
✓ ESLint 0 errors
✓ No console warnings
✓ Mobile responsive

User Experience:
✓ Results within 100ms
✓ No layout shifts (CLS < 0.1)
✓ Mobile usability > 95
✓ Accessibility WCAG AA
```

