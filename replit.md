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
- **Shinsal (神殺) System**: Comprehensive calculation of 9 traditional astrological indicators across all four pillars:
  - 천을귀인 (天乙貴人) - Noble Person star
  - 문창귀인 (文昌貴人) - Literary Excellence star
  - 천덕귀인 (天德貴人) - Heavenly Virtue star
  - 월덕귀인 (月德貴人) - Monthly Virtue star
  - 괴강살 (魁罡煞) - Authority & Power star (간지: 庚戌, 庚辰, 壬辰, 戊戌, 壬戌)
  - 백호대살 (白虎大煞) - White Tiger star (간지: 甲辰, 乙未, 丙戌, 戊辰, 丁丑, 壬戌, 癸丑)
  - 양인살 (羊刃煞) - Sheep Blade star (일간 기준: 甲→卯, 丙→午, 戊→午, 庚→酉, 壬→子)
  - 낙정관살 (落井關殺) - Well-falling star (일간 기준: 甲己→巳, 乙庚→子, 丙辛→申, 丁壬→戌, 戊癸→卯)
  - 효신살 (梟神殺) - Owl God star (간지: 甲子, 乙亥, 丙寅, 丁卯, 戊午, 己巳, 庚辰, 庚戌, 辛丑, 辛未, 壬申, 癸酉)
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
- **Session Management**: connect-pg-simple for PostgreSQL-backed session storage
- **Security**: Built-in Express session handling with secure cookie configuration

The application uses a monorepo structure with shared TypeScript definitions between client and server, ensuring type safety across the full stack. The design system follows Korean cultural aesthetics with warm color palettes and traditional typography choices suitable for displaying Korean characters and traditional calendar information.