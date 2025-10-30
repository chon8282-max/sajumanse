import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { SajuRecord, Group, InsertSajuRecord, InsertGroup, FortuneResult, InsertFortuneResult } from '@shared/schema';

// Re-export FortuneResult for external use
export type { FortuneResult };

// IndexedDB 스키마 정의
interface SajuDB extends DBSchema {
  sajuRecords: {
    key: string;
    value: SajuRecord;
    indexes: {
      'by-created': Date;
      'by-name': string;
      'by-group': string;
    };
  };
  groups: {
    key: string;
    value: Group;
    indexes: {
      'by-name': string;
    };
  };
  fortuneResults: {
    key: string;
    value: FortuneResult;
    indexes: {
      'by-saju': string;
    };
  };
}

// UUID 생성 함수 (클라이언트용)
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 기본 그룹 데이터
const DEFAULT_GROUPS = [
  { name: "기본", isDefault: true },
  { name: "가족", isDefault: false },
  { name: "친구", isDefault: false },
  { name: "고객", isDefault: false }
];

class SajuLocalStorage {
  private dbPromise: Promise<IDBPDatabase<SajuDB>>;
  private dbName = 'SajuDB';
  private dbVersion = 1;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private async initDB(): Promise<IDBPDatabase<SajuDB>> {
    const db = await openDB<SajuDB>(this.dbName, this.dbVersion, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // SajuRecords store
        if (!db.objectStoreNames.contains('sajuRecords')) {
          const sajuStore = db.createObjectStore('sajuRecords', { keyPath: 'id' });
          sajuStore.createIndex('by-created', 'createdAt');
          sajuStore.createIndex('by-name', 'name');
          sajuStore.createIndex('by-group', 'groupId');
        }

        // Groups store
        if (!db.objectStoreNames.contains('groups')) {
          const groupStore = db.createObjectStore('groups', { keyPath: 'id' });
          groupStore.createIndex('by-name', 'name');
        }

        // FortuneResults store
        if (!db.objectStoreNames.contains('fortuneResults')) {
          const fortuneStore = db.createObjectStore('fortuneResults', { keyPath: 'id' });
          fortuneStore.createIndex('by-saju', 'sajuRecordId');
        }
      },
    });

    // 초기 데이터 설정
    await this.initializeDefaultGroups(db);

    return db;
  }

  private async initializeDefaultGroups(db: IDBPDatabase<SajuDB>) {
    const tx = db.transaction('groups', 'readonly');
    const count = await tx.store.count();
    await tx.done;

    if (count === 0) {
      const writeTx = db.transaction('groups', 'readwrite');
      for (const group of DEFAULT_GROUPS) {
        const groupData: Group = {
          id: generateUUID(),
          name: group.name,
          isDefault: group.isDefault,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await writeTx.store.add(groupData);
      }
      await writeTx.done;
    }
  }

  // === SajuRecord CRUD ===
  
  async getSajuRecord(id: string): Promise<SajuRecord | undefined> {
    const db = await this.dbPromise;
    return await db.get('sajuRecords', id);
  }

  async getSajuRecords(limit?: number, searchText?: string, groupId?: string): Promise<SajuRecord[]> {
    const db = await this.dbPromise;
    let records = await db.getAllFromIndex('sajuRecords', 'by-created');
    
    // 최신순 정렬 (updatedAt 내림차순 - 최근 수정/저장된 사주가 먼저)
    records.sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return bTime - aTime;
    });

    // 검색 필터
    if (searchText) {
      const search = searchText.toLowerCase();
      records = records.filter(r => 
        r.name?.toLowerCase().includes(search) ||
        r.memo?.toLowerCase().includes(search)
      );
    }

    // 그룹 필터
    if (groupId) {
      records = records.filter(r => r.groupId === groupId);
    }

    // 제한
    if (limit && limit > 0) {
      records = records.slice(0, limit);
    }

    return records;
  }

  async createSajuRecord(data: InsertSajuRecord): Promise<SajuRecord> {
    const db = await this.dbPromise;
    const now = new Date();
    
    const record: SajuRecord = {
      id: generateUUID(),
      name: data.name || "이름없음",
      birthYear: data.birthYear,
      birthMonth: data.birthMonth ?? null,
      birthDay: data.birthDay ?? null,
      birthTime: data.birthTime ?? null,
      calendarType: data.calendarType || "양력",
      gender: data.gender,
      groupId: data.groupId ?? null,
      group: data.group ?? null,
      memo: data.memo ?? null,
      lunarYear: data.lunarYear ?? null,
      lunarMonth: data.lunarMonth ?? null,
      lunarDay: data.lunarDay ?? null,
      isLeapMonth: data.isLeapMonth ?? false,
      yearSky: data.yearSky ?? null,
      yearEarth: data.yearEarth ?? null,
      monthSky: data.monthSky ?? null,
      monthEarth: data.monthEarth ?? null,
      daySky: data.daySky ?? null,
      dayEarth: data.dayEarth ?? null,
      hourSky: data.hourSky ?? null,
      hourEarth: data.hourEarth ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await db.add('sajuRecords', record);
    return record;
  }

  async updateSajuRecord(id: string, data: Partial<SajuRecord>): Promise<SajuRecord | undefined> {
    const db = await this.dbPromise;
    const existing = await db.get('sajuRecords', id);
    
    if (!existing) {
      return undefined;
    }

    const updated: SajuRecord = {
      ...existing,
      ...data,
      id, // ID는 변경 불가
      updatedAt: new Date(),
    };

    await db.put('sajuRecords', updated);
    return updated;
  }

  async deleteSajuRecord(id: string): Promise<boolean> {
    const db = await this.dbPromise;
    const existing = await db.get('sajuRecords', id);
    
    if (!existing) {
      return false;
    }

    await db.delete('sajuRecords', id);
    
    // 관련 운세 결과도 삭제
    const fortuneIndex = db.transaction('fortuneResults', 'readwrite').store.index('by-saju');
    const fortunes = await fortuneIndex.getAll(id);
    const deleteTx = db.transaction('fortuneResults', 'readwrite');
    for (const fortune of fortunes) {
      await deleteTx.store.delete(fortune.id);
    }
    await deleteTx.done;

    return true;
  }

  // === Group CRUD ===
  
  async getGroups(): Promise<Group[]> {
    const db = await this.dbPromise;
    return await db.getAll('groups');
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const db = await this.dbPromise;
    return await db.get('groups', id);
  }

  async createGroup(data: InsertGroup): Promise<Group> {
    const db = await this.dbPromise;
    const now = new Date();
    
    const group: Group = {
      id: generateUUID(),
      name: data.name,
      isDefault: data.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };

    await db.add('groups', group);
    return group;
  }

  async updateGroup(id: string, data: Partial<Group>): Promise<Group | undefined> {
    const db = await this.dbPromise;
    const existing = await db.get('groups', id);
    
    if (!existing) {
      return undefined;
    }

    const updated: Group = {
      ...existing,
      ...data,
      id, // ID는 변경 불가
      updatedAt: new Date(),
    };

    await db.put('groups', updated);
    return updated;
  }

  async deleteGroup(id: string): Promise<boolean> {
    const db = await this.dbPromise;
    const existing = await db.get('groups', id);
    
    if (!existing) {
      return false;
    }

    // 기본 그룹은 삭제 불가
    if (existing.isDefault) {
      throw new Error('기본 그룹은 삭제할 수 없습니다.');
    }

    await db.delete('groups', id);
    
    // 해당 그룹에 속한 사주들의 groupId를 null로 변경
    const sajuRecords = await this.getSajuRecords();
    const updateTx = db.transaction('sajuRecords', 'readwrite');
    for (const record of sajuRecords) {
      if (record.groupId === id) {
        await updateTx.store.put({ ...record, groupId: null, updatedAt: new Date() });
      }
    }
    await updateTx.done;

    return true;
  }

  // === 백업/복원 ===
  
  async exportAllData(): Promise<{
    sajuRecords: SajuRecord[];
    groups: Group[];
    fortuneResults: FortuneResult[];
    version: string;
    exportDate: string;
  }> {
    const db = await this.dbPromise;
    
    const [sajuRecords, groups, fortuneResults] = await Promise.all([
      db.getAll('sajuRecords'),
      db.getAll('groups'),
      db.getAll('fortuneResults'),
    ]);

    return {
      sajuRecords,
      groups,
      fortuneResults,
      version: '1.0',
      exportDate: new Date().toISOString(),
    };
  }

  // Date 필드를 문자열에서 Date 객체로 변환하는 헬퍼 함수
  private convertDates<T extends Record<string, any>>(obj: T): T {
    const result: any = { ...obj };
    const dateFields = ['createdAt', 'updatedAt', 'calculationDate'];
    
    for (const field of dateFields) {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = new Date(result[field]);
      }
    }
    
    return result as T;
  }

  async importAllData(data: {
    sajuRecords?: any[];
    groups?: any[];
    fortuneResults?: any[];
  }): Promise<{
    imported: number;
    sajuRecordsCount: number;
    groupsCount: number;
    fortuneResultsCount: number;
    errors: string[];
  }> {
    const db = await this.dbPromise;
    const errors: string[] = [];
    let sajuRecordsCount = 0;
    let groupsCount = 0;
    let fortuneResultsCount = 0;

    // Groups 먼저 임포트
    if (data.groups && data.groups.length > 0) {
      const tx = db.transaction('groups', 'readwrite');
      for (const rawGroup of data.groups) {
        try {
          const group = this.convertDates(rawGroup) as Group;
          // 기존 그룹 확인
          const existing = await tx.store.get(group.id);
          if (!existing) {
            await tx.store.add(group);
            groupsCount++;
          }
        } catch (error) {
          errors.push(`Group import error: ${error}`);
        }
      }
      await tx.done;
    }

    // SajuRecords 임포트
    if (data.sajuRecords && data.sajuRecords.length > 0) {
      const tx = db.transaction('sajuRecords', 'readwrite');
      for (const rawRecord of data.sajuRecords) {
        try {
          const record = this.convertDates(rawRecord) as SajuRecord;
          // 기존 레코드 확인
          const existing = await tx.store.get(record.id);
          if (!existing) {
            await tx.store.add(record);
            sajuRecordsCount++;
          }
        } catch (error) {
          errors.push(`SajuRecord import error: ${error}`);
        }
      }
      await tx.done;
    }

    // FortuneResults 임포트
    if (data.fortuneResults && data.fortuneResults.length > 0) {
      const tx = db.transaction('fortuneResults', 'readwrite');
      for (const rawFortune of data.fortuneResults) {
        try {
          const fortune = this.convertDates(rawFortune) as FortuneResult;
          const existing = await tx.store.get(fortune.id);
          if (!existing) {
            await tx.store.add(fortune);
            fortuneResultsCount++;
          }
        } catch (error) {
          errors.push(`FortuneResult import error: ${error}`);
        }
      }
      await tx.done;
    }

    const imported = sajuRecordsCount + groupsCount + fortuneResultsCount;

    return {
      imported,
      sajuRecordsCount,
      groupsCount,
      fortuneResultsCount,
      errors,
    };
  }

  // === Fortune Results ===
  
  async saveFortuneResult(data: InsertFortuneResult & { id?: string; createdAt?: Date }): Promise<FortuneResult> {
    const db = await this.dbPromise;
    const now = new Date();
    
    if (!data.sajuRecordId) {
      throw new Error('sajuRecordId is required for FortuneResult');
    }
    
    const fortune: FortuneResult = {
      id: data.id || generateUUID(),
      sajuRecordId: data.sajuRecordId,
      daeunNumber: data.daeunNumber,
      daeunDirection: data.daeunDirection,
      daeunStartAge: data.daeunStartAge,
      daeunList: data.daeunList,
      saeunStartYear: data.saeunStartYear,
      calculationDate: data.calculationDate || now,
      algorithmVersion: data.algorithmVersion || '1.0',
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    await db.put('fortuneResults', fortune);
    return fortune;
  }

  async getFortuneResult(sajuRecordId: string): Promise<FortuneResult | undefined> {
    const db = await this.dbPromise;
    const fortunes = await db.getAllFromIndex('fortuneResults', 'by-saju', sajuRecordId);
    return fortunes.length > 0 ? fortunes[0] : undefined;
  }

  async deleteFortuneResult(id: string): Promise<boolean> {
    const db = await this.dbPromise;
    const existing = await db.get('fortuneResults', id);
    
    if (!existing) {
      return false;
    }

    await db.delete('fortuneResults', id);
    return true;
  }

  // === 데이터베이스 초기화 (개발용) ===
  
  async clearAllData(): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['sajuRecords', 'groups', 'fortuneResults'], 'readwrite');
    await tx.objectStore('sajuRecords').clear();
    await tx.objectStore('groups').clear();
    await tx.objectStore('fortuneResults').clear();
    await tx.done;
    
    // 기본 그룹 다시 초기화
    await this.initializeDefaultGroups(db);
  }
}

// 싱글톤 인스턴스
export const localDB = new SajuLocalStorage();
