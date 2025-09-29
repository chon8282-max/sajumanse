import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 그룹 정보 테이블
export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // 그룹명
  isDefault: boolean("is_default").notNull().default(false), // 기본 그룹 여부
  
  // 메타데이터
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 사주 정보 저장 테이블
export const sajuRecords = pgTable("saju_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 기본 정보
  name: text("name").notNull().default("이름없음"), // 성명 (기본값: 이름없음)
  birthYear: integer("birth_year").notNull(),
  birthMonth: integer("birth_month").notNull(),
  birthDay: integer("birth_day").notNull(),
  birthTime: text("birth_time"), // 생시 (예: "子時" 또는 "23:31~01:30")
  calendarType: text("calendar_type").notNull().default("양력"), // "양력" | "음력" | "윤달"
  gender: text("gender").notNull(), // "남자" | "여자"
  groupId: varchar("group_id").references(() => groups.id), // 그룹 ID 참조
  group: text("group"), // 레거시 그룹 (호환성)
  memo: text("memo"), // 메모
  
  // 음력 변환 정보 (양력 입력 시 자동 계산되어 저장)
  lunarYear: integer("lunar_year"), // 음력 년도
  lunarMonth: integer("lunar_month"), // 음력 월
  lunarDay: integer("lunar_day"), // 음력 일
  isLeapMonth: boolean("is_leap_month").default(false), // 윤달 여부
  
  // 사주팔자 정보 (계산 후 저장)
  yearSky: text("year_sky"), // 년주 천간
  yearEarth: text("year_earth"), // 년주 지지
  monthSky: text("month_sky"), // 월주 천간
  monthEarth: text("month_earth"), // 월주 지지
  daySky: text("day_sky"), // 일주 천간
  dayEarth: text("day_earth"), // 일주 지지
  hourSky: text("hour_sky"), // 시주 천간
  hourEarth: text("hour_earth"), // 시주 지지
  
  // 메타데이터
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 이전 테이블과의 호환성을 위해 유지
export const manseRyeok = pgTable("manse_ryeok", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  birthYear: integer("birth_year").notNull(),
  birthMonth: integer("birth_month").notNull(),
  birthDay: integer("birth_day").notNull(),
  birthHour: integer("birth_hour").notNull(),
  isLunar: text("is_lunar").notNull().default("false"), // 음력 여부
  gender: text("gender").notNull(), // "남성" | "여성"
  
  // 사주팔자 정보
  yearSky: text("year_sky").notNull(), // 년주 천간
  yearEarth: text("year_earth").notNull(), // 년주 지지
  monthSky: text("month_sky").notNull(), // 월주 천간
  monthEarth: text("month_earth").notNull(), // 월주 지지
  daySky: text("day_sky").notNull(), // 일주 천간
  dayEarth: text("day_earth").notNull(), // 일주 지지
  hourSky: text("hour_sky").notNull(), // 시주 천간
  hourEarth: text("hour_earth").notNull(), // 시주 지지
});

// 그룹 스키마
export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

// 사주 기록 스키마
export const insertSajuRecordSchema = createInsertSchema(sajuRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  // 사주팔자 정보는 계산 후 자동 추가되므로 입력에서 제외
  yearSky: true,
  yearEarth: true,
  monthSky: true,
  monthEarth: true,
  daySky: true,
  dayEarth: true,
  hourSky: true,
  hourEarth: true,
});

export type InsertSajuRecord = z.infer<typeof insertSajuRecordSchema>;
export type SajuRecord = typeof sajuRecords.$inferSelect;

// 기존 호환성 유지
export const insertManseRyeokSchema = createInsertSchema(manseRyeok).pick({
  birthYear: true,
  birthMonth: true,
  birthDay: true,
  birthHour: true,
  isLunar: true,
  gender: true,
});

export type InsertManseRyeok = z.infer<typeof insertManseRyeokSchema>;
export type ManseRyeok = typeof manseRyeok.$inferSelect;

// 천간지지 상수
export const CHEONGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const JIJI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

