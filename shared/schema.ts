import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 만세력 데이터 모델
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