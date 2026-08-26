# Progress Summary - Sabiá Project

## Overview
This document summarizes the work completed on the Sabiá project as of the current build phase.

## Completed Work

### Fase 0 - Quick Wins and Setup ✅

#### 0.1 MSW Production Fix
- **File**: `sabia-frontend/src/main.tsx`
- **Change**: Modified condition to only activate MSW in development: `if (import.meta.env.DEV && import.meta.env.VITE_MSW_ENABLED !== 'false')`
- **Purpose**: Prevent mocks from interfering with production builds when backend is available

#### 0.2 Error Boundary and Lazy Loading
- **File**: `sabia-frontend/src/components/common/ErrorBoundary.tsx` (NEW)
- **File**: `sabia-frontend/src/routes/index.tsx` (UPDATED)
- **Changes**:
  - Added reusable ErrorBoundary component with fallback UI
  - Implemented lazy loading for all pages using React.lazy() and Suspense
  - Wrapped routes in ErrorBoundary + Suspense for better error handling and code splitting
  - Protected routes maintain role-based access control
- **Benefits**: Improved performance (code splitting), better user experience during loading/error states

#### 0.3 Laravel Backend Scaffold
- **Command**: `php C:\php\composer create-project laravel/laravel sabia-api`
- **Result**: Created `sabia-api/` directory with Laravel 13.8.0 scaffold
- **Status**: Successfully installed with application key generated

#### 0.4 Package Installation
- **Commands**:
  - `laravel/sanctum` v4.3.3 (API authentication)
  - `pgvector/pgvector` v0.2.2 (PostgreSQL vector extension for embeddings)
- **Status**: Both packages installed successfully

### Fase 1 - Backend Core (In Progress) 🚧

#### 1.1 Migrations (Completed)
Created migration files for all 13 tables specified in the spec, plus OTP fields migration:

1. `2026_08_03_033147_create_profiles_table.php`

1. `2026_08_03_033147_create_profiles_table.php`
   - UUID primary key
   - Foreign key to auth.users
   - full_name, role (operador/gestor), is_active, timestampsTz

2. `2026_08_03_033153_create_categories_table.php`
   - id, name (unique), slug (unique), description, color, icon, sort_order, timestampsTz

3. `2026_08_03_033158_create_articles_table.php`
   - id, title, slug (unique), content, summary, category_id (FK), access_level, status, views_count, helpful_yes/no, version, created_by (FK to profiles), timestampsTz
   - Indexes on category_id, created_by, access_level, status

4. `2026_08_03_033206_create_article_versions_table.php`
   - id, article_id (FK), version, content, edited_by (FK to profiles), timestampsTz
   - Indexes on article_id, edited_by, unique constraint on (article_id, version)

5. `2026_08_03_033210_create_article_chunks_table.php`
   - id, article_id (FK), content, chunk_index, embedding VECTOR(768), keywords (JSON), timestampsTz
   - HNSW index for vector similarity search (vector_cosine_ops, m=16, ef_construction=200)
   - Index on article_id

6. `2026_08_03_033215_create_conversations_table.php`
   - id (UUID), user_id (FK to profiles), session_id, source, access_level, title, is_closed, closed_at, rating, transfer_status, timestampsTz
   - Indexes on user_id, session_id, source, access_level, is_closed, rating, transfer_status

7. `2026_08_03_033220_create_messages_table.php`
   - id, conversation_id (FK), role (user/assistant/system), content, images (JSON), sources (JSON), has_images, confidence (DECIMAL 4,3), timestampsTz
   - Indexes on conversation_id, has_images

8. `2026_08_03_033225_create_knowledge_gaps_table.php`
   - id, question, conversation_id (FK), session_id, resolved, resolved_by (FK to profiles), resolved_at, timestampsTz
   - Indexes on conversation_id, session_id, resolved, resolved_by

9. `2026_08_03_033230_create_widget_settings_table.php`
   - id, welcome_message, support_link, support_start_time, support_end_time, support_phone, teams_webhook_url, out_of_hours_message, notification flags, allowed_domains (JSON), maintenance_mode, maintenance_message, updated_by (FK to profiles), timestampsTz
   - Index on updated_by
   - Default record inserted

10. `2026_08_03_033238_create_brand_settings_table.php`
    - id, app_name, logo_url, favicon_url, primary_color, secondary_color, font, updated_by (FK to profiles), timestampsTz
    - Index on updated_by
    - Default record inserted

11. `2026_08_03_033243_create_ai_settings_table.php`
    - id, provider (enum), api_key, model, embedding_model, temperature, max_tokens, system_prompt, chunk_size, chunk_overlap, rag_top_n, confidence_threshold, language, updated_by (FK to profiles), timestampsTz
    - Indexes on provider, updated_by
    - Default record inserted

12. `2026_08_03_033248_create_audit_logs_table.php`
    - id, user_id (FK to profiles), action, entity_type, entity_id, old_value (JSON), new_value (JSON), ip_address (inet), user_agent, timestampsTz
    - Indexes on user_id, action, created_at