// 전통 시간대 (십이시)
export const TRADITIONAL_TIME_PERIODS = [
  { code: "子時", name: "子時", range: "23:31~01:30", hour: 0 },
  { code: "丑時", name: "丑時", range: "01:31~03:30", hour: 2 },
  { code: "寅時", name: "寅時", range: "03:31~05:30", hour: 4 },
  { code: "卯時", name: "卯時", range: "05:31~07:30", hour: 6 },
  { code: "辰時", name: "辰時", range: "07:31~09:30", hour: 8 },
  { code: "巳時", name: "巳時", range: "09:31~11:30", hour: 10 },
  { code: "午時", name: "午時", range: "11:31~13:30", hour: 12 },
  { code: "未時", name: "未時", range: "13:31~15:30", hour: 14 },
  { code: "申時", name: "申時", range: "15:31~17:30", hour: 16 },
  { code: "酉時", name: "酉時", range: "17:31~19:30", hour: 18 },
  { code: "戌時", name: "戌時", range: "19:31~21:30", hour: 20 },
  { code: "亥時", name: "亥時", range: "21:31~23:30", hour: 22 },
] as const;

// 한글/한자 매핑 데이터

// 년간지 계산을 위한 기본 매핑
export const YEAR_TIANGAN_BASE = ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己']; // 서기 연도를 10으로 나눈 나머지로 계산
export const YEAR_DIZHI_BASE = ['申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未']; // 서기 연도를 12로 나눈 나머지로 계산

// 월간지 계산을 위한 매핑 (양력 기준)
// 1월=丑월, 2월=寅월(입춘), 3월=卯월(경칩), ..., 9월=酉월(백로), 10월=戌월(한로), 11월=亥월(입동), 12월=子월(대설)
export const MONTH_DIZHI = ['丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子']; // 1월부터 12월까지

// 월천간 계산을 위한 년천간별 기준표 (甲己, 乙庚, 丙辛, 丁壬, 戊癸)
export const YEAR_MONTH_SKY_MAP: Record<string, string[]> = {
  '甲': ['丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁'], // 甲年: 丙寅월부터 시작 (2월=丙寅, 1월=乙丑)
  '己': ['丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁'], // 己年: 甲년과 동일
  '乙': ['丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊'], // 乙年: 戊寅월부터 시작 (1월=丁丑, 2월=戊寅, 9월=乙酉)
  '庚': ['丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊'], // 庚年: 乙년과 동일  
  '丙': ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'], // 丙年: 庚寅월부터 시작 (2월=庚寅, 1월=己丑)
  '辛': ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'], // 辛年: 丙년과 동일
  '丁': ['壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'], // 丁年: 壬寅월부터 시작 (2월=壬寅, 1월=辛丑)
  '壬': ['壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'], // 壬年: 丁년과 동일
  '戊': ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙'], // 戊年: 甲寅월부터 시작 (2월=甲寅, 1월=癸丑)
  '癸': ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙']  // 癸년: 戊년과 동일
};

// 일간지 계산을 위한 기준일 (1900년 1월 1일 = 갑자일로 설정)
export const DAY_GANJI_BASE_DATE = new Date(1900, 0, 1); // 1900년 1월 1일
export const DAY_GANJI_BASE_INDEX = 0; // 갑자(甲子) = 0번 인덱스

// 한자 → 한글 변환
export const CHINESE_TO_KOREAN_MAP: Record<string, string> = {
  // 천간
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
  
  // 지지
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
  '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해',
  
  // 오행
  '木': '목', '火': '화', '土': '토', '金': '금', '水': '수',
  
  // 신살
  '天乙貴人': '천을귀인',
  '文昌貴人': '문창귀인',
  '天德貴人': '천덕귀인',
  '月德貴人': '월덕귀인',
  
  // 12신살
  '長生': '장생', '沐浴': '목욕', '冠帶': '관대', '臨官': '임관',
  '帝旺': '제왕', '衰': '쇠', '病': '병', '死': '사',
  '墓': '묘', '絶': '절', '胎': '태', '養': '양',
  
  // 공망
  '空亡': '공망'
};

