import { storage } from '../storage';
import type { InsertSolarTerms } from '@shared/schema';

const SOLAR_TERM_NAMES = [
  "입춘", "우수", "경칩", "춘분", "청명", "곡우",
  "입하", "소만", "망종", "하지", "소서", "대서",
  "입추", "처서", "백로", "추분", "한로", "상강",
  "입동", "소설", "대설", "동지", "소한", "대한"
];

async function collectSolarTermsFromDistBe() {
  const startYear = 2006;
  const endYear = new Date().getFullYear();
  
  console.log(`\n📅 ${startYear}~${endYear}년 24절기 데이터 수집 (holidays.dist.be)\n`);
  
  let totalSaved = 0;
  const failed: number[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    try {
      // 이미 데이터가 있는지 확인
      const exists = await storage.checkSolarTermsExist(year);
      if (exists) {
        console.log(`⏭️  ${year}년: 이미 존재 - 스킵`);
        continue;
      }
      
      console.log(`📥 ${year}년 데이터 가져오는 중...`);
      const response = await fetch(`https://holidays.dist.be/${year}.json`);
      
      if (!response.ok) {
        console.log(`❌ ${year}년: API 응답 실패 (${response.status})`);
        failed.push(year);
        continue;
      }
      
      const data = await response.json();
      
      // kind === 3 (24절기) 필터링
      const solarTermsData = data.filter((item: any) => 
        item.kind === 3 && SOLAR_TERM_NAMES.includes(item.name)
      );
      
      if (solarTermsData.length === 0) {
        console.log(`⚠️  ${year}년: 24절기 데이터 없음`);
        failed.push(year);
        continue;
      }
      
      const insertData: InsertSolarTerms[] = [];
      
      for (const item of solarTermsData) {
        // date: "YYYY-MM-DD", time: "HH:mm" (KST)
        const [yearStr, monthStr, dayStr] = item.date.split('-');
        const [hourStr, minuteStr] = item.time ? item.time.split(':') : ['0', '0'];
        
        const kstHour = parseInt(hourStr);
        const kstMinute = parseInt(minuteStr);
        
        // KST → UTC 변환 (KST - 9시간)
        const kstDate = new Date(
          parseInt(yearStr),
          parseInt(monthStr) - 1,
          parseInt(dayStr),
          kstHour,
          kstMinute,
          0
        );
        const utcDate = new Date(kstDate.getTime() - 9 * 60 * 60 * 1000);
        
        insertData.push({
          year,
          name: item.name,
          date: utcDate,
          kstHour,
          kstMinute,
          source: 'holidays.dist.be',
        });
      }
      
      const saved = await storage.bulkCreateSolarTerms(insertData);
      totalSaved += saved.length;
      
      console.log(`✅ ${year}년: ${saved.length}개 저장 완료`);
      
      // API 요청 제한 고려 딜레이
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ ${year}년 실패:`, error instanceof Error ? error.message : String(error));
      failed.push(year);
    }
  }
  
  console.log(`\n🎉 수집 완료!`);
  console.log(`   총 저장: ${totalSaved}개`);
  console.log(`   실패한 연도 (${failed.length}개): ${failed.join(', ') || '없음'}`);
  
  process.exit(0);
}

collectSolarTermsFromDistBe().catch(error => {
  console.error('❌ 스크립트 실패:', error);
  process.exit(1);
});
