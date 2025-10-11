import { getSolarTermsForYear } from '../lib/solar-terms-service';
import { storage } from '../storage';

async function testSolarTermsOrder() {
  console.log('\n📋 24절기 시간순 정렬 테스트\n');
  
  // 2024년 데이터로 테스트 (DB에 있음)
  console.log('=== 2024년 시간순 정렬 확인 ===');
  const terms2024 = await getSolarTermsForYear(2024);
  
  console.log(`총 ${terms2024.length}개 절기:\n`);
  
  // 모든 절기 출력 (시간순이어야 함)
  let prevDate: Date | null = null;
  let isSorted = true;
  
  terms2024.forEach((term, index) => {
    const kstDate = new Date(term.date.getTime() + 9 * 60 * 60 * 1000);
    const dateStr = `${kstDate.getUTCMonth() + 1}/${kstDate.getUTCDate()} ${String(kstDate.getUTCHours()).padStart(2, '0')}:${String(kstDate.getUTCMinutes()).padStart(2, '0')}`;
    
    console.log(`${String(index + 1).padStart(2, ' ')}. ${term.name.padEnd(6, ' ')} - ${dateStr}`);
    
    // 시간순 정렬 확인
    if (prevDate && term.date < prevDate) {
      console.log(`  ❌ 정렬 오류: 이전 절기보다 빠름!`);
      isSorted = false;
    }
    prevDate = term.date;
  });
  
  if (isSorted) {
    console.log('\n✅ 모든 절기가 시간순으로 정렬되었습니다!');
  } else {
    console.log('\n❌ 정렬 오류 발견!');
    process.exit(1);
  }
  
  // 대운 계산에 필요한 12절기 확인
  const majorTerms = ["입춘", "경칩", "청명", "입하", "망종", "소서", "입추", "백로", "한로", "입동", "대설", "소한"];
  const foundMajorTerms = terms2024.filter(t => majorTerms.includes(t.name));
  
  console.log(`\n대운 계산 12절기: ${foundMajorTerms.length}개`);
  foundMajorTerms.forEach((term, i) => {
    const prev = i > 0 ? foundMajorTerms[i - 1] : null;
    if (prev && term.date < prev.date) {
      console.log(`❌ ${term.name} 순서 오류`);
    }
  });
  
  console.log('\n✅ 테스트 완료!\n');
  process.exit(0);
}

testSolarTermsOrder().catch(error => {
  console.error('❌ 테스트 실패:', error);
  process.exit(1);
});
