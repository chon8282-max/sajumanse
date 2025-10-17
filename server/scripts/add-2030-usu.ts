import { storage } from '../storage';

async function add2030Usu() {
  // 2030년 우수 보간 데이터 (2029년 + 2031년 평균)
  // 2029년 우수: 2월 18일 18:08
  // 2031년 우수: 2월 19일 5:51
  // 보간 결과: 2월 18일 23:59
  
  const kstDate = new Date(2030, 1, 18, 23, 59); // 2월 = 1 (0-based)
  const utcDate = new Date(kstDate.getTime() - 9 * 60 * 60 * 1000);
  
  await storage.createSolarTerm({
    year: 2030,
    name: '우수',
    date: utcDate,
    kstHour: 23,
    kstMinute: 59,
    source: 'kasi (보간)'
  });
  
  console.log('✅ 2030년 우수 보간 데이터 추가 완료');
  
  const check = await storage.getSolarTermsForYear(2030);
  const usu = check.filter(t => t.name === '우수');
  console.log('확인:', usu);
  
  process.exit(0);
}

add2030Usu();
