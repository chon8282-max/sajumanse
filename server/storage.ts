import { 
  users, 
  manseRyeok, 
  sajuRecords,
  groups,
  lunarSolarCalendar,
  fortuneResults,
  type User, 
  type UpsertUser,
  type InsertUser, 
  type ManseRyeok, 
  type InsertManseRyeok,
  type SajuRecord,
  type InsertSajuRecord,
  type Group,
  type InsertGroup,
  type LunarSolarCalendar,
  type InsertLunarSolarCalendar,
  type FortuneResult,
  type InsertFortuneResult,
  DEFAULT_GROUPS
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

// 만세력 데이터를 위한 스토리지 인터페이스 확장
export interface IStorage {
  // 사용자 관련 (Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // 만세력 관련 (기존 호환성)
  getManseRyeok(id: string): Promise<ManseRyeok | undefined>;
  getManseRyeoksByUser(userId?: string): Promise<ManseRyeok[]>;
  createManseRyeok(data: InsertManseRyeok): Promise<ManseRyeok>;
  deleteManseRyeok(id: string): Promise<boolean>;
  
  // 사주 기록 관련 (새로운 스키마)
  getSajuRecord(id: string): Promise<SajuRecord | undefined>;
  getSajuRecords(limit?: number, searchText?: string, groupId?: string): Promise<SajuRecord[]>;
  createSajuRecord(data: InsertSajuRecord): Promise<SajuRecord>;
  updateSajuRecord(id: string, data: Partial<SajuRecord>): Promise<SajuRecord | undefined>;
  deleteSajuRecord(id: string): Promise<boolean>;
  
  // 그룹 관련
  getGroups(): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  createGroup(data: InsertGroup): Promise<Group>;
  updateGroup(id: string, data: Partial<Group>): Promise<Group | undefined>;
  deleteGroup(id: string): Promise<boolean>;
  initializeDefaultGroups(): Promise<void>;
  
  // 음양력 변환 데이터 관련
  getLunarSolarData(solYear: number, solMonth: number, solDay: number): Promise<LunarSolarCalendar | undefined>;
  createLunarSolarData(data: InsertLunarSolarCalendar): Promise<LunarSolarCalendar>;
  bulkCreateLunarSolarData(dataList: InsertLunarSolarCalendar[]): Promise<LunarSolarCalendar[]>;
  getLunarSolarDataRange(startYear: number, endYear: number): Promise<LunarSolarCalendar[]>;
  checkDataExists(year: number): Promise<boolean>;
  
  // 운세 계산 결과 관련
  saveFortuneResult(data: InsertFortuneResult): Promise<FortuneResult>;
  getFortuneResult(sajuRecordId: string): Promise<FortuneResult | undefined>;
  deleteFortuneResult(id: string): Promise<boolean>;
  
  // 백업/복원 관련
  exportAllData(): Promise<{
    sajuRecords: SajuRecord[];
    groups: Group[];
    fortuneResults: FortuneResult[];
    version: string;
    exportDate: string;
  }>;
  importAllData(data: {
    sajuRecords?: SajuRecord[];
    groups?: Group[];
    fortuneResults?: FortuneResult[];
  }): Promise<{
    imported: number;
    errors: string[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // 사용자 관련 메서드 (Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
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

  // 사주 기록 관련 메서드
  async getSajuRecord(id: string): Promise<SajuRecord | undefined> {
    const [record] = await db.select().from(sajuRecords).where(eq(sajuRecords.id, id));
    return record || undefined;
  }

  async getSajuRecords(
    limit: number = 50, 
    searchText?: string, 
    groupId?: string
  ): Promise<SajuRecord[]> {
    // 조건별로 직접 쿼리 생성
    if (searchText && groupId) {
      // 검색과 그룹 둘 다 있을 때
      return await db.select().from(sajuRecords)
        .where(and(
          sql`${sajuRecords.name} ILIKE ${'%' + searchText + '%'}`,
          eq(sajuRecords.groupId, groupId)
        ))
        .limit(limit);
    } else if (searchText) {
      // 검색만 있을 때
      return await db.select().from(sajuRecords)
        .where(sql`${sajuRecords.name} ILIKE ${'%' + searchText + '%'}`)
        .limit(limit);
    } else if (groupId) {
      // 그룹만 있을 때
      return await db.select().from(sajuRecords)
        .where(eq(sajuRecords.groupId, groupId))
        .limit(limit);
    } else {
      // 아무 조건도 없을 때
      return await db.select().from(sajuRecords).limit(limit);
    }
  }

  async createSajuRecord(data: InsertSajuRecord): Promise<SajuRecord> {
    const [result] = await db
      .insert(sajuRecords)
      .values(data)
      .returning();
    return result;
  }

  async updateSajuRecord(id: string, data: Partial<SajuRecord>): Promise<SajuRecord | undefined> {
    try {
      const [result] = await db
        .update(sajuRecords)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(sajuRecords.id, id))
        .returning();
      return result || undefined;
    } catch (error) {
      console.error('Update saju record error:', error);
      return undefined;
    }
  }

  async deleteSajuRecord(id: string): Promise<boolean> {
    try {
      await db.delete(sajuRecords).where(eq(sajuRecords.id, id));
      return true;
    } catch (error) {
      console.error('Delete saju record error:', error);
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

  // 그룹 관련 메서드
  async getGroups(): Promise<Group[]> {
    const results = await db.select().from(groups);
    return results;
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group || undefined;
  }

  async createGroup(data: InsertGroup): Promise<Group> {
    const [result] = await db
      .insert(groups)
      .values(data)
      .returning();
    return result;
  }

  async updateGroup(id: string, data: Partial<Group>): Promise<Group | undefined> {
    try {
      const [result] = await db
        .update(groups)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(groups.id, id))
        .returning();
      return result || undefined;
    } catch (error) {
      console.error('Update group error:', error);
      return undefined;
    }
  }

  async deleteGroup(id: string): Promise<boolean> {
    try {
      // 기본 그룹은 삭제할 수 없음
      const [group] = await db.select().from(groups).where(eq(groups.id, id));
      if (group?.isDefault) {
        return false;
      }
      
      await db.delete(groups).where(eq(groups.id, id));
      return true;
    } catch (error) {
      console.error('Delete group error:', error);
      return false;
    }
  }

  async initializeDefaultGroups(): Promise<void> {
    try {
      // 기본 그룹이 없으면 생성
      const existingGroups = await this.getGroups();
      const existingNames = existingGroups.map(g => g.name);
      
      const missingGroups = DEFAULT_GROUPS.filter(name => !existingNames.includes(name));
      
      if (missingGroups.length > 0) {
        const defaultGroupsData = missingGroups.map(name => ({
          name,
          isDefault: true,
        }));
        
        await db.insert(groups).values(defaultGroupsData);
      }
    } catch (error) {
      console.error('Initialize default groups error:', error);
    }
  }

  // 운세 계산 결과 관련 메서드
  async saveFortuneResult(data: InsertFortuneResult): Promise<FortuneResult> {
    const [result] = await db
      .insert(fortuneResults)
      .values(data)
      .returning();
    return result;
  }

  async getFortuneResult(sajuRecordId: string): Promise<FortuneResult | undefined> {
    const [result] = await db
      .select()
      .from(fortuneResults)
      .where(eq(fortuneResults.sajuRecordId, sajuRecordId));
    return result || undefined;
  }

  async deleteFortuneResult(id: string): Promise<boolean> {
    try {
      await db.delete(fortuneResults).where(eq(fortuneResults.id, id));
      return true;
    } catch (error) {
      console.error('Delete fortune result error:', error);
      return false;
    }
  }

  // 백업/복원 관련 메서드
  async exportAllData(): Promise<{
    sajuRecords: SajuRecord[];
    groups: Group[];
    fortuneResults: FortuneResult[];
    version: string;
    exportDate: string;
  }> {
    const [allSajuRecords, allGroups, allFortuneResults] = await Promise.all([
      db.select().from(sajuRecords),
      db.select().from(groups),
      db.select().from(fortuneResults),
    ]);

    return {
      sajuRecords: allSajuRecords,
      groups: allGroups,
      fortuneResults: allFortuneResults,
      version: "1.0",
      exportDate: new Date().toISOString(),
    };
  }

  async importAllData(data: {
    sajuRecords?: SajuRecord[];
    groups?: Group[];
    fortuneResults?: FortuneResult[];
  }): Promise<{
    imported: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let imported = 0;

    // Date 변환 헬퍼 함수 (null/undefined는 그대로 유지)
    const parseDate = (dateStr: any): Date | null => {
      if (dateStr === null || dateStr === undefined) return null;
      if (dateStr instanceof Date) return dateStr;
      return new Date(dateStr);
    };

    // 트랜잭션으로 전체 import 과정 감싸기
    await db.transaction(async (tx) => {
      try {
        // 그룹 먼저 import (외래 키 의존성)
        if (data.groups && data.groups.length > 0) {
          const groupsToInsert = data.groups.map(g => ({
            id: g.id,
            name: g.name,
            isDefault: g.isDefault ?? false,
            createdAt: parseDate(g.createdAt),
            updatedAt: parseDate(g.updatedAt),
          }));
          
          const result = await tx.insert(groups).values(groupsToInsert)
            .onConflictDoUpdate({
              target: groups.id,
              set: {
                name: sql`EXCLUDED.name`,
                isDefault: sql`EXCLUDED.is_default`,
                updatedAt: sql`EXCLUDED.updated_at`,
              }
            })
            .returning({ id: groups.id });
          imported += result.length;
        }

        // 사주 기록 배치 import (100개씩)
        if (data.sajuRecords && data.sajuRecords.length > 0) {
          const batchSize = 100;
          for (let i = 0; i < data.sajuRecords.length; i += batchSize) {
            const batch = data.sajuRecords.slice(i, i + batchSize).map(r => ({
              ...r,
              createdAt: parseDate(r.createdAt),
              updatedAt: parseDate(r.updatedAt),
            }));
            const result = await tx.insert(sajuRecords).values(batch)
              .onConflictDoUpdate({
                target: sajuRecords.id,
                set: {
                  name: sql`EXCLUDED.name`,
                  birthYear: sql`EXCLUDED.birth_year`,
                  birthMonth: sql`EXCLUDED.birth_month`,
                  birthDay: sql`EXCLUDED.birth_day`,
                  birthTime: sql`EXCLUDED.birth_time`,
                  calendarType: sql`EXCLUDED.calendar_type`,
                  gender: sql`EXCLUDED.gender`,
                  groupId: sql`EXCLUDED.group_id`,
                  memo: sql`EXCLUDED.memo`,
                  lunarYear: sql`EXCLUDED.lunar_year`,
                  lunarMonth: sql`EXCLUDED.lunar_month`,
                  lunarDay: sql`EXCLUDED.lunar_day`,
                  isLeapMonth: sql`EXCLUDED.is_leap_month`,
                  yearSky: sql`EXCLUDED.year_sky`,
                  yearEarth: sql`EXCLUDED.year_earth`,
                  monthSky: sql`EXCLUDED.month_sky`,
                  monthEarth: sql`EXCLUDED.month_earth`,
                  daySky: sql`EXCLUDED.day_sky`,
                  dayEarth: sql`EXCLUDED.day_earth`,
                  hourSky: sql`EXCLUDED.hour_sky`,
                  hourEarth: sql`EXCLUDED.hour_earth`,
                  updatedAt: sql`EXCLUDED.updated_at`,
                }
              })
              .returning({ id: sajuRecords.id });
            imported += result.length;
          }
        }

        // 운세 결과 배치 import (100개씩)
        if (data.fortuneResults && data.fortuneResults.length > 0) {
          const batchSize = 100;
          for (let i = 0; i < data.fortuneResults.length; i += batchSize) {
            const batch = data.fortuneResults.slice(i, i + batchSize).map(r => ({
              ...r,
              calculationDate: parseDate(r.calculationDate),
              createdAt: parseDate(r.createdAt),
              updatedAt: parseDate(r.updatedAt),
            }));
            const result = await tx.insert(fortuneResults).values(batch)
              .onConflictDoUpdate({
                target: fortuneResults.id,
                set: {
                  sajuRecordId: sql`EXCLUDED.saju_record_id`,
                  daeunNumber: sql`EXCLUDED.daeun_number`,
                  daeunDirection: sql`EXCLUDED.daeun_direction`,
                  daeunStartAge: sql`EXCLUDED.daeun_start_age`,
                  daeunList: sql`EXCLUDED.daeun_list`,
                  saeunStartYear: sql`EXCLUDED.saeun_start_year`,
                  calculationDate: sql`EXCLUDED.calculation_date`,
                  algorithmVersion: sql`EXCLUDED.algorithm_version`,
                  updatedAt: sql`EXCLUDED.updated_at`,
                }
              })
              .returning({ id: fortuneResults.id });
            imported += result.length;
          }
        }
      } catch (error) {
        errors.push(`Import failed: ${error}`);
        throw error; // 트랜잭션 롤백
      }
    });

    return { imported, errors };
  }
}

// 메모리 스토리지 (개발용 백업)
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private manseRyeoks: Map<string, ManseRyeok>;
  private sajuRecords: Map<string, SajuRecord>;
  private groups: Map<string, Group>;
  private lunarSolarData: Map<string, LunarSolarCalendar>;
  private fortuneResults: Map<string, FortuneResult>;

  constructor() {
    this.users = new Map();
    this.manseRyeoks = new Map();
    this.sajuRecords = new Map();
    this.groups = new Map();
    this.lunarSolarData = new Map();
    this.fortuneResults = new Map();
    
    // 기본 그룹 초기화
    this.initializeDefaultGroups();
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

  // 사주 기록 관련 메서드 (메모리 버전)
  async getSajuRecord(id: string): Promise<SajuRecord | undefined> {
    return this.sajuRecords.get(id);
  }

  async getSajuRecords(
    limit: number = 50, 
    searchText?: string, 
    groupId?: string
  ): Promise<SajuRecord[]> {
    let records = Array.from(this.sajuRecords.values());
    
    // 검색 텍스트 필터링 (이름으로 검색)
    if (searchText) {
      records = records.filter(record => 
        record.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    // 그룹 ID 필터링
    if (groupId) {
      records = records.filter(record => record.groupId === groupId);
    }
    
    return records.slice(0, limit);
  }

  async createSajuRecord(data: InsertSajuRecord): Promise<SajuRecord> {
    const id = randomUUID();
    const now = new Date();
    const record: SajuRecord = {
      id,
      name: data.name ?? "이름없음",
      birthYear: data.birthYear,
      birthMonth: data.birthMonth ?? null,
      birthDay: data.birthDay ?? null,
      birthTime: data.birthTime ?? null,
      calendarType: data.calendarType ?? "양력",
      gender: data.gender,
      groupId: data.groupId ?? null,
      group: data.group ?? null,
      memo: data.memo ?? null,
      lunarYear: data.lunarYear ?? null,
      lunarMonth: data.lunarMonth ?? null,
      lunarDay: data.lunarDay ?? null,
      isLeapMonth: data.isLeapMonth ?? false,
      yearSky: null,
      yearEarth: null,
      monthSky: null,
      monthEarth: null,
      daySky: null,
      dayEarth: null,
      hourSky: null,
      hourEarth: null,
      createdAt: now,
      updatedAt: now,
    };
    this.sajuRecords.set(id, record);
    return record;
  }

  async updateSajuRecord(id: string, data: Partial<SajuRecord>): Promise<SajuRecord | undefined> {
    const existing = this.sajuRecords.get(id);
    if (!existing) return undefined;
    
    const updated: SajuRecord = {
      ...existing,
      ...data,
      id: existing.id, // ID는 변경되지 않도록
      updatedAt: new Date(),
    };
    this.sajuRecords.set(id, updated);
    return updated;
  }

  async deleteSajuRecord(id: string): Promise<boolean> {
    return this.sajuRecords.delete(id);
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

  // 그룹 관련 메서드 (메모리 버전)
  async getGroups(): Promise<Group[]> {
    return Array.from(this.groups.values());
  }

  async getGroup(id: string): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async createGroup(data: InsertGroup): Promise<Group> {
    const id = randomUUID();
    const now = new Date();
    const group: Group = {
      id,
      name: data.name,
      isDefault: data.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.groups.set(id, group);
    return group;
  }

  async updateGroup(id: string, data: Partial<Group>): Promise<Group | undefined> {
    const existing = this.groups.get(id);
    if (!existing) return undefined;
    
    const updated: Group = {
      ...existing,
      ...data,
      id: existing.id, // ID는 변경되지 않도록
      updatedAt: new Date(),
    };
    this.groups.set(id, updated);
    return updated;
  }

  async deleteGroup(id: string): Promise<boolean> {
    const group = this.groups.get(id);
    if (group?.isDefault) {
      return false; // 기본 그룹은 삭제할 수 없음
    }
    return this.groups.delete(id);
  }

  async initializeDefaultGroups(): Promise<void> {
    // 기본 그룹이 없으면 생성
    const existingGroups = await this.getGroups();
    const existingNames = existingGroups.map(g => g.name);
    
    const missingGroups = DEFAULT_GROUPS.filter(name => !existingNames.includes(name));
    
    for (const groupName of missingGroups) {
      await this.createGroup({
        name: groupName,
        isDefault: true,
      });
    }
  }

  // 운세 계산 결과 관련 메서드
  async saveFortuneResult(data: InsertFortuneResult): Promise<FortuneResult> {
    const id = randomUUID();
    const now = new Date();
    const fortuneResult: FortuneResult = {
      id,
      sajuRecordId: data.sajuRecordId,
      daeunNumber: data.daeunNumber,
      daeunDirection: data.daeunDirection,
      daeunStartAge: data.daeunStartAge,
      daeunList: data.daeunList,
      saeunStartYear: data.saeunStartYear,
      calculationDate: data.calculationDate ?? now,
      algorithmVersion: data.algorithmVersion ?? "1.0",
      createdAt: now,
      updatedAt: now,
    };
    this.fortuneResults.set(id, fortuneResult);
    return fortuneResult;
  }

  async getFortuneResult(sajuRecordId: string): Promise<FortuneResult | undefined> {
    return Array.from(this.fortuneResults.values()).find(
      (result) => result.sajuRecordId === sajuRecordId
    );
  }

  async deleteFortuneResult(id: string): Promise<boolean> {
    return this.fortuneResults.delete(id);
  }

  // 백업/복원 관련 메서드
  async exportAllData(): Promise<{
    sajuRecords: SajuRecord[];
    groups: Group[];
    fortuneResults: FortuneResult[];
    version: string;
    exportDate: string;
  }> {
    return {
      sajuRecords: Array.from(this.sajuRecords.values()),
      groups: Array.from(this.groups.values()),
      fortuneResults: Array.from(this.fortuneResults.values()),
      version: "1.0",
      exportDate: new Date().toISOString(),
    };
  }

  async importAllData(data: {
    sajuRecords?: SajuRecord[];
    groups?: Group[];
    fortuneResults?: FortuneResult[];
  }): Promise<{
    imported: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      // 그룹 먼저 import
      if (data.groups && data.groups.length > 0) {
        for (const group of data.groups) {
          if (!this.groups.has(group.id)) {
            this.groups.set(group.id, group);
            imported++;
          }
        }
      }

      // 사주 기록 import
      if (data.sajuRecords && data.sajuRecords.length > 0) {
        for (const record of data.sajuRecords) {
          if (!this.sajuRecords.has(record.id)) {
            this.sajuRecords.set(record.id, record);
            imported++;
          }
        }
      }

      // 운세 결과 import
      if (data.fortuneResults && data.fortuneResults.length > 0) {
        for (const result of data.fortuneResults) {
          if (!this.fortuneResults.has(result.id)) {
            this.fortuneResults.set(result.id, result);
            imported++;
          }
        }
      }

      return { imported, errors };
    } catch (error) {
      errors.push(`Import failed: ${error}`);
      return { imported, errors };
    }
  }
}

// 데이터베이스 연결 실패 시 메모리 스토리지로 폴백
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
