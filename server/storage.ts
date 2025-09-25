import { users, manseRyeok, type User, type InsertUser, type ManseRyeok, type InsertManseRyeok } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
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
}

// 메모리 스토리지 (개발용 백업)
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private manseRyeoks: Map<string, ManseRyeok>;

  constructor() {
    this.users = new Map();
    this.manseRyeoks = new Map();
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
}

// 데이터베이스 연결 실패 시 메모리 스토리지로 폴백
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
