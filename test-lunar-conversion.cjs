// 음력 변환 라이브러리 테스트
const { Solar } = require('lunar-javascript');
const KoreanLunarCalendar = require('korean-lunar-calendar');

function testLunarConversion() {
  console.log('=== 음력 변환 테스트 ===');
  
  // 테스트 날짜: 양력 1975.1.14
  const testYear = 1975;
  const testMonth = 1;
  const testDay = 14;
  
  console.log(`테스트 날짜: 양력 ${testYear}.${testMonth}.${testDay}`);
  console.log('');
  
  // 1. lunar-javascript 라이브러리 테스트
  try {
    console.log('=== lunar-javascript 결과 ===');
    const solar = Solar.fromYmd(testYear, testMonth, testDay);
    const lunar = solar.getLunar();
    console.log(`음력: ${lunar.getYear()}.${lunar.getMonth()}.${lunar.getDay()}`);
  } catch (error) {
    console.log('lunar-javascript 오류:', error.message);
  }
  
  console.log('');
  
  // 2. korean-lunar-calendar 라이브러리 테스트
  try {
    console.log('=== korean-lunar-calendar 결과 ===');
    const cal = new KoreanLunarCalendar();
    cal.setSolarDate(testYear, testMonth, testDay);
    const lunarInfo = cal.getLunarCalendar();
    console.log(`음력: ${lunarInfo.year}.${lunarInfo.month}.${lunarInfo.day} (윤달: ${lunarInfo.intercalation})`);
  } catch (error) {
    console.log('korean-lunar-calendar 오류:', error.message);
  }
  
  console.log('');
  
  // 추가 테스트: 다른 날짜들
  const additionalTests = [
    [1975, 2, 14],
    [1974, 12, 3],
    [2025, 1, 14]
  ];
  
  console.log('=== 추가 테스트 날짜들 ===');
  additionalTests.forEach(([y, m, d]) => {
    console.log(`\n양력 ${y}.${m}.${d}:`);
    
    // lunar-javascript
    try {
      const solar = Solar.fromYmd(y, m, d);
      const lunar = solar.getLunar();
      console.log(`  lunar-javascript: ${lunar.getYear()}.${lunar.getMonth()}.${lunar.getDay()}`);
    } catch (error) {
      console.log(`  lunar-javascript 오류: ${error.message}`);
    }
    
    // korean-lunar-calendar
    try {
      const cal = new KoreanLunarCalendar();
      cal.setSolarDate(y, m, d);
      const lunarInfo = cal.getLunarCalendar();
      console.log(`  korean-lunar-calendar: ${lunarInfo.year}.${lunarInfo.month}.${lunarInfo.day}`);
    } catch (error) {
      console.log(`  korean-lunar-calendar 오류: ${error.message}`);
    }
  });
}

testLunarConversion();