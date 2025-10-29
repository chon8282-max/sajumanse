import { db } from './db';
import { sql } from 'drizzle-orm';

const CHEONGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const JIJI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

async function fillIlJin() {
  // 기준일: 1900.1.1 = 甲戌일 (index=10)
  const baseDate = new Date(1900, 0, 1);
  const baseIndex = 10;
  
  console.log('일진 데이터 계산 시작...');
  
  // DB의 모든 레코드 가져오기
  const records = await db.execute(
    sql`SELECT id, sol_year, sol_month, sol_day FROM lunar_solar_calendar ORDER BY sol_year, sol_month, sol_day`
  );
  
  console.log(`총 ${records.rows.length}개 레코드`);
  
  // 배치 업데이트 (100개씩 - 빠르게 처리)
  const batchSize = 100;
  let updated = 0;
  
  for (let i = 0; i < records.rows.length; i += batchSize) {
    const batch = records.rows.slice(i, i + batchSize);
    
    // Promise.all로 병렬 처리
    await Promise.all(batch.map(async (row: any) => {
      const targetDate = new Date(row.sol_year, row.sol_month - 1, row.sol_day);
      const daysDiff = Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
      const dayIndex = ((baseIndex + daysDiff) % 60 + 60) % 60;
      const sky = dayIndex % 10;
      const earth = dayIndex % 12;
      const ilJin = CHEONGAN[sky] + JIJI[earth];
      
      await db.execute(
        sql`UPDATE lunar_solar_calendar SET sol_jeongja = ${ilJin} WHERE id = ${row.id}`
      );
    }));
    
    updated += batch.length;
    console.log(`진행: ${updated} / ${records.rows.length} (${Math.floor(updated / records.rows.length * 100)}%)`);
  }
  
  console.log('✅ 완료!');
  
  // 검증
  console.log('\n검증:');
  const check1 = await db.execute(sql`SELECT sol_year, sol_month, sol_day, sol_jeongja FROM lunar_solar_calendar WHERE sol_year = 1965 AND sol_month = 8 AND sol_day = 15`);
  console.log('1965.8.15:', check1.rows[0]?.sol_jeongja, '(예상: 辛丑)');
  
  const check2 = await db.execute(sql`SELECT sol_year, sol_month, sol_day, sol_jeongja FROM lunar_solar_calendar WHERE sol_year = 1975 AND sol_month = 1 AND sol_day = 14`);
  console.log('1975.1.14:', check2.rows[0]?.sol_jeongja, '(예상: 庚申)');
  
  const check3 = await db.execute(sql`SELECT sol_year, sol_month, sol_day, sol_jeongja FROM lunar_solar_calendar WHERE sol_year = 1992 AND sol_month = 2 AND sol_day = 4`);
  console.log('1992.2.4:', check3.rows[0]?.sol_jeongja, '(예상: 庚戌)');
}

fillIlJin()
  .then(() => {
    console.log('\n프로세스 종료');
    process.exit(0);
  })
  .catch((err) => {
    console.error('오류:', err);
    process.exit(1);
  });
