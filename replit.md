# Overview

This mobile application is a traditional Korean calendar (만세력) and Saju (Four Pillars of Destiny) fortune-telling service. It calculates and displays traditional Korean calendar information, constructs birth charts using the 60-year cycle, and provides personalized fortune readings based on the Five Elements (오행) theory. The project aims to deliver accurate traditional astrological insights in a user-friendly mobile experience.

# Recent Changes

## 2025-11-10: Ganji Input Cache Fix and UX Improvements
- **Issue**: Ganji-saved records showed "사주 데이터 오류" in Compatibility page despite saving correctly
- **Root Cause**: React Query cache contained stale data without ganji fields, preventing proper display
- **Solution**: Added `refetchOnMount: 'always'` and `staleTime: 0` to Compatibility useQuery hooks
- **Additional Improvements**:
  - Removed auto-memo generation for ganji inputs (memo field now empty string)
  - Unified list display format for both ganji and birthdate inputs
  - Enhanced cache invalidation in GanjiResult to update both query keys immediately
- **Impact**: Ganji input records now save, list, and load in Compatibility without errors

## 2025-11-10: Complete Offline Migration
- **Achievement**: Application now works 100% offline with zero server API dependency
- **Changes**:
  - Migrated all server API calls to client-side calculations
  - Replaced `/api/saju/calculate` with local `calculateSaju()` in SajuInput.tsx, Home.tsx, GanjiResult.tsx
  - Implemented lunar-solar conversion using lunar-javascript library (Solar.fromYmd/getLunar)
  - Bundled KASI solar terms data (1900-2050) for offline access
  - All data stored in IndexedDB (device-local, not shared across devices)
- **Impact**: App fully functional without internet - calculations, conversions, and storage all work offline

## 2025-11-10: Ganji Input Display Improvements
- **Issue 1**: Ganji input auto-saved memo text "간지 입력: 甲寅년 丁丑월..." which user wanted removed
- **Issue 2**: Ganji records displayed differently from birth date records in list
- **Issue 3**: Ganji records didn't appear immediately in list after saving - required saving another record to show
- **Solutions**:
  - Removed auto-memo generation in GanjiResult.tsx (memo field now empty string)
  - Unified list display format in SajuList.tsx - both ganji and birth date inputs now show: "양력 YYYY.M.D 음력 YYYY.M.D 時"
  - Fixed cache invalidation - now invalidates both `['local-saju-records']` and `['local-saju-records-list']` query keys
- **Impact**: Clean, consistent display and immediate list updates for ganji input records

## 2025-11-01: Lunar Information Display Fix
- **Issue**: Lunar date information not displayed in Compatibility page
- **Solution**: Added lunarYear, lunarMonth, lunarDay, isLeapMonth props to SajuTable in Compatibility.tsx
- **Impact**: Lunar dates now display correctly for both left and right saju in compatibility analysis

## 2025-11-01: Compatibility List Cache Invalidation
- **Issue**: Deleted saju records still appeared in compatibility page selection list
- **Root Cause**: Cache key mismatch - SajuList used `["local-saju-records"]` but Compatibility used `["local-saju-records-list"]`
- **Solution**: Updated SajuList.tsx delete mutations to invalidate both cache keys
- **Impact**: Deleted records immediately disappear from compatibility selection list

## 2025-11-01: Missing Ganji Error Handling
- **Issue**: Saved saju records without yearSky/daySky showed blank pages
- **Solution**: 
  - Added ganji validation in SajuResult.tsx calculatedData useMemo
  - Display clear error message: "간지 정보가 누락되었습니다. 사주를 다시 계산해주세요."
  - Added "다시 계산하기" button to redirect to input page for recalculation
- **Impact**: Users can easily identify and fix records with missing ganji data
- **Note**: Existing records saved before validation may need to be re-saved

## 2025-10-30: Compatibility Page yearSky Validation
- **Issue**: Compatibility page showed "불러오기" buttons instead of saju tables when yearSky/daySky were not saved
- **Root Cause**: Some saju records saved without yearSky/daySky due to calculateSaju failures or edit mode flows
- **Solution**:
  - Added validation in SajuInput.tsx (574-576번 줄) to ensure yearSky/daySky exist before saving
  - Added error message display in Compatibility.tsx for records missing ganji data
  - Display "사주 데이터 오류" message with option to select different saju when yearSky is missing
- **Impact**: Prevents saving incomplete saju records and provides clear user feedback for existing incomplete data

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

## 2025-10-30: Compatibility Page Error Handling Enhancement
- **Issue**: When accessing compatibility page via URL parameter with non-existent saju ID (e.g., different device/cleared cache), page showed blank without any feedback
- **Solution**: 
  - Added `isLoading` and `error` states to useQuery hooks in client/src/pages/Compatibility.tsx
  - Display loading spinner during data fetch
  - Show error message + "다시 선택하기" button when data not found
  - Added console.log debugging messages for troubleshooting
- **Impact**: Users now receive clear feedback when saju data cannot be loaded, with option to select different record

## 2025-10-30: Compatibility Page URL Parameter Handling Fix
- **Issue**: When clicking 궁합 button from SajuResult page, compatibility page showed empty data despite URL parameter being passed
- **Root Cause**: Initial state was restored from localStorage first, then useEffect processed URL parameters, causing timing issues where useQuery executed before URL params were applied
- **Solution**: 
  - Modified initial state to check URL parameters FIRST, then fallback to localStorage
  - Added detailed console logging for debugging (URL vs localStorage ID sources)
- **Impact**: Compatibility page now correctly loads left saju data when navigating from SajuResult page via 궁합 button

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