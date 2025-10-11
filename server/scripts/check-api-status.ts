import { get24DivisionsInfo } from '../lib/data-gov-kr-service';

/**
 * 공공데이터포털 API 복구 상태 확인
 * 2024년 입춘 데이터로 테스트 (확실히 존재하는 데이터)
 */
async function checkApiStatus() {
  console.log('🔍 공공데이터포털 API 상태 확인...\n');
  
  try {
    // 2024년 전체 절기로 테스트
    const result = await get24DivisionsInfo(2024);
    
    if (result.response?.body?.items?.item) {
      const items = Array.isArray(result.response.body.items.item) 
        ? result.response.body.items.item 
        : [result.response.body.items.item];
      
      const solarTerms = items.filter((item: any) => item.dateKind === '24절기');
      
      if (solarTerms.length > 0) {
        console.log('✅ API 정상 작동 중!');
        console.log(`   테스트: 2024년 절기 ${solarTerms.length}개 수신`);
        console.log(`   예시: ${solarTerms[0].dateName} (${solarTerms[0].locdate})`);
        console.log('\n🚀 전체 데이터 수집을 시작할 수 있습니다.');
        console.log('   실행 명령: npm run collect-all-solar-terms\n');
        return true;
      }
    }
    
    console.log('⚠️ API 응답은 있지만 데이터 형식이 예상과 다릅니다.');
    console.log(JSON.stringify(result, null, 2));
    return false;
    
  } catch (error: any) {
    console.log('❌ API 아직 복구 안됨');
    console.log(`   오류: ${error?.message || error}`);
    console.log('\n⏳ API 복구를 기다려주세요.');
    console.log('   복구 후 다시 실행: npm run check-api\n');
    return false;
  }
}

checkApiStatus()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('❌ 스크립트 실행 오류:', error);
    process.exit(1);
  });
