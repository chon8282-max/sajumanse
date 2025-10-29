# Overview

This mobile application is a traditional Korean calendar (만세력) and Saju (Four Pillars of Destiny) fortune-telling service. It calculates and displays traditional Korean calendar information, constructs birth charts using the 60-year cycle, and provides personalized fortune readings based on the Five Elements (오행) theory. The project aims to deliver accurate traditional astrological insights in a user-friendly mobile experience.

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