# Overview

This is a traditional Korean calendar (만세력) mobile application that provides Saju (Four Pillars of Destiny) fortune telling based on Korean traditional astrology. The app calculates and displays traditional Korean calendar information, birth charts using the 60-year cycle system with Heavenly Stems (천간) and Earthly Branches (지지), and provides personalized fortune readings based on the Five Elements (오행) theory.

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

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query (@tanstack/react-query) for server state management and built-in React hooks for local state
- **UI Framework**: shadcn/ui components built on top of Radix UI primitives with Tailwind CSS for styling
- **Mobile-First Design**: Responsive design optimized for mobile devices with touch-friendly interactions
- **Theme System**: Custom theme provider supporting light/dark modes with CSS custom properties

## Backend Architecture
- **Server Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful API endpoints with proper error handling and validation
- **Development Tools**: Hot module replacement via Vite middleware in development mode

## Data Storage Solutions
- **Primary Database**: PostgreSQL using Neon serverless database
- **ORM**: Drizzle ORM with schema-first approach for type safety
- **Connection**: Connection pooling via @neondatabase/serverless with WebSocket support
- **Schema Management**: Centralized schema definitions in shared directory for type consistency between frontend and backend

## Key Features & Calculations
- **Saju Calculator**: Traditional Four Pillars calculation system using Heavenly Stems and Earthly Branches
- **Five Elements Analysis**: Wu Xing (오행) balance analysis for fortune interpretation
- **Calendar Conversion**: Solar to lunar calendar conversion with 24 solar terms consideration
- **Fortune Analysis**: Comprehensive fortune scoring system covering overall, love, and career aspects
- **Shinsal (神殺) System**: Comprehensive calculation of 15 traditional astrological indicators across all four pillars:
  - 천을귀인 (天乙貴人) - Noble Person star
  - 문창귀인 (文昌貴人) - Literary Excellence star
  - 천덕귀인 (天德貴人) - Heavenly Virtue star
  - 월덕귀인 (月德貴人) - Monthly Virtue star
  - 괴강살 (魁罡煞) - Authority & Power star (간지: 庚戌, 庚辰, 壬辰, 戊戌, 壬戌)
  - 백호대살 (白虎大煞) - White Tiger star (간지: 甲辰, 乙未, 丙戌, 戊辰, 丁丑, 壬戌, 癸丑)
  - 양인살 (羊刃煞) - Sheep Blade star (일간 기준: 甲→卯, 丙→午, 戊→午, 庚→酉, 壬→子)
  - 낙정관살 (落井關殺) - Well-falling star (일간 기준: 甲己→巳, 乙庚→子, 丙辛→申, 丁壬→戌, 戊癸→卯)
  - 효신살 (梟神殺) - Owl God star (간지: 甲子, 乙亥, 丙寅, 丁卯, 戊午, 己巳, 庚辰, 庚戌, 辛丑, 辛未, 壬申, 癸酉)
  - 수액살 (水厄殺) - Water Calamity star (월지 기준: 인묘진→인, 사오미→진, 신유술→유, 해자축→축)
  - 이별살 (離別殺) - Separation star (일주 간지: 甲寅, 乙卯, 乙未, 丙午, 戊辰, 戊申, 戊戌, 己丑, 庚申, 辛酉, 壬子)
  - 농아살 (聾兒殺) - Deaf-Mute star (년지→시지: 인오술→묘, 신자진→유, 해묘미→자, 사유축→오)
  - 고란살 (孤鸞殺) - Lonely Phoenix star (일주 간지: 甲寅, 乙巳, 丁巳, 戊申, 辛亥)
  - 홍염살 (紅艶殺) - Red Beauty star (일간→지지: 甲丙→午, 丁→未, 戊→辰, 庚→申/戌, 辛→酉, 壬→子)
  - 부벽살 (釜劈殺) - Cauldron Split star (월지 기준: 자오묘유→해, 인신사해→유, 진술축미→축)
  - Display: Shinsal displayed vertically within each pillar column with 2px spacing between items
- **Solar Term Transition Day (절입일) Handling**: Special dialog for births on solar term dates (e.g., 입춘, 경칩)
  - "전월 간지" button (usePreviousMonthPillar=true): Uses previous month pillar by decrementing monthEarthIndex
  - "절입 후 간지" button (usePreviousMonthPillar=false): 
    - For 입춘 (Lichun, monthEarthIndex=0): Increments year pillar (yearSkyIndex/yearEarthIndex +1)
    - For other solar terms: Uses default calculation (no year change)
  - Example for 1988-02-04 (입춘): "전월 간지" → 정묘년 계축월, "절입 후 간지" → 무진년 갑인월
  - Example for 1988-03-05 (경칩): "전월 간지" → 정묘년 갑인월, "절입 후 간지" → 무진년 을묘월
  - SajuResult page prioritizes server-calculated pillars (saved in database) over client-side recalculation
  - isLichunAdjusted flag tracks whether year adjustment already occurred during lunar conversion to prevent double adjustments
