import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const API_KEY = process.env.DATA_GOV_KR_API_KEY;
const BASE_URL = 'https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getLunCalInfo';

// XML에서 태그 값 추출
function getTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
  return m ? m[1] : null;
}

async function fetchMonth(year, month) {
  const url = `${BASE_URL}?serviceKey=${API_KEY}&solYear=${year}&solMonth=${String(month).padStart(2, '0')}&numOfRows=31`;
  const resp = await fetch(url);
  const xml = await resp.text();
  
  const items = xml.split('<item>').slice(1);
  const rows = [];
  for (const item of items) {
    rows.push({
      solYear: Number(getTag(item, 'solYear')),
      solMonth: Number(getTag(item, 'solMonth')),
      solDay: Number(getTag(item, 'solDay')),
      lunYear: Number(getTag(item, 'lunYear')),
      lunMonth: Number(getTag(item, 'lunMonth')),
      lunDay: Number(getTag(item, 'lunDay')),
      lunLeapMonth: getTag(item, 'lunLeapmonth') || '평',
      lunSecha: getTag(item, 'lunSecha'),
      solJeongja: getTag(item, 'lunIljin'),
    });
  }
  return rows;
}

async function main() {
  const startYear = Number(process.argv[2]) || 1900;
  const endYear = Number(process.argv[3]) || 2050;
  
  console.log(`${startYear}년 ~ ${endYear}년 데이터 수집 시작`);
  
  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      try {
        const rows = await fetchMonth(year, month);
        if (rows.length === 0) {
          console.log(`⚠️ ${year}-${month}: 데이터 없음`);
          continue;
        }
        
        for (const r of rows) {
          if (!r.solYear || !r.lunYear) continue;
          await sql`
            INSERT INTO lunar_solar_calendar 
              (sol_year, sol_month, sol_day, lun_year, lun_month, lun_day, lun_leap_month, lun_secha, sol_jeongja, source)
            VALUES 
              (${r.solYear}, ${r.solMonth}, ${r.solDay}, ${r.lunYear}, ${r.lunMonth}, ${r.lunDay}, ${r.lunLeapMonth}, ${r.lunSecha}, ${r.solJeongja}, 'api')
            ON CONFLICT (sol_year, sol_month, sol_day) DO NOTHING
          `;
        }
        console.log(`✅ ${year}-${month}: ${rows.length}건`);
        
        // API 부하 방지
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        console.log(`❌ ${year}-${month} 실패: ${e.message}`);
      }
    }
  }
  console.log('완료!');
}

main();