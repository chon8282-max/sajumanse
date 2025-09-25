import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date } from "drizzle-orm/pg-core";
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
export const CHEONGAN = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
export const JIJI = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;

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