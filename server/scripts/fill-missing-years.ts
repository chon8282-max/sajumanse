import { getSolarTermsForYear } from '../lib/solar-terms-service';
import { storage } from '../storage';

/**
 * 1900-2050년 누락된 연도의 24절기 데이터를 근사 계산으로 채우기
 */
async function fillMissingYears() {
  console.log('📅 1900-2050년 누락 연도 24절기 데이터 채우기 시작\n');
  
  const START_YEAR = 1900;
  const END_YEAR = 2050;
  
  let filledCount = 0;
  let skippedCount = 0;
  
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    // DB에 데이터가 있는지 확인
    const existing = await storage.getSolarTerms(year);
    
    if (existing && existing.length >= 24) {
      console.log(`  ✓ ${year}년: 이미 ${existing.length}개 존재 (source: ${existing[0]?.source})`);
      skippedCount++;
      continue;
    }
    
    if (existing && existing.length > 0 && existing.length < 24) {
      console.log(`  ⚠️ ${year}년: ${existing.length}개 부분 데이터 존재 (채우기 중...)`);
    } else {
      console.log(`  📝 ${year}년: 데이터 없음, 생성 중...`);
    }
    
    // getSolarTermsForYear는 자동으로 DB에 저장함
    const terms = await getSolarTermsForYear(year);
    console.log(`  ✅ ${year}년: ${terms.length}개 절기 생성 완료`);
    filledCount++;
  }
  
  console.log(`\n📊 작업 완료:`);
  console.log(`  ✅ 생성/업데이트: ${filledCount}개 연도`);
  console.log(`  ⏭️  건너뜀: ${skippedCount}개 연도`);
  console.log(`  📦 총: ${END_YEAR - START_YEAR + 1}개 연도`);
}

fillMissingYears()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
