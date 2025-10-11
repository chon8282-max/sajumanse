import { getSolarTermsForYear } from '../lib/solar-terms-service';
import { storage } from '../storage';

async function testDbSolarTerms() {
  console.log('\n📋 24절기 DB 조회 테스트\n');
  
  // 테스트 1: DB에 있는 연도 (2024년)
  console.log('=== 테스트 1: 2024년 (DB에 있음) ===');
  const terms2024 = await getSolarTermsForYear(2024);
  console.log(`2024년 절기 개수: ${terms2024.length}`);
  console.log(`입춘: ${terms2024.find(t => t.name === '입춘')?.date.toISOString()}`);
  
  // DB에서 직접 조회
  const dbTerms2024 = await storage.getSolarTerms(2024);
  console.log(`DB에서 조회: ${dbTerms2024.length}개, source: ${dbTerms2024[0]?.source}`);
  
  console.log('\n=== 테스트 2: 1988년 (DB에 없음, 근사치 계산) ===');
  const terms1988 = await getSolarTermsForYear(1988);
  console.log(`1988년 절기 개수: ${terms1988.length}`);
  console.log(`입춘: ${terms1988.find(t => t.name === '입춘')?.date.toISOString()}`);
  
  // DB에 저장되었는지 확인
  const dbTerms1988 = await storage.getSolarTerms(1988);
  console.log(`DB에서 조회: ${dbTerms1988.length}개, source: ${dbTerms1988[0]?.source}`);
  
  console.log('\n=== 테스트 3: 1958년 (하드코딩 데이터) ===');
  const terms1958 = await getSolarTermsForYear(1958);
  console.log(`1958년 절기 개수: ${terms1958.length}`);
  const lichun1958 = terms1958.find(t => t.name === '입춘');
  console.log(`입춘: ${lichun1958?.date.toISOString()}`);
  
  // KST 시간 확인 (16:49여야 함)
  const kstDate = new Date(lichun1958!.date.getTime() + 9 * 60 * 60 * 1000);
  console.log(`입춘 KST: ${kstDate.getUTCHours()}:${String(kstDate.getUTCMinutes()).padStart(2, '0')} (16:49여야 함)`);
  
  // DB에 저장되었는지 확인
  const dbTerms1958 = await storage.getSolarTerms(1958);
  console.log(`DB에서 조회: ${dbTerms1958.length}개, source: ${dbTerms1958[0]?.source}`);
  
  console.log('\n✅ 테스트 완료!\n');
  process.exit(0);
}

testDbSolarTerms().catch(error => {
  console.error('❌ 테스트 실패:', error);
  process.exit(1);
});
