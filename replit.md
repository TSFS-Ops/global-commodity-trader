# Cannabis Trading Marketplace - Izenzo

## Overview
Izenzo is a full-stack cannabis trading marketplace connecting buyers and sellers in the South African cannabis industry. The platform focuses on hemp, cannabis extracts, carbon credits, and related agricultural products. Key capabilities include product listings, order management, secure messaging, geographic mapping, and blockchain verification. The project aims to provide a robust, secure, and transparent trading environment for the cannabis sector, supporting authentic trading data and enterprise-grade infrastructure for future growth and machine learning enhancements.

**Recent Changes (August 18, 2025):**
- **Signals Feature Implementation:** Successfully implemented comprehensive signals system with safety measures
  - **Feature Flag Architecture:** ENABLE_SIGNALS environment variable (default OFF) controls signals availability
  - **Safety Backup:** Created timestamped backup before implementation (backup/signalsv2-20250818_104627)
  - **Signals API:** Complete REST endpoints for ingestion, search, and event logging (/api/signals/*, /api/events/*)
  - **Storage System:** Atomic JSON file storage (data/signals.json) with safe read/write operations
  - **Unified Search:** InternalSignals connector integrates with existing crawler service architecture
  - **Client Updates:** HashRouter implementation with Listings/Signals toggle checkboxes on SearchPage
  - **ES Module Migration:** Converted all connector and service files to ES modules for compatibility
  - **Cannabis/Hemp Security:** Maintained strict commodity filtering throughout signals implementation
- **Previous Changes (August 17, 2025):**
  - **Simplified search interface:** Removed social impact fields from SearchPage for cleaner user experience
    - Removed Social Impact Category input field
    - Removed Min Social Impact Score filtering
    - Removed social impact weighting from search requests
    - Removed social impact display from search results
    - Maintained core search functionality: keyword, commodity, region, price range
- Successfully removed all Excel imported phantom data (5,040 listings) from database
- Eliminated React Query caching to ensure real-time data display  
- Configured aggressive cache-busting for dashboard statistics
- Platform now displays clean zero state ready for authentic data testing
- All user login credentials properly configured with secure password hashing
- Comprehensive phantom data elimination completed:
  - 3 mock connector files backed up and removed
  - 5 Excel import scripts backed up and disabled 
  - Mock order seeding functions permanently disabled
  - Database listings table cleared with backup created
  - All seed invocation routes commented out or removed
- Migrated from wouter to React Router for improved client-side routing
- Enhanced search functionality integrated with advanced filtering:
  - POST /api/search endpoint with social impact scoring and multi-criteria filtering
  - Price range filtering (priceMin, priceMax)
  - Social impact score filtering with customizable weights
  - Commodity type and region filtering capabilities
  - Maintained backward compatibility with GET /api/search endpoint
  - Fixed p-limit dependency conflicts for stable operation
- **SECURITY: Locked down search to cannabis/hemp only (August 17, 2025):**
  - Removed crawler service fallback to "all connectors" behavior
  - Implemented hard commodity filtering: only cannabis, hemp, CBD, THC listings allowed
  - SearchPage now uses internal database exclusively for authentic data only
  - Matching service filtered to cannabis/hemp categories only
  - Cache cleared to prevent stale non-cannabis results
  - All search endpoints require explicit cannabis/hemp commodity types
  - **Server-side allow-list implemented:** Set(['cannabis', 'hemp', 'cbd', 'thc']) with default restriction
  - Case-insensitive commodity matching with multi-layer security validation
  - Comprehensive testing confirms: prohibited commodities (carbon, steel) return 0 results
  - Enhanced logging for search operations and commodity validation
  - **No-cache option added:** SearchPage uses `noCache: true` to ensure fresh data retrieval
  - UI forces internal DB connector with visual confirmation of authentic data source
  - **Multi-layer commodity filtering implemented (August 17, 2025):**
    - Storage layer: Cannabis/hemp SQL filtering in getListings() method with LIKE queries
    - Connector layer: Hard-coded allow-list Set(['cannabis', 'hemp', 'cbd', 'thc']) with JS filtering
    - Internal connector: Excludes null/blank commodity rows for data integrity
    - Complete elimination of non-cannabis data at all query levels

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript, functional components, hooks.
- **Build**: Vite.
- **Routing**: Wouter.
- **State Management**: React Query.
- **UI**: Shadcn/ui (Radix UI), Tailwind CSS with custom design tokens.
- **Forms**: React Hook Form with Zod validation.
- **Mapping**: Leaflet for interactive maps.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript (ES modules).
- **Authentication**: Passport.js (local strategy, session-based).
- **Session Management**: Express sessions with PostgreSQL storage.
- **API**: RESTful, consistent error handling, logging.
- **Real-time**: Native WebSocket implementation for messaging and order updates.
- **Matching System**: `server/matching-service.ts` refactored with intelligent scoring algorithms, supporting multi-connector data (hemp, cannabis, carbon credits) and social impact integration.

### Data Storage
- **Primary Database**: PostgreSQL via Neon serverless.
- **ORM**: Drizzle ORM (type-safe).
- **Schema Management**: Drizzle Kit for migrations.
- **Connection Pooling**: Neon serverless connection pooling.

### Key Features and Technical Implementations
- **User Management**: Role-based access (Buyer, Seller, Admin), comprehensive profiles, secure authentication, multi-level verification.
- **Marketplace**: CRUD for listings, advanced search, geographic discovery, featured listings.
- **Order Management**: Full lifecycle tracking, real-time updates, payment integration, delivery management.
- **Messaging**: Real-time WebSocket chat, conversation management, context-aware.
- **Blockchain Integration**: Ethereum-based transaction recording/verification, mock mode for testing, audit trail.
- **Data Import**: Comprehensive Excel import system with intelligent column mapping, price parsing, field validation, and backup/rollback. Now uses 100% authentic cannabis trading data.
- **Social Impact**: Tracking system with components for filtering, badges, forms; integrated into matching algorithms with importance weighting.
- **Performance**: React Query caching, lazy loading, HTTP cache headers, component memoization, password gate protection.
- **Infrastructure**: Permissions/consent for external data, mock external connectors, comprehensive interaction logging, ML framework design, security hardening, performance monitoring.

## External Dependencies

### Core Infrastructure
- **Neon Database**: PostgreSQL hosting.
- **WebSocket**: Native Node.js WebSocket.
- **Session Storage**: `connect-pg-simple` (PostgreSQL-backed).

### Frontend Libraries
- **React Ecosystem**: React 18, TypeScript.
- **UI Components**: Radix UI, Shadcn/ui.
- **Data Fetching**: TanStack Query.
- **Form Management**: React Hook Form, Zod.
- **Mapping**: Leaflet.

### Backend Libraries
- **Database**: Drizzle ORM.
- **Authentication**: Passport.js.
- **Validation**: Zod.
- **CORS**: `cors` middleware.

### Development Tools
- **Build System**: Vite, ESBuild.
- **Code Quality**: TypeScript strict mode.