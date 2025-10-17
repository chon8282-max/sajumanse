import { storage } from '../storage';
import XLSX from 'xlsx';

async function importKASIData() {
  console.log('📊 천문연 Excel 파일에서 데이터 가져오기...\n');
  
  // 1. 24절기 데이터 임포트
  console.log('=== 24절기 데이터 ===');
  const solarTermsFile = '../attached_assets/천문연_24절기(1900~2050)_1760712070669.xlsx';
  const wb1 = XLSX.readFile(solarTermsFile);
  const sheet1 = wb1.Sheets[wb1.SheetNames[0]];
  const solarTermsData = XLSX.utils.sheet_to_json(sheet1);
  
  console.log(`✅ 파일 로드 완료: ${solarTermsData.length}개 행\n`);
  
  let insertedSolarTerms = 0;
  const solarTermsBatch: any[] = [];
  const batchSize = 500;
  
  for (const row of solarTermsData as any[]) {
    const year = parseInt((row['연'] || '').toString().trim());
    const month = parseInt((row['월'] || '').toString().trim());
    const day = parseInt((row['일'] || '').toString().trim());
    const hour = parseInt((row['시'] || '0').toString().trim());
    const minute = parseInt((row['분'] || '0').toString().trim());
    const name = (row['구분'] || '').toString().trim();
    
    if (!year || !month || !day || !name) continue;
    if (year < 1900 || year > 2050) continue;
    
    // KST 시각 그대로 저장
    const kstDate = new Date(year, month - 1, day, hour, minute);
    
    solarTermsBatch.push({
      year,
      name,
      date: kstDate, // KST 시각 그대로
      kstHour: hour,
      kstMinute: minute,
      source: 'kasi'
    });
    
    if (solarTermsBatch.length >= batchSize) {
      await storage.bulkCreateSolarTerms(solarTermsBatch);
      insertedSolarTerms += solarTermsBatch.length;
      console.log(`  ✓ ${insertedSolarTerms}개 절기 삽입 완료...`);
      solarTermsBatch.length = 0;
    }
  }
  
  if (solarTermsBatch.length > 0) {
    await storage.bulkCreateSolarTerms(solarTermsBatch);
    insertedSolarTerms += solarTermsBatch.length;
  }
  
  console.log(`\n✅ 전체 ${insertedSolarTerms}개 절기 데이터 삽입 완료\n`);
  
  // 2. 음양력 변환 데이터 임포트
  console.log('=== 음양력 변환 데이터 ===');
  const lunarSolarFile = '../attached_assets/천문연_음양력정보(1900~2050)_1760712067305.xlsx';
  const wb2 = XLSX.readFile(lunarSolarFile);
  const sheet2 = wb2.Sheets[wb2.SheetNames[0]];
  const lunarSolarData = XLSX.utils.sheet_to_json(sheet2);
  
  console.log(`✅ 파일 로드 완료: ${lunarSolarData.length}개 행\n`);
  
  let insertedLunarSolar = 0;
  const lunarSolarBatch: any[] = [];
  
  for (const row of lunarSolarData as any[]) {
    const solYear = row['연(양)'];
    const solMonth = row['월(양)'];
    const solDay = row['일(양)'];
    const lunYear = row['연(음)'];
    const lunMonth = row['월(음)'];
    const lunDay = row['일(음)'];
    const lunLeapMonth = row['윤월여부(평,윤)'];
    
    if (!solYear || !solMonth || !solDay) continue;
    if (!lunYear || !lunMonth || !lunDay) continue;
    
    lunarSolarBatch.push({
      solYear,
      solMonth,
      solDay,
      lunYear,
      lunMonth,
      lunDay,
      lunLeapMonth,
      source: 'kasi'
    });
    
    if (lunarSolarBatch.length >= batchSize) {
      await storage.bulkCreateLunarSolarCalendar(lunarSolarBatch);
      insertedLunarSolar += lunarSolarBatch.length;
      console.log(`  ✓ ${insertedLunarSolar}개 음양력 데이터 삽입 완료...`);
      lunarSolarBatch.length = 0;
    }
  }
  
  if (lunarSolarBatch.length > 0) {
    await storage.bulkCreateLunarSolarCalendar(lunarSolarBatch);
    insertedLunarSolar += lunarSolarBatch.length;
  }
  
  console.log(`\n✅ 전체 ${insertedLunarSolar}개 음양력 데이터 삽입 완료\n`);
  
  console.log(`\n📊 최종 통계:`);
  console.log(`  - 절기: ${insertedSolarTerms}개`);
  console.log(`  - 음양력: ${insertedLunarSolar}개`);
}

importKASIData()
  .then(() => {
    console.log('\n✅ 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류:', error);
    process.exit(1);
  });