- **Birth Time Unknown Support**: Complete handling of cases where birth time is unknown (생시모름)
  - When birth time is unknown, hourSky and hourEarth are stored as empty strings
  - Hour pillar Wuxing values (hourSky, hourEarth) are also empty strings
  - UI dynamically displays 3 pillars (일주, 월주, 년주) instead of 4
  - All auxiliary calculations (12신살, 신살, etc.) adapt to 3-column layout
  - Type system allows `WuXing | ''` for hour pillar Wuxing fields only
  - Color helper functions (getWuXingColor, getWuXingBgColor) gracefully handle empty strings by returning ''
- **Cheongan Event (천간 이벤트)**: Dynamic interaction between Daeun/Saeun and Four Pillars
  - **B mode (Daeun)**: Row 1 (육친) is replaced with Cheongan Event based on Daeun's heavenly stem vs. each pillar's heavenly stem
  - **C mode (Saeun)**: Row 1 (육친) is replaced with Cheongan Event based on Saeun's heavenly stem vs. each pillar's heavenly stem
  - Events include: 비화, 비화합, 목생화, 화생토, 토생금, 금생수, 수생목, 설기, 휴수극, 충(沖), 합(合), etc.
  - Applies to both date-based and Ganji-based (간지로 뽑기) Saju records
  - Implementation: calculateCheonganEvent() function with complete 10x10 stem interaction matrix
- **Screen Sharing**: Capture and share current screen via Web Share API or download
  - Image format: JPEG (0.95 quality) for better mobile compatibility
  - Filename: `사주명식_YYYY-MM-DD.jpg`
  - Falls back to download if Web Share API not supported
- **Mobile Menu UX**: 60% width side menu with touch gesture support
  - Width: 60% of screen width (reduced from 320px fixed)
  - Swipe to close: Left swipe gesture (50px threshold) closes menu
  - Touch events: onTouchStart/Move/End handlers for natural mobile interaction
- **Compatibility Mode**: Side-by-side Saju comparison with save functionality
  - URL parameters: Auto-loads sajus from `?left={id}&right={id}` query params
  - Memo editing: Editable textarea for each saju with save button
  - Button scaling: 60% size reduction for change/save buttons (scale-[0.6])

## External Dependencies

### Third-party Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Google Fonts**: Korean typography support (Noto Sans KR, Noto Serif KR, IBM Plex Mono)

### Key Libraries
- **UI Components**: Extensive Radix UI component library for accessible, unstyled components
- **Validation**: Zod for runtime type validation and schema creation
- **Date Handling**: date-fns for date manipulation and formatting
- **Styling**: Tailwind CSS with custom design system and class-variance-authority for component variants
- **Development**: Replit-specific plugins for development environment integration

### Authentication & Sessions
- **Google OAuth 2.0**: Direct OAuth implementation for user authentication with Google Drive API scopes
  - Backend OAuth flow: /api/auth/login → Google consent → /api/auth/callback → session creation
  - Credentials stored in Replit Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET
- **Session Management**: Express-session with PostgreSQL-backed storage (connect-pg-simple)
  - Secure cookie configuration with proxy trust for Replit deployment
  - Session data includes userId for user identification
- **Frontend Auth**: TanStack Query-based AuthContext
  - Fetches user from /api/auth/user with credentials
  - Mutation-based logout without page reloads
  - SPA routing with Wouter after authentication state changes
- **Token Management**: 
  - OAuth tokens (accessToken, refreshToken) stored in users table
  - Token refresh logic in Google Drive API calls
  - Automatic token cleanup on logout
- **PWA OAuth Login Flow**: Special handling for PWA standalone mode
  - **Issue**: Google blocks OAuth in PWA WebView (403 disallowed_useragent)
  - **Solution**: 2-tier URL copy strategy
    1. **Clipboard API**: Automatic copy if supported
    2. **Manual Fallback**: Read-only input with pre-selected URL if clipboard fails
  - **User Flow** (PWA mode):
    1. Click "로그인 URL 복사" → clipboard copy attempt
    2. If clipboard fails → centered input with URL appears (10s timeout)
    3. User copies URL manually (long-press or click to dismiss)
    4. Paste in external browser → Google OAuth → login
    5. Return to app → visibilitychange auto-login check
  - **User Flow** (normal browser):
    1. Click "Google로 로그인" → direct redirect to /api/auth/login
  - **Implementation**: Login.tsx detects standalone mode via matchMedia
  - **Callback Enhancement**: Mobile-friendly guidance after OAuth completion

### Backup & Restore System
- **Google Drive Backup**: Server-side backup to user's Google Drive appDataFolder
  - Authentication: Backend manages OAuth tokens from users table
  - Format: JSON backup files with timestamp naming (saju-backup-YYYY-MM-DD.json)
  - Storage: Stored in Google Drive appDataFolder (hidden from user's main Drive)
  - API endpoints: /api/backup/drive/upload, /api/backup/drive/list, /api/backup/drive/download
- **Error Handling**: Comprehensive auth error detection and automatic re-login prompts
  - Drive API 401/403 errors trigger AUTH_EXPIRED response
  - Frontend detects AUTH_EXPIRED and prompts re-authentication
  - Token refresh attempts before failing
- **Security**: 
  - Access tokens stored server-side in database
  - Session-based authentication for API requests
  - Automatic token refresh on expiry

The application uses a monorepo structure with shared TypeScript definitions between client and server, ensuring type safety across the full stack. The design system follows Korean cultural aesthetics with warm color palettes and traditional typography choices suitable for displaying Korean characters and traditional calendar information.