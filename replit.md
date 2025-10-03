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