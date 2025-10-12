import { db } from "../db";
import { solarTerms } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

// 12절기 순서 (입기만)
const TWELVE_TERMS = [
  "소한", "입춘", "경칩", "청명", "입하", "망종",
  "소서", "입추", "백로", "한로", "입동", "대설"
];

async function fetchHolidaysAPI(year: number): Promise<any[]> {
  const url = `https://holidays.dist.be/api/solar-terms/${year}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

async function fetchAndStoreSolarTerms(startYear: number, endYear: number) {
  let successCount = 0;
  let failCount = 0;
  
  for (let year = startYear; year <= endYear; year++) {
    try {
      console.log(`\n📅 ${year}년 처리 중...`);
      
      // API 호출
      const apiData = await fetchHolidaysAPI(year);
      
      if (!apiData || apiData.length === 0) {
        console.log(`  ⚠️  ${year}년 API 데이터 없음`);
        failCount++;
        continue;
      }
      
      // 12절기만 필터링
      const terms12 = apiData.filter((item: any) => 
        TWELVE_TERMS.includes(item.name)
      );
      
      if (terms12.length === 0) {
        console.log(`  ⚠️  ${year}년 12절기 데이터 없음`);
        failCount++;
        continue;
      }
      
      // DB 저장
      for (const term of terms12) {
        const termDate = new Date(term.date);
        const kstDate = new Date(termDate.getTime() + 9 * 60 * 60 * 1000);
        
        await db.insert(solarTerms)
          .values({
            year,
            name: term.name,
            date: termDate,
            kstHour: kstDate.getHours(),
            kstMinute: kstDate.getMinutes(),
            source: "holidays_api",
          })
          .onConflictDoUpdate({
            target: [solarTerms.year, solarTerms.name],
            set: {
              date: termDate,
              kstHour: kstDate.getHours(),
              kstMinute: kstDate.getMinutes(),
              source: "holidays_api",
            },
          });
      }
      
      console.log(`  ✅ ${year}년 완료 (${terms12.length}개 절기)`);
      successCount++;
      
      // API Rate limit 방지
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`  ❌ ${year}년 실패:`, error);
      failCount++;
    }
  }
  
  console.log(`\n\n📊 완료: 성공 ${successCount}년, 실패 ${failCount}년`);
}

// 실행
const args = process.argv.slice(2);
const startYear = parseInt(args[0]) || 1900;
const endYear = parseInt(args[1]) || 2100;

fetchAndStoreSolarTerms(startYear, endYear)
  .then(() => {
    console.log("✅ 모든 작업 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 오류:", error);
    process.exit(1);
  });
