# 만세력 모바일 앱 디자인 가이드라인

## Design Approach Documentation
**Selected Approach**: Reference-Based Design
- **Primary Reference**: Traditional Korean calendar apps + Modern wellness apps (like Calm, Headspace)
- **Secondary References**: KakaoTalk's clean interface patterns, Naver's information density handling
- **Justification**: 만세력은 전통적이면서도 현대적 접근성이 필요한 정보 중심 앱

## Core Design Elements

### A. Color Palette
**Primary Colors (Dark Mode)**:
- Background: 25 15% 8% (deep charcoal with warm undertone)
- Surface: 25 12% 12% (elevated surfaces)
- Primary: 45 65% 55% (warm gold for important elements)
- Text Primary: 0 0% 95% (near white)
- Text Secondary: 0 0% 70% (muted gray)

**Primary Colors (Light Mode)**:
- Background: 45 25% 97% (warm off-white)
- Surface: 0 0% 100% (pure white cards)
- Primary: 25 45% 25% (deep brown-green)
- Text Primary: 25 20% 15% (dark warm gray)
- Text Secondary: 25 10% 45% (medium warm gray)

**Accent Colors**: 
- Success/Positive: 140 45% 45% (muted jade green)
- Warning/Neutral: 35 55% 50% (warm amber, used sparingly)

### B. Typography
**Font Families**:
- Primary: 'Noto Sans KR' (Korean text, clean readability)
- Secondary: 'Noto Serif KR' (traditional elements, 한자)
- Monospace: 'IBM Plex Mono' (numbers, dates)

**Font Hierarchy**:
- Display: 28px/bold (메인 타이틀)
- H1: 24px/semibold (섹션 헤더)
- H2: 20px/medium (서브 헤더)
- Body: 16px/regular (기본 텍스트)
- Caption: 14px/regular (보조 정보)
- Small: 12px/medium (라벨, 태그)

### C. Layout System
**Spacing Units**: Tailwind units of 2, 4, 6, 8, 12, 16
- Micro spacing: p-2, m-2 (8px)
- Standard spacing: p-4, m-4 (16px)
- Section spacing: p-6, m-6 (24px)
- Large spacing: p-8, m-8 (32px)
- Extra large: p-12, m-12 (48px)
- Hero spacing: p-16, m-16 (64px)

**Grid System**: 
- Mobile: Single column with 4-unit side margins
- Content max-width: Full screen minus 8-unit margins
- Card spacing: 4-unit gaps between elements

### D. Component Library

**Navigation**:
- Bottom tab bar (고정): 만세력, 내정보, 운세, 설정
- Header: Minimal with date selector and settings icon
- No top navigation tabs (화면 공간 최적화)

**Cards & Containers**:
- 만세력 메인 카드: Rounded corners (12px), subtle shadow
- 사주팔자 표시: Grid layout with clear 천간/지지 구분
- 정보 카드: Clean borders, comfortable padding (6-unit)

**Interactive Elements**:
- Date picker: Korean-style calendar with 음력/양력 toggle
- Input fields: Rounded, clear validation states
- Buttons: Primary (filled), Secondary (outline), Ghost (text-only)
- 천간지지 elements: Tappable with subtle feedback

**Data Display**:
- 만세력 표: Traditional 4-column layout (년/월/일/시)
- 오행 indicators: Color-coded circular badges
- 운세 sections: Collapsible accordions for detailed info

### E. Mobile-Specific Considerations

**Screen Adaptation**:
- Safe area handling for notched devices
- Comfortable touch targets (minimum 44px)
- Thumb-friendly navigation placement
- Landscape mode support for 만세력 표

**Performance Optimizations**:
- Lazy loading for detailed 운세 content
- Efficient date calculations
- Minimal animations (fade transitions only)

**Accessibility**:
- High contrast mode support
- VoiceOver/TalkBack optimization for 한자 pronunciation
- Large text size adaptation
- Clear focus indicators

## Key Design Principles
1. **정보 우선**: 만세력 데이터가 명확하게 표시되어야 함
2. **전통과 현대의 조화**: 한자와 한글을 적절히 조합
3. **모바일 최적화**: 한 손으로 사용 가능한 인터페이스
4. **직관적 네비게이션**: 복잡한 정보를 단순하게 접근
5. **일관성**: 전체 앱에서 통일된 시각적 언어 사용