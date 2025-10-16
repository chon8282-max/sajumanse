import { storage } from '../storage';

/**
 * 1946년 누락된 소한/대한 절기를 근사 계산으로 추가
 */
async function fix1946Terms() {
  console.log('🔧 1946년 누락 절기 수정 시작\n');
  
  const year = 1946;
  
  // 현재 1946년 데이터 확인
  const existing = await storage.getSolarTerms(year);
  console.log(`현재 1946년 절기: ${existing.length}개`);
  console.log('절기 목록:', existing.map(t => t.name).join(', '));
  
  const allTermNames = [
    "소한", "대한", "입춘", "우수", "경칩", "춘분", "청명", "곡우",
    "입하", "소만", "망종", "하지", "소서", "대서", "입추", "처서",
    "백로", "추분", "한로", "상강", "입동", "소설", "대설", "동지"
  ];
  
  const existingNames = new Set(existing.map(t => t.name));
  const missingTerms = allTermNames.filter(name => !existingNames.has(name));
  
  console.log(`\n누락된 절기: ${missingTerms.join(', ')}`);
  
  if (missingTerms.length === 0) {
    console.log('✅ 누락된 절기 없음');
    return;
  }
  
  // 2024년 기준 근사 데이터
  const baseSolarTerms2024: Record<string, { month: number; day: number; hour: number; minute: number }> = {
    "소한": { month: 1, day: 5, hour: 23, minute: 49 },
    "대한": { month: 1, day: 20, hour: 10, minute: 7 }
  };
  
  const yearDiff = year - 2024;
  const dayOffset = Math.round(yearDiff / 4);
  
  for (const termName of missingTerms) {
    const baseTerm = baseSolarTerms2024[termName];
    if (!baseTerm) {
      console.log(`⚠️ ${termName}: 기준 데이터 없음, 건너뜀`);
      continue;
    }
    
    const termDate = new Date(
      year, 
      baseTerm.month - 1, 
      baseTerm.day + dayOffset, 
      baseTerm.hour, 
      baseTerm.minute
    );
    
    // KST를 UTC로 변환 (KST - 9시간)
    const utcDate = new Date(termDate.getTime() - 9 * 60 * 60 * 1000);
    
    // KST 시간 추출
    const kstDate = termDate;
    
    await storage.createSolarTerm({
      year,
      name: termName,
      date: utcDate,
      kstHour: kstDate.getHours(),
      kstMinute: kstDate.getMinutes(),
      source: 'approximation'
    });
    
    console.log(`✅ ${termName} 추가: ${termDate.toISOString()} (KST ${kstDate.getHours()}:${kstDate.getMinutes().toString().padStart(2, '0')})`);
  }
  
  // 최종 확인
  const final = await storage.getSolarTerms(year);
  console.log(`\n📊 최종 1946년 절기: ${final.length}개`);
  
  if (final.length === 24) {
    console.log('✅ 1946년 24절기 완성!');
  } else {
    console.log(`⚠️ 여전히 부족: ${24 - final.length}개`);
  }
}

fix1946Terms()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