// 한글 → 한자 변환
export const KOREAN_TO_CHINESE_MAP: Record<string, string> = {
  // 천간
  '갑': '甲', '을': '乙', '병': '丙', '정': '丁', '무': '戊',
  '기': '己', '경': '庚', '신': '辛', '임': '壬', '계': '癸',
  
  // 지지
  '자': '子', '축': '丑', '인': '寅', '묘': '卯', '진': '辰', '사': '巳',
  '오': '午', '미': '未', '신': '申', '유': '酉', '술': '戌', '해': '亥',
  
  // 오행
  '목': '木', '화': '火', '토': '土', '금': '金', '수': '水',
  
  // 신살
  '천을귀인': '天乙貴人',
  '문창귀인': '文昌貴人',
  '천덕귀인': '天德貴人',
  '월덕귀인': '月德貴人',
  
  // 12신살
  '장생': '長生', '목욕': '沐浴', '관대': '冠帶', '임관': '臨官',
  '제왕': '帝旺', '쇠': '衰', '병': '病', '사': '死',
  '묘': '墓', '절': '絶', '태': '胎', '양': '養',
  
  // 공망
  '공망': '空亡'
};

// 기본 그룹 상수
export const DEFAULT_GROUPS = ["친구", "가족", "지인", "회사"] as const;

// 오행 타입
export type WuXing = "목" | "화" | "토" | "금" | "수";

// 사주 정보 타입
export interface SajuInfo {
  year: { sky: string; earth: string };
  month: { sky: string; earth: string };
  day: { sky: string; earth: string };
  hour: { sky: string; earth: string };
  wuxing: {
    yearSky: WuXing;
    yearEarth: WuXing;
    monthSky: WuXing;
    monthEarth: WuXing;
    daySky: WuXing;
    dayEarth: WuXing;
    hourSky: WuXing;
    hourEarth: WuXing;
  };
}

