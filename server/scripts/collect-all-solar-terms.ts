import { get24DivisionsInfo } from '../lib/data-gov-kr-service';
import { storage } from '../storage';

/**
 * 공공데이터포털 API에서 전체 연도 절기 데이터 수집
 * 1900-2100년 범위 (API 지원 범위에 따라 조정 가능)
 */
async function collectAllSolarTerms() {
  console.log('🚀 공공데이터포털 API 전체 절기 데이터 수집 시작\n');
  
  const START_YEAR = 1900;
  const END_YEAR = 2100;
  const BATCH_SIZE = 10; // 동시 요청 수 제한
  
  let totalCollected = 0;
  let totalReplaced = 0;
  let failedYears: number[] = [];
  
  // 연도별로 배치 처리
  for (let year = START_YEAR; year <= END_YEAR; year += BATCH_SIZE) {
    const batch = [];
    const batchEnd = Math.min(year + BATCH_SIZE - 1, END_YEAR);
    
    console.log(`📅 ${year}~${batchEnd}년 처리 중...`);
    
    for (let y = year; y <= batchEnd; y++) {
      batch.push(processYear(y));
    }
    
    const results = await Promise.allSettled(batch);
    
    results.forEach((result, index) => {
      const currentYear = year + index;
      if (result.status === 'fulfilled' && result.value) {
        totalCollected += result.value.collected;
        totalReplaced += result.value.replaced;
      } else {
        failedYears.push(currentYear);
      }
    });
    
    // API 부하 방지를 위한 딜레이 (1초)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ 전체 수집 완료!');
  console.log(`   총 수집: ${totalCollected}개`);
  console.log(`   교체됨: ${totalReplaced}개`);
  
  if (failedYears.length > 0) {
    console.log(`\n⚠️ 실패한 연도 (${failedYears.length}개):`);
    console.log(`   ${failedYears.join(', ')}`);
    console.log('   (API 미지원 연도이거나 일시적 오류)');
  }
  
  console.log('\n');
}

async function processYear(year: number): Promise<{ collected: number; replaced: number } | null> {
  try {
    const result = await get24DivisionsInfo(year);
    
    if (!result?.response?.body?.items?.item) {
      return null;
    }
    
    const items = Array.isArray(result.response.body.items.item)
      ? result.response.body.items.item
      : [result.response.body.items.item];
    
    const solarTerms = items.filter((item: any) => item.dateKind === '24절기');
    
    if (solarTerms.length === 0) {
      return null;
    }
    
    let replaced = 0;
    
    // 각 절기 데이터를 DB에 저장 (기존 데이터 덮어쓰기)
    for (const term of solarTerms) {
      const dateStr = term.locdate.toString();
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6));
      const day = parseInt(dateStr.substring(6, 8));
      
      // 절기 시간은 API에 없으므로 기본값 사용 (0시 0분)
      // 추후 다른 API나 데이터로 보완 필요
      const hour = 0;
      const minute = 0;
      
      // UTC 시간으로 저장 (KST - 9시간)
      const kstDate = new Date(year, month - 1, day, hour, minute);
      const utcDate = new Date(kstDate.getTime() - 9 * 60 * 60 * 1000);
      
      // 기존 데이터 확인
      const existing = await storage.getSolarTerms(year);
      const existingTerm = existing.find(t => t.name === term.dateName);
      
      if (existingTerm && existingTerm.source === 'approximation') {
        replaced++;
      }
      
      await storage.createSolarTerm({
        year,
        name: term.dateName,
        date: utcDate,
        kstHour: hour,
        kstMinute: minute,
        source: 'data.go.kr'
      });
    }
    
    if (replaced > 0) {
      console.log(`   ${year}년: ${solarTerms.length}개 수집, ${replaced}개 교체 (근사치→API)`);
    }
    
    return { collected: solarTerms.length, replaced };
    
  } catch (error: any) {
    // 조용히 실패 처리 (API 미지원 연도)
    return null;
  }
}

collectAllSolarTerms()
  .then(() => {
    console.log('프로그램 종료');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 수집 실패:', error);
    process.exit(1);
  });