13. `2026_08_03_033253_create_system_logs_table.php`
    - id, level (enum), context, message, payload (JSON), timestampsTz
    - Indexes on level, created_at

**Note**: The default Laravel users table migration was modified to use UUIDs and placed in an 'auth' schema for better organization.

### Next Steps (Fase 1 Continued)

The following items remain to be completed in Fase 1:

#### 1.2 Models
- Create Eloquent models for all 13 tables with proper relationships, casts, and scopes

#### 1.3 RLS (Row Level Security)
- Create database roles: sabia_internal, sabia_widget
- Enable RLS on all tables
- Create policies for data isolation between internal users and widget users
- Create SetRlsContext middleware to set app context variables

#### 1.4 Middleware
- CheckRole (gestor/operador)
- CheckAccessLevel
- SecurityHeaders (HSTS, CSP, etc.)
- Throttle configuration for login and chat endpoints

#### 1.5 Auth Sanctum
- AuthController (login/logout/me)
- Token handling for widget vs internal users
- Login throttling implementation

#### 1.6 Configuration
- CORS configuration
- Security headers
- Encryptable cast for API keys

#### 1.7 AuditService + SystemLog
- Helper classes for audit logging and system logging

## Technical Decisions Made

1. **UUIDs**: Used UUIDs for primary keys on tables that need external referencing (users, profiles, conversations) for better security and distributed systems compatibility
2. **Timestamps**: Used timestampsTz for timezone-aware timestamps
3. **JSON Fields**: Used JSON type for arrays/objects that map to PostgreSQL JSONB or TEXT[] types
4. **Vector Type**: Leveraged pgvector's VECTOR type for embeddings with HNSW indexing
5. **Foreign Keys**: Proper cascading deletes where appropriate
6. **Default Records**: Inserted default configuration records for settings tables
7. **Error Handling**: Added try/catch blocks where database extensions need to be enabled

## Files Modified/Created

```
sabia-frontend/
├── src/
├── components/
│   └── common/
│       └── ErrorBoundary.tsx (NEW)
├── pages/
│   └── Login.tsx (MODIFIED - OTP authentication flow)
├── routes/
│   └── index.tsx (MODIFIED - lazy loading + ErrorBoundary)
└── src/main.tsx (MODIFIED - MSW condition fix)

sabia-api/
├── database/
│   └── migrations/
│       ├── 0001_01_01_000000_create_users_table.php (MODIFIED)
│       ├── 2026_08_03_031124_create_personal_access_tokens_table.php (NEW)
│       ├── 2026_08_03_033147_create_profiles_table.php (NEW)
│       ├── 2026_08_03_033153_create_categories_table.php (NEW)
│       ├── 2026_08_03_033158_create_articles_table.php (NEW)
│       ├── 2026_08_03_033206_create_article_versions_table.php (NEW)
│       ├── 2026_08_03_033210_create_article_chunks_table.php (NEW)
│       ├── 2026_08_03_033215_create_conversations_table.php (NEW)
│       ├── 2026_08_03_033220_create_messages_table.php (NEW)
│       ├── 2026_08_03_033225_create_knowledge_gaps_table.php (NEW)
│       ├── 2026_08_03_033230_create_widget_settings_table.php (NEW)
│       ├── 2026_08_03_033238_create_brand_settings_table.php (NEW)
│       ├── 2026_08_03_033243_create_ai_settings_table.php (NEW)
│       ├── 2026_08_03_033248_create_audit_logs_table.php (NEW)
│       ├── 2026_08_03_033253_create_system_logs_table.php (NEW)
│       └── 2026_08_03_035450_add_otp_fields_to_users_table.php (NEW - OTP fields)
├── app/
│   └── Http/
│       └── Controllers/
│           └── Auth/
│               ├── OtpController.php (MODIFIED - OTP verification)
│               └── AuthController.php (NEW - OTP send and login with OTP)
├── routes/
│   └── api.php (MODIFIED - Added OTP routes)
├── .env (MODIFIED - PostgreSQL configuration)
└── composer.json (UPDATED - added sanctum and pgvector dependencies)
```

## Current Status
- **Fase 0**: Complete (quick wins and setup)
- **Fase 1**: Migrations complete, proceeding to Models and RLS implementation
- **Remaining**: Auth, middleware, services, controllers, frontend integration

## Environment
- PHP 8.3.31
- Composer 2.10.1
- Laravel 13.8.0
- PostgreSQL 18.4 with pgvector 0.8.5 extension
- Node.js 22.16.0
- npm 10.9.2

## Next Immediate Steps
1. Complete Fase 1.2 (Models)
2. Implement Fase 1.3 (RLS setup and policies)
3. Begin Fase 1.4 (Middleware)
4. Start Fase 0.4 (.env.example and Docker Compose)

## Notes
- The MSW fix in main.tsx ensures production builds will attempt to connect to a real backend
- All migrations are designed to run on a fresh PostgreSQL database with the vector extension available
- Default configuration records provide usable out-of-the-box experience
- UUID primary keys provide better security for exposed identifiers