import { CHEONGAN, JIJI } from "@shared/schema";
import { storage } from "../storage";
import * as cheerio from 'cheerio';

// 60갑자 생성
function generate60Ganji(): { sky: string; earth: string; label: string }[] {
  const ganji: { sky: string; earth: string; label: string }[] = [];
  for (let i = 0; i < 60; i++) {
    const sky = CHEONGAN[i % 10];
    const earth = JIJI[i % 12];
    ganji.push({ sky, earth, label: `${sky}${earth}` });
  }
  return ganji;
}

// 한자 간지 → 한글 간지 변환
const GANJI_TO_KOREAN: { [key: string]: string } = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
  '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해'
};

function toKoreanGanji(chineseGanji: string): string {
  return chineseGanji.split('').map(char => GANJI_TO_KOREAN[char] || char).join('');
}

// 연도별 간지 계산 (1904년 = 갑진년 기준)
function getYearGanji(year: number): { chinese: string; korean: string } {
  const ganji60 = generate60Ganji();
  
  // 1904년 = 갑진년 (40번째: 甲=0, 辰=4)
  const base1904Index = 40;
  const yearOffset = year - 1904;
  const ganjiIndex = (base1904Index + yearOffset) % 60;
  
  const chinese = ganji60[ganjiIndex].label;
  const korean = toKoreanGanji(chinese);
  
  return { chinese, korean };
}

interface SolarTermData {
  name: string;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

// bebeyam HTML에서 절기 데이터 추출
async function fetchBebeyamData(year: number): Promise<SolarTermData[]> {
  const ganji = getYearGanji(year);
  const url = `https://bebeyam.com/사주-만세력-${year}년-${ganji.korean}년-24절기-절입시간-입춘/`;
  
  console.log(`  Fetching: ${year}년 (${ganji.korean})`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const terms: SolarTermData[] = [];
    
    // 표에서 데이터 추출 (thead 제외)
    $('table tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 6) {
        const name = $(cells[0]).text().trim();
        const month = parseInt($(cells[2]).text().trim());
        const day = parseInt($(cells[3]).text().trim());
        const hour = parseInt($(cells[4]).text().trim());
        const minute = parseInt($(cells[5]).text().trim());
        
        if (name && !isNaN(month) && !isNaN(day) && !isNaN(hour) && !isNaN(minute)) {
          terms.push({ name, month, day, hour, minute });
        }
      }
    });
    
    return terms;
  } catch (error) {
    console.error(`  ❌ 실패 [${url}]: ${error}`);
    return [];
  }
}

// DB에 저장
async function saveTermsToDB(year: number, terms: SolarTermData[]) {
  let inserted = 0;
  let replaced = 0;
  
  // 기존 데이터 조회 (한 번만)
  const existingTerms = await storage.getSolarTerms(year);
  const existingMap = new Map(existingTerms.map(t => [t.name, t]));
  
  for (const term of terms) {
    // 1954-1961년은 E127°30' 자오선 (+30분 보정 필요)
    // bebeyam 데이터는 당시 표준시각이므로, 현재 E135° 기준으로 변환
    let adjustedDay = term.day;
    let adjustedHour = term.hour;
    let adjustedMinute = term.minute;
    
    if (year >= 1954 && year <= 1961) {
      // 30분 추가 (당시 시각 → 현재 표준시)
      adjustedMinute += 30;
      if (adjustedMinute >= 60) {
        adjustedMinute -= 60;
        adjustedHour += 1;
        if (adjustedHour >= 24) {
          adjustedHour -= 24;
          adjustedDay += 1; // 날짜도 +1일
          // 월말 처리는 Date 객체가 자동 처리
        }
      }
    }
    
    // KST → UTC 변환
    // 먼저 KST 시각을 UTC 밀리초로 만들고, 9시간을 빼서 UTC로 변환
    const kstMillis = Date.UTC(
      year,
      term.month - 1,
      adjustedDay,
      adjustedHour,
      adjustedMinute
    );
    const utcDate = new Date(kstMillis - 9 * 60 * 60 * 1000);
    
    const existing = existingMap.get(term.name);
    if (existing) {
      replaced++;
    } else {
      inserted++;
    }
    
    await storage.createSolarTerm({
      year,
      name: term.name,
      date: utcDate,
      kstHour: adjustedHour,
      kstMinute: adjustedMinute,
      source: 'bebeyam'
    });
  }
  
  console.log(`  ✅ ${year}년: ${inserted}개 삽입, ${replaced}개 교체`);
}

async function collectAll() {
  console.log('📅 bebeyam.com 1946-2005년 24절기 데이터 수집 시작\n');
  
  const START_YEAR = 1946;
  const END_YEAR = 2005; // 전체: 1946-2005년 (60개 연도, 1,440개 절기)
  
  let totalCollected = 0;
  let totalFailed = 0;
  
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const terms = await fetchBebeyamData(year);
    
    if (terms.length > 0) {
      await saveTermsToDB(year, terms);
      totalCollected++;
    } else {
      totalFailed++;
    }
    
    // 서버 부하 방지를 위한 짧은 대기
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n📊 수집 완료:');
  console.log(`  ✅ 성공: ${totalCollected}개 연도`);
  console.log(`  ❌ 실패: ${totalFailed}개 연도`);
  console.log(`  📦 총 절기: ${totalCollected * 24}개 (예상)`);
}

collectAll()
  .then(() => {
    console.log('✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 에러:', err);
    process.exit(1);
  });
