import { storage } from '../storage';
import type { InsertSolarTerms } from '@shared/schema';

async function fix2007SolarTerms() {
  console.log('\n🔧 2007년 24절기 데이터 수정 중...\n');
  
  // 2007년 정확한 24절기 데이터 (12월 7일을 대설로 수정)
  const solarTermsData: InsertSolarTerms[] = [
    { year: 2007, name: "소한", date: new Date("2007-01-05T17:40:00Z"), kstHour: 2, kstMinute: 40, source: 'holidays.dist.be' },
    { year: 2007, name: "대한", date: new Date("2007-01-20T11:01:00Z"), kstHour: 20, kstMinute: 1, source: 'holidays.dist.be' },
    { year: 2007, name: "입춘", date: new Date("2007-02-04T05:18:00Z"), kstHour: 14, kstMinute: 18, source: 'holidays.dist.be' },
    { year: 2007, name: "우수", date: new Date("2007-02-19T01:09:00Z"), kstHour: 10, kstMinute: 9, source: 'holidays.dist.be' },
    { year: 2007, name: "경칩", date: new Date("2007-03-05T23:18:00Z"), kstHour: 8, kstMinute: 18, source: 'holidays.dist.be' },
    { year: 2007, name: "춘분", date: new Date("2007-03-21T00:07:00Z"), kstHour: 9, kstMinute: 7, source: 'holidays.dist.be' },
    { year: 2007, name: "청명", date: new Date("2007-04-05T04:05:00Z"), kstHour: 13, kstMinute: 5, source: 'holidays.dist.be' },
    { year: 2007, name: "곡우", date: new Date("2007-04-20T11:07:00Z"), kstHour: 20, kstMinute: 7, source: 'holidays.dist.be' },
    { year: 2007, name: "입하", date: new Date("2007-05-05T21:20:00Z"), kstHour: 6, kstMinute: 20, source: 'holidays.dist.be' },
    { year: 2007, name: "소만", date: new Date("2007-05-21T10:12:00Z"), kstHour: 19, kstMinute: 12, source: 'holidays.dist.be' },
    { year: 2007, name: "망종", date: new Date("2007-06-06T01:27:00Z"), kstHour: 10, kstMinute: 27, source: 'holidays.dist.be' },
    { year: 2007, name: "하지", date: new Date("2007-06-21T18:06:00Z"), kstHour: 3, kstMinute: 6, source: 'holidays.dist.be' },
    { year: 2007, name: "소서", date: new Date("2007-07-07T11:42:00Z"), kstHour: 20, kstMinute: 42, source: 'holidays.dist.be' },
    { year: 2007, name: "대서", date: new Date("2007-07-23T05:00:00Z"), kstHour: 14, kstMinute: 0, source: 'holidays.dist.be' },
    { year: 2007, name: "입추", date: new Date("2007-08-07T21:31:00Z"), kstHour: 6, kstMinute: 31, source: 'holidays.dist.be' },
    { year: 2007, name: "처서", date: new Date("2007-08-23T12:08:00Z"), kstHour: 21, kstMinute: 8, source: 'holidays.dist.be' },
    { year: 2007, name: "백로", date: new Date("2007-09-08T00:29:00Z"), kstHour: 9, kstMinute: 29, source: 'holidays.dist.be' },
    { year: 2007, name: "추분", date: new Date("2007-09-23T09:51:00Z"), kstHour: 18, kstMinute: 51, source: 'holidays.dist.be' },
    { year: 2007, name: "한로", date: new Date("2007-10-08T16:11:00Z"), kstHour: 1, kstMinute: 11, source: 'holidays.dist.be' },
    { year: 2007, name: "상강", date: new Date("2007-10-23T19:15:00Z"), kstHour: 4, kstMinute: 15, source: 'holidays.dist.be' },
    { year: 2007, name: "입동", date: new Date("2007-11-07T19:24:00Z"), kstHour: 4, kstMinute: 24, source: 'holidays.dist.be' },
    { year: 2007, name: "소설", date: new Date("2007-11-22T16:50:00Z"), kstHour: 1, kstMinute: 50, source: 'holidays.dist.be' },
    { year: 2007, name: "대설", date: new Date("2007-12-07T12:14:00Z"), kstHour: 21, kstMinute: 14, source: 'holidays.dist.be (수정)' }, // 대서 → 대설 수정
    { year: 2007, name: "동지", date: new Date("2007-12-22T06:08:00Z"), kstHour: 15, kstMinute: 8, source: 'holidays.dist.be' },
  ];
  
  const saved = await storage.bulkCreateSolarTerms(solarTermsData);
  
  console.log(`✅ 2007년 24절기 ${saved.length}개 저장 완료!\n`);
  
  // 저장된 데이터 확인
  const storedTerms = await storage.getSolarTerms(2007);
  console.log(`📦 DB에서 조회된 2007년 24절기: ${storedTerms.length}개\n`);
  
  process.exit(0);
}

fix2007SolarTerms().catch(error => {
  console.error('❌ 스크립트 실패:', error);
  process.exit(1);
});
