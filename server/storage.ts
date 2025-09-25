import { 
  users, 
  manseRyeok, 
  lunarSolarCalendar,
  type User, 
  type InsertUser, 
  type ManseRyeok, 
  type InsertManseRyeok,
  type LunarSolarCalendar,
  type InsertLunarSolarCalendar
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, count } from "drizzle-orm";
import { randomUUID } from "crypto";

// 만세력 데이터를 위한 스토리지 인터페이스 확장
export interface IStorage {
  // 사용자 관련
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // 만세력 관련
  getManseRyeok(id: string): Promise<ManseRyeok | undefined>;
  getManseRyeoksByUser(userId?: string): Promise<ManseRyeok[]>;
  createManseRyeok(data: InsertManseRyeok): Promise<ManseRyeok>;
  deleteManseRyeok(id: string): Promise<boolean>;
  
  // 음양력 변환 데이터 관련
  getLunarSolarData(solYear: number, solMonth: number, solDay: number): Promise<LunarSolarCalendar | undefined>;
  createLunarSolarData(data: InsertLunarSolarCalendar): Promise<LunarSolarCalendar>;
  bulkCreateLunarSolarData(dataList: InsertLunarSolarCalendar[]): Promise<LunarSolarCalendar[]>;
  getLunarSolarDataRange(startYear: number, endYear: number): Promise<LunarSolarCalendar[]>;
  checkDataExists(year: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // 사용자 관련 메서드
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // 만세력 관련 메서드
  async getManseRyeok(id: string): Promise<ManseRyeok | undefined> {
    const [manse] = await db.select().from(manseRyeok).where(eq(manseRyeok.id, id));
    return manse || undefined;
  }

  async getManseRyeoksByUser(userId?: string): Promise<ManseRyeok[]> {
    // 현재는 userId 없이 모든 만세력 데이터 조회 (추후 사용자별 필터링 가능)
    const results = await db.select().from(manseRyeok).limit(50);
    return results;
  }

  async createManseRyeok(data: any): Promise<ManseRyeok> {
    // API에서 계산된 사주팔자 값을 그대로 저장
    const id = randomUUID();
    const manseData: ManseRyeok = {
      id,
      birthYear: data.birthYear,
      birthMonth: data.birthMonth, 
      birthDay: data.birthDay,
      birthHour: data.birthHour,
      isLunar: data.isLunar || "false",
      gender: data.gender,
      // 계산된 사주팔자 값 사용
      yearSky: data.yearSky,
      yearEarth: data.yearEarth,
      monthSky: data.monthSky,
      monthEarth: data.monthEarth,
      daySky: data.daySky,
      dayEarth: data.dayEarth,
      hourSky: data.hourSky,
      hourEarth: data.hourEarth
    };

    const [result] = await db
      .insert(manseRyeok)
      .values(manseData)
      .returning();
    return result;
  }

  async deleteManseRyeok(id: string): Promise<boolean> {
    try {
      await db.delete(manseRyeok).where(eq(manseRyeok.id, id));
      return true;
    } catch (error) {
      console.error('Delete manseRyeok error:', error);
      return false;
    }
  }

  // 음양력 변환 데이터 관련 메서드
  async getLunarSolarData(solYear: number, solMonth: number, solDay: number): Promise<LunarSolarCalendar | undefined> {
    const [data] = await db
      .select()
      .from(lunarSolarCalendar)
      .where(
        and(
          eq(lunarSolarCalendar.solYear, solYear),
          eq(lunarSolarCalendar.solMonth, solMonth),
          eq(lunarSolarCalendar.solDay, solDay)
        )
      );
    return data || undefined;
  }

  async createLunarSolarData(data: InsertLunarSolarCalendar): Promise<LunarSolarCalendar> {
    const [result] = await db
      .insert(lunarSolarCalendar)
      .values(data)
      .returning();
    return result;
  }

  async bulkCreateLunarSolarData(dataList: InsertLunarSolarCalendar[]): Promise<LunarSolarCalendar[]> {
    if (dataList.length === 0) return [];
    
    const results = await db
      .insert(lunarSolarCalendar)
      .values(dataList)
      .returning();
    return results;
  }

  async getLunarSolarDataRange(startYear: number, endYear: number): Promise<LunarSolarCalendar[]> {
    const results = await db
      .select()
      .from(lunarSolarCalendar)
      .where(
        and(
          gte(lunarSolarCalendar.solYear, startYear),
          lte(lunarSolarCalendar.solYear, endYear)
        )
      );
    return results;
  }

  async checkDataExists(year: number): Promise<boolean> {
    const [result] = await db
      .select({ count: count() })
      .from(lunarSolarCalendar)
      .where(eq(lunarSolarCalendar.solYear, year))
      .limit(1);
    return result ? result.count > 0 : false;
  }
}

// 메모리 스토리지 (개발용 백업)
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private manseRyeoks: Map<string, ManseRyeok>;
  private lunarSolarData: Map<string, LunarSolarCalendar>;