// 운세 계산 결과 저장 테이블
export const fortuneResults = pgTable("fortune_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sajuRecordId: varchar("saju_record_id").notNull().references(() => sajuRecords.id),
  
  // 대운 정보
  daeunNumber: integer("daeun_number").notNull(), // 대운수 (1-10)
  daeunDirection: text("daeun_direction").notNull(), // "순행" | "역행"
  daeunStartAge: integer("daeun_start_age").notNull(), // 대운 시작 나이
  
  // 대운 간지 배열 (JSON 저장)
  daeunList: text("daeun_list").notNull(), // JSON string of DaeunSegment[]
  
  // 세운 정보 
  saeunStartYear: integer("saeun_start_year").notNull(), // 세운 시작년도
  
  // 월운 정보는 실시간 계산하므로 저장하지 않음
  
  // 계산 메타데이터
  calculationDate: timestamp("calculation_date").defaultNow(),
  algorithmVersion: text("algorithm_version").notNull().default("1.0"),
  
  // 메타데이터
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 기존 사용자 스키마 유지
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// 음양력 변환 데이터 테이블
export const lunarSolarCalendar = pgTable("lunar_solar_calendar", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 양력 날짜
  solYear: integer("sol_year").notNull(),
  solMonth: integer("sol_month").notNull(),
  solDay: integer("sol_day").notNull(),
  
  // 음력 날짜  
  lunYear: integer("lun_year").notNull(),
  lunMonth: integer("lun_month").notNull(),
  lunDay: integer("lun_day").notNull(),
  
  // 음력 세부 정보
  lunLeapMonth: text("lun_leap_month"), // 윤달 여부 ("평" | "윤")
  lunWolban: text("lun_wolban"), // 요일
  lunSecha: text("lun_secha"), // 세차(간지)
  lunGanjea: text("lun_ganjea"), // 월 간지
  lunMonthDayCount: integer("lun_month_day_count"), // 음력 월 일수
  
  // 양력 세부 정보
  solSecha: text("sol_secha"), // 세차
  solJeongja: text("sol_jeongja"), // 일진
  
  // 율리우스 적일
  julianDay: integer("julian_day"),
  
  // 메타데이터
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLunarSolarCalendarSchema = createInsertSchema(lunarSolarCalendar).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLunarSolarCalendar = z.infer<typeof insertLunarSolarCalendarSchema>;
export type LunarSolarCalendar = typeof lunarSolarCalendar.$inferSelect;

// 대운 세그먼트 타입
export interface DaeunSegment {
  startAge: number; // 시작 나이
  endAge: number; // 끝 나이  
  sky: string; // 천간
  earth: string; // 지지
  period: string; // 기간 표시 (예: "6-15세")
}

// 세운 정보 타입
export interface SaeunInfo {
  year: number; // 년도
  age: number; // 나이
  sky: string; // 천간
  earth: string; // 지지
}

// 월운 정보 타입
export interface WolunInfo {
  month: number; // 월
  sky: string; // 천간
  earth: string; // 지지
  period: string; // 기간 (예: "2025년 1월")
}

// 운세 계산 결과 전체 타입
export interface FortuneCalculationResult {
  daeunNumber: number; // 대운수
  daeunDirection: "순행" | "역행"; // 대운 방향
  daeunStartAge: number; // 대운 시작 나이
  daeunList: DaeunSegment[]; // 대운 목록
  saeunStartYear: number; // 세운 시작년도
  calculationDate: Date; // 계산 일시
  algorithmVersion: string; // 알고리즘 버전
}

// 운세 계산 결과 스키마
export const insertFortuneResultSchema = createInsertSchema(fortuneResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFortuneResult = z.infer<typeof insertFortuneResultSchema>;
export type FortuneResult = typeof fortuneResults.$inferSelect;

// API 응답 타입 정의
export interface DataGovKrLunarResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: {
        item: {
          lunYear: string;
          lunMonth: string;
          lunDay: string;
          lunLeapMonth: string;
          lunWolban: string;
          lunSecha: string;
          lunGanjea?: string;
          lunMonthDayCount?: string;
          solYear: string;
          solMonth: string;
          solDay: string;
          solSecha?: string;
          solJeongja?: string;
          julianDay?: string;
        };
      };
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

export interface DataGovKrSolarResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: {
        item: {
          lunYear: string;
          lunMonth: string;
          lunDay: string;
          lunLeapMonth: string;
          lunWolban: string;
          lunSecha: string;
          solYear: string;
          solMonth: string;
          solDay: string;
          solSecha?: string;
          solJeongja?: string;
          julianDay?: string;
        };
      };
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

// 운세 API 요청 검증 스키마
export const preciseDeaunNumberRequestSchema = z.object({
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "올바른 날짜 형식이어야 합니다"
  }),
  gender: z.enum(["남자", "여자"], {
    errorMap: () => ({ message: "성별은 '남자' 또는 '여자'여야 합니다" })
  }),
  yearSky: z.enum(CHEONGAN, {
    errorMap: () => ({ message: "올바른 천간이어야 합니다" })
  })
});

export const fortuneCalculateRequestSchema = z.object({
  saju: z.object({
    year: z.object({
      sky: z.enum(CHEONGAN),
      earth: z.enum(JIJI)
    }),
    month: z.object({
      sky: z.enum(CHEONGAN),
      earth: z.enum(JIJI)
    }),
    day: z.object({
      sky: z.enum(CHEONGAN),
      earth: z.enum(JIJI)
    }),
    hour: z.object({
      sky: z.enum(CHEONGAN),
      earth: z.enum(JIJI)
    })
  }),
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "올바른 날짜 형식이어야 합니다"
  }),
  gender: z.enum(["남자", "여자"], {
    errorMap: () => ({ message: "성별은 '남자' 또는 '여자'여야 합니다" })
  })
});

export const fortuneSaveRequestSchema = z.object({
  sajuRecordId: z.string().min(1, "사주 기록 ID는 필수입니다"),
  fortuneData: z.object({
    daeunNumber: z.number().int().min(1).max(10),
    daeunDirection: z.enum(["순행", "역행"]),
    daeunStartAge: z.number().int().min(1),
    daeunList: z.array(z.object({
      startAge: z.number().int().min(1),
      endAge: z.number().int().min(1),
      ganji: z.object({
        sky: z.enum(CHEONGAN),
        earth: z.enum(JIJI)
      })
    })),
    saeunStartYear: z.number().int(),
    calculationDate: z.string().refine((date) => !isNaN(Date.parse(date))),
    algorithmVersion: z.string().min(1)
  })
});

export type PreciseDeaunNumberRequest = z.infer<typeof preciseDeaunNumberRequestSchema>;
export type FortuneCalculateRequest = z.infer<typeof fortuneCalculateRequestSchema>;
export type FortuneSaveRequest = z.infer<typeof fortuneSaveRequestSchema>;