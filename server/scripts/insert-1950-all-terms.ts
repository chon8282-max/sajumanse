import { storage } from '../storage';

/**
 * 1950년 모든 24절기 bebeyam 데이터 삽입
 * 출처: https://bebeyam.com/사주-만세력-1950년-경인년-24절기-절입시간-입춘/
 */

interface SolarTermData {
  name: string;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const SOLAR_TERMS_1950: SolarTermData[] = [
  { name: '소한', month: 1, day: 6, hour: 6, minute: 40 },
  { name: '대한', month: 1, day: 21, hour: 0, minute: 0 },
  { name: '입춘', month: 2, day: 4, hour: 18, minute: 22 },
  { name: '우수', month: 2, day: 19, hour: 14, minute: 18 },
  { name: '경칩', month: 3, day: 6, hour: 12, minute: 36 },
  { name: '춘분', month: 3, day: 21, hour: 13, minute: 36 },
  { name: '청명', month: 4, day: 5, hour: 17, minute: 45 },
  { name: '곡우', month: 4, day: 21, hour: 1, minute: 0 },
  { name: '입하', month: 5, day: 6, hour: 11, minute: 25 },
  { name: '소만', month: 5, day: 22, hour: 0, minute: 28 },
  { name: '망종', month: 6, day: 6, hour: 15, minute: 52 },
  { name: '하지', month: 6, day: 22, hour: 8, minute: 37 },
  { name: '소서', month: 7, day: 8, hour: 2, minute: 14 },
  { name: '대서', month: 7, day: 23, hour: 19, minute: 30 },
  { name: '입추', month: 8, day: 8, hour: 11, minute: 56 },
  { name: '처서', month: 8, day: 24, hour: 2, minute: 24 },
  { name: '백로', month: 9, day: 8, hour: 14, minute: 34 },
  { name: '추분', month: 9, day: 23, hour: 23, minute: 44 },
  { name: '한로', month: 10, day: 9, hour: 5, minute: 52 },
  { name: '상강', month: 10, day: 24, hour: 8, minute: 45 },
  { name: '입동', month: 11, day: 8, hour: 8, minute: 44 },
  { name: '소설', month: 11, day: 23, hour: 6, minute: 3 },
  { name: '대설', month: 12, day: 8, hour: 1, minute: 22 },
  { name: '동지', month: 12, day: 22, hour: 19, minute: 14 },
];

async function insertTerms() {
  console.log('📅 1950년 모든 24절기 bebeyam 데이터 삽입 시작\n');
  
  // 기존 데이터 한 번만 조회 (성능 최적화)
  const existingTerms = await storage.getSolarTerms(1950);
  const existingTermsMap = new Map(existingTerms.map(t => [t.name, t]));
  
  let inserted = 0;
  let replaced = 0;
  
  for (const term of SOLAR_TERMS_1950) {
    // KST → UTC 변환 (KST - 9시간)
    const kstDate = new Date(1950, term.month - 1, term.day, term.hour, term.minute);
    const utcDate = new Date(kstDate.getTime() - 9 * 60 * 60 * 1000);
    
    // 기존 데이터 확인
    const existingTerm = existingTermsMap.get(term.name);
    
    if (existingTerm) {
      console.log(`♻️  ${term.name}: 기존 데이터 교체 (source: ${existingTerm.source})`);
      replaced++;
    } else {
      console.log(`➕ ${term.name}: 새 데이터 삽입`);
      inserted++;
    }
    
    // createSolarTerm은 onConflictDoUpdate로 upsert 자동 처리
    await storage.createSolarTerm({
      year: 1950,
      name: term.name,
      date: utcDate,
      kstHour: term.hour,
      kstMinute: term.minute,
      source: 'bebeyam'
    });
  }
  
  console.log('\n✅ 1950년 24절기 삽입 완료');
  console.log(`   새 데이터: ${inserted}개`);
  console.log(`   교체 데이터: ${replaced}개 (${replaced === 1 ? '입춘만 기존 삽입됨' : ''})\n`);
}

insertTerms()
  .then(() => {
    console.log('✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });
