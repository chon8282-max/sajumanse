import { storage } from '../storage';
import XLSX from 'xlsx';

async function importExcelData() {
  console.log('📊 Excel 파일에서 24절기 데이터 가져오기...\n');
  
  const filePath = './attached_assets/천문연_24절기(1900~2050)_1760601609488.xlsx';
  
  // Excel 파일 읽기
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`✅ 파일 로드 완료: ${data.length}개 행\n`);
  
  // 첫 번째 행 확인
  if (data.length > 0) {
    console.log('📋 첫 번째 행 샘플:');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('\n컬럼명:', Object.keys(data[0] as any).join(', '));
    console.log('');
  }
  
  let insertedCount = 0;
  let skippedCount = 0;
  
  // 배치 처리를 위한 버퍼
  const batchSize = 500;
  const batch = [];
  
  for (const row of data as any[]) {
    const year = parseInt((row['연'] || '').toString().trim());
    const month = parseInt((row['월'] || '').toString().trim());
    const day = parseInt((row['일'] || '').toString().trim());
    const hour = parseInt((row['시'] || '0').toString().trim());
    const minute = parseInt((row['분'] || '0').toString().trim());
    const name = (row['구분'] || '').toString().trim();
    
    if (!year || !month || !day || !name) {
      skippedCount++;
      continue;
    }
    
    // 1900-2050년만 처리
    if (year < 1900 || year > 2050) {
      skippedCount++;
      continue;
    }
    
    // KST를 UTC로 변환 (KST - 9시간)
    const kstDate = new Date(year, month - 1, day, hour, minute);
    const utcDate = new Date(kstDate.getTime() - 9 * 60 * 60 * 1000);
    
    batch.push({
      year,
      name,
      date: utcDate,
      kstHour: hour,
      kstMinute: minute,
      source: 'kasi'
    });
    
    if (batch.length >= batchSize) {
      await storage.bulkCreateSolarTerms(batch);
      insertedCount += batch.length;
      console.log(`  ✓ ${insertedCount}개 삽입 완료...`);
      batch.length = 0; // 배치 초기화
    }
  }
  
  // 남은 데이터 처리
  if (batch.length > 0) {
    await storage.bulkCreateSolarTerms(batch);
    insertedCount += batch.length;
  }
  
  console.log(`\n✅ 전체 ${insertedCount}개 절기 데이터 삽입 완료`);
  
  console.log(`\n📊 최종 통계:`);
  console.log(`  - 삽입된 절기: ${insertedCount}개`);
}

importExcelData()
  .then(() => {
    console.log('\n✅ 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류:', error);
    process.exit(1);
  });
