import { get24DivisionsInfo } from '../lib/data-gov-kr-service';
import { storage } from '../storage';
import type { InsertSolarTerms } from '@shared/schema';

async function testSolarTermsCollection() {
  try {
    const year = 2024;
    console.log(`\n📅 ${year}년 24절기 데이터 수집 테스트 시작...\n`);

    const apiResponse = await get24DivisionsInfo(year);
    
    if (!apiResponse) {
      console.error('❌ API 키가 설정되지 않았습니다.');
      return;
    }

    console.log('✅ API 응답 수신:\n', JSON.stringify(apiResponse, null, 2));

    const items = apiResponse.response?.body?.items?.item;
    if (!items) {
      console.error('❌ 24절기 데이터를 가져올 수 없습니다.');
      return;
    }

    const solarTermItems = Array.isArray(items) ? items : [items];
    console.log(`\n📊 수신된 절기 데이터 개수: ${solarTermItems.length}\n`);
    
    const solarTermsData: InsertSolarTerms[] = [];
    
    for (const item of solarTermItems) {
      const dateName = item.dateName;
      const locdate = item.locdate; // YYYYMMDD
      const kstTime = item.kst; // HHMMSS
      
      const dateYear = parseInt(locdate.substring(0, 4));
      const dateMonth = parseInt(locdate.substring(4, 6)) - 1;
      const dateDay = parseInt(locdate.substring(6, 8));
      
      const hour = parseInt(kstTime.substring(0, 2));
      const minute = parseInt(kstTime.substring(2, 4));
      
      // KST → UTC
      const kstDate = new Date(dateYear, dateMonth, dateDay, hour, minute, 0);
      const utcDate = new Date(kstDate.getTime() - 9 * 60 * 60 * 1000);
      
      console.log(`  ${dateName}: ${dateYear}-${String(dateMonth + 1).padStart(2, '0')}-${String(dateDay).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} KST`);
      
      solarTermsData.push({
        year,
        name: dateName,
        date: utcDate,
        kstHour: hour,
        kstMinute: minute,
        source: 'data.go.kr',
      });
    }
    
    console.log(`\n💾 DB에 저장 중...`);
    const savedTerms = await storage.bulkCreateSolarTerms(solarTermsData);
    
    console.log(`✅ ${year}년 24절기 ${savedTerms.length}개 저장 완료!\n`);
    
    // 저장된 데이터 확인
    const storedTerms = await storage.getSolarTerms(year);
    console.log(`📦 DB에서 조회된 ${year}년 24절기: ${storedTerms.length}개`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    process.exit(1);
  }
}

testSolarTermsCollection();
