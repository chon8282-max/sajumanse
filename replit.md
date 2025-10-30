# Overview

This mobile application is a traditional Korean calendar (만세력) and Saju (Four Pillars of Destiny) fortune-telling service. It calculates and displays traditional Korean calendar information, constructs birth charts using the 60-year cycle, and provides personalized fortune readings based on the Five Elements (오행) theory. The project aims to deliver accurate traditional astrological insights in a user-friendly mobile experience.

# Recent Changes

## 2025-10-30: Month Pillar Calculation Bug Fix
- **Issue**: Month pillar (월주) was incorrectly calculated due to incomplete solar term to month mapping in server/routes.ts
- **Solution**: Updated `solarTermMonthMap` to include all 24 solar terms (both 節氣 and 中氣) with correct month indices (0-11)
- **Mapping**: 입춘/우수→인월(0), 경칩/춘분→묘월(1), 청명/곡우→진월(2), etc.
- **Tests Verified**: 1965-08-15 → 甲申, 1975-01-14 → 丁丑, 1980-02-25 → 戊寅, 1992-03-25 → 癸卯

## 2025-10-30: Mobile Scroll Optimization
- **Issue**: Users could not scroll to access all content on mobile devices
- **Solution**: 
  - Added `overflow-y-auto` to main layout container in App.tsx
  - Added mobile scroll CSS optimizations: `-webkit-overflow-scrolling: touch`, `overscroll-behavior-y: contain`
  - Horizontal overflow suppression with `overflow-x: hidden`
- **Impact**: All pages (사주 결과, 목록, 홈) now fully scrollable with smooth touch interaction

## 2025-10-30: Compatibility Load List Sorting Fix
- **Issue**: In compatibility page, "불러오기" button showed old data instead of recently modified 사주 records
- **Solution**: Changed `getSajuRecords()` sorting from `createdAt` to `updatedAt` in client/src/lib/saju-local-storage.ts
- **Impact**: Recently modified/saved 사주 records now appear at the top of the selection list

# User Preferences

Preferred communication style: Simple, everyday language.

## Traditional Display Conventions
- **Right-to-Left (RTL) Display**: All traditional fortune-telling elements must display right-to-left going forward:
  - 사주원국 (Four Pillars)
  - 대운 (Daeun/Great Luck periods)
  - 세운 (Saeun/Year Luck)
  - 월운 (Wolun/Month Luck)
- **Month Pillar Exclusion**: Daeun calculations must exclude the person's own month pillar (자기 월주는 빼는거야)

# System Architecture

## Frontend
- **Framework**: React with TypeScript (Vite build tool)
- **Routing**: Wouter
- **State Management**: React Query for server state, native React hooks for local state
- **UI**: shadcn/ui (Radix UI + Tailwind CSS)
- **Design**: Mobile-first, responsive, with light/dark theme support.
- **PWA**: Configured for installability and offline support with a specific manifest ID and service worker for auto-updates.

## Backend
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM
- **API**: RESTful with error handling and validation.

## Data Storage
- **Primary Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM for type-safe schema management.

## Key Features & Calculations
- **Saju Calculator**: Computes Four Pillars (Heavenly Stems and Earthly Branches).
- **Five Elements Analysis**: Wu Xing balance analysis.
- **Calendar Conversion**: Solar to lunar conversion, including 24 solar terms.
- **Fortune Analysis**: Comprehensive scoring for overall, love, and career.
- **Shinsal System**: Calculation and display of 15 traditional astrological indicators across all pillars.
- **Solar Term Transition Day Handling**: Special logic for births on solar term dates (e.g., 입춘, 경칩) to adjust year and month pillars, with client-side bundling of KASI solar term data (1900-2050) for offline support and performance.
- **Lunar Information Display**: Both solar and lunar dates are displayed for all birth records.
- **Birth Time Unknown Support**: Adapts calculations and UI for cases where birth time is not provided, dynamically displaying 3 pillars instead of 4.
- **Cheongan Event**: Dynamic interaction display between Daeun/Saeun and the Four Pillars (e.g., 충(沖), 합(合)).
- **Screen Sharing**: Allows capturing and sharing of the current screen as a JPEG via Web Share API or download.
- **Mobile Menu UX**: Side menu with 60% screen width and swipe-to-close gesture.
- **Compatibility Mode**: Side-by-side Saju comparison with save functionality and URL parameter loading.

# External Dependencies

## Third-party Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Google Fonts**: Noto Sans KR, Noto Serif KR, IBM Plex Mono for typography.

## Key Libraries
- **UI Components**: Radix UI.
- **Validation**: Zod.
- **Date Handling**: date-fns.
- **Styling**: Tailwind CSS, class-variance-authority.
- **Lunar-Solar Calendar Data**: lunar-javascript library for calendar conversions.

## Authentication & Sessions
- **Google OAuth 2.0**: Direct implementation for user authentication, storing tokens server-side. Special handling for PWA standalone mode login via URL copy mechanism due to Google's restrictions.
- **Session Management**: Express-session with PostgreSQL-backed storage (connect-pg-simple).

## Backup & Restore System
- **Google Drive Backup**: Server-side backup and restore of user data to a hidden appDataFolder in Google Drive, with robust error handling for authentication.