  constructor() {
    this.users = new Map();
    this.manseRyeoks = new Map();
    this.lunarSolarData = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getManseRyeok(id: string): Promise<ManseRyeok | undefined> {
    return this.manseRyeoks.get(id);
  }

  async getManseRyeoksByUser(userId?: string): Promise<ManseRyeok[]> {
    return Array.from(this.manseRyeoks.values());
  }

  async createManseRyeok(data: any): Promise<ManseRyeok> {
    const id = randomUUID();
    const manseData: ManseRyeok = {
      id,
      birthYear: data.birthYear,
      birthMonth: data.birthMonth,
      birthDay: data.birthDay,
      birthHour: data.birthHour,
      isLunar: data.isLunar || "false",
      gender: data.gender,
      // 계산된 사주팔자 값 사용
      yearSky: data.yearSky,
      yearEarth: data.yearEarth,
      monthSky: data.monthSky,
      monthEarth: data.monthEarth,
      daySky: data.daySky,
      dayEarth: data.dayEarth,
      hourSky: data.hourSky,
      hourEarth: data.hourEarth
    };
    this.manseRyeoks.set(id, manseData);
    return manseData;
  }

  async deleteManseRyeok(id: string): Promise<boolean> {
    return this.manseRyeoks.delete(id);
  }

  // 음양력 변환 데이터 관련 메서드 (메모리 버전)
  private generateKey(solYear: number, solMonth: number, solDay: number): string {
    return `${solYear}-${solMonth.toString().padStart(2, '0')}-${solDay.toString().padStart(2, '0')}`;
  }

  async getLunarSolarData(solYear: number, solMonth: number, solDay: number): Promise<LunarSolarCalendar | undefined> {
    const key = this.generateKey(solYear, solMonth, solDay);
    return this.lunarSolarData.get(key);
  }

  async createLunarSolarData(data: InsertLunarSolarCalendar): Promise<LunarSolarCalendar> {
    const id = randomUUID();
    const lunarData: LunarSolarCalendar = {
      id,
      ...data,
      lunLeapMonth: data.lunLeapMonth ?? null,
      lunWolban: data.lunWolban ?? null,
      lunSecha: data.lunSecha ?? null,
      lunGanjea: data.lunGanjea ?? null,
      lunMonthDayCount: data.lunMonthDayCount ?? null,
      solSecha: data.solSecha ?? null,
      solJeongja: data.solJeongja ?? null,
      julianDay: data.julianDay ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const key = this.generateKey(data.solYear, data.solMonth, data.solDay);
    this.lunarSolarData.set(key, lunarData);
    return lunarData;
  }

  async bulkCreateLunarSolarData(dataList: InsertLunarSolarCalendar[]): Promise<LunarSolarCalendar[]> {
    const results: LunarSolarCalendar[] = [];
    
    for (const data of dataList) {
      const created = await this.createLunarSolarData(data);
      results.push(created);
    }
    
    return results;
  }

  async getLunarSolarDataRange(startYear: number, endYear: number): Promise<LunarSolarCalendar[]> {
    return Array.from(this.lunarSolarData.values()).filter(
      data => data.solYear >= startYear && data.solYear <= endYear
    );
  }

  async checkDataExists(year: number): Promise<boolean> {
    return Array.from(this.lunarSolarData.values()).some(
      data => data.solYear === year
    );
  }
}

// 데이터베이스 연결 실패 시 메모리 스토리지로 폴백
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
