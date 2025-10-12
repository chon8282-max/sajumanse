import { storage } from '../storage';
import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Python sxtwl로 생성한 CSV 파일을 PostgreSQL로 import
 * 
 * 실행 방법:
 * 1. Python 스크립트로 CSV 생성
 * 2. solar_terms_24_1900_2100.csv를 이 디렉토리에 복사
 * 3. tsx server/scripts/import-solar-terms-from-csv.ts
 */

interface CSVRow {
  year: string;
  term_index: string;
  term_name_kr: string;
  term_name_zh: string;
  ecliptic_longitude_deg: string;
  utc_time: string;
  local_time: string;
}

async function importFromCSV(csvPath: string) {
  console.log('📊 CSV 파일 읽기 시작:', csvPath);
  
  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNumber = 0;
  let imported = 0;
  let replaced = 0;
  const results: CSVRow[] = [];

  for await (const line of rl) {
    lineNumber++;
    
    // 헤더 건너뛰기
    if (lineNumber === 1) {
      console.log('헤더:', line);
      continue;
    }

    // CSV 파싱 (간단한 split, 큰따옴표 처리 포함)
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    
    if (values.length !== 7) {
      console.warn(`⚠️ Line ${lineNumber}: 잘못된 형식 (${values.length}개 컬럼)`);
      continue;
    }

    const row: CSVRow = {
      year: values[0],
      term_index: values[1],
      term_name_kr: values[2],
      term_name_zh: values[3],
      ecliptic_longitude_deg: values[4],
      utc_time: values[5],
      local_time: values[6]
    };

    results.push(row);
  }

  console.log(`\n✅ CSV 파싱 완료: ${results.length}개 절기 데이터\n`);

  // DB에 저장
  for (const row of results) {
    const utcDate = new Date(row.utc_time);
    const localDate = new Date(row.local_time);
    
    // 기존 데이터 확인
    const existing = await storage.getSolarTerms(parseInt(row.year));
    const existingTerm = existing.find(t => t.name === row.term_name_kr);
    
    if (existingTerm && existingTerm.source === 'approximation') {
      replaced++;
    }
    
    await storage.createSolarTerm({
      year: parseInt(row.year),
      name: row.term_name_kr,
      date: utcDate,
      kstHour: localDate.getHours(),
      kstMinute: localDate.getMinutes(),
      source: 'sxtwl-python'
    });
    
    imported++;
    
    if (imported % 100 === 0) {
      console.log(`진행: ${imported}/${results.length}...`);
    }
  }

  console.log('\n✅ Import 완료!');
  console.log(`   총 저장: ${imported}개`);
  console.log(`   교체됨: ${replaced}개 (근사치→sxtwl)`);
  console.log(`   출처: sxtwl-python (천문 계산 라이브러리)\n`);
}

// CSV 파일 경로 (Python 스크립트 실행 결과)
const CSV_PATH = process.argv[2] || 'solar_terms_24_1900_2100.csv';

importFromCSV(CSV_PATH)
  .then(() => {
    console.log('프로그램 종료');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Import 실패:', error);
    process.exit(1);
  });
