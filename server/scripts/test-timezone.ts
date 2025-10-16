// UTC 변환 테스트
const year = 1960;
const month = 1;
const day = 6;
const hour = 16;
const minute = 43;

console.log("=== KST → UTC 변환 테스트 ===\n");

console.log(`Input (KST): ${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour}:${minute}`);

// 방법 1: Date.UTC + 9시간 빼기
const kstMillis = Date.UTC(year, month - 1, day, hour, minute);
const utcDate1 = new Date(kstMillis - 9 * 60 * 60 * 1000);
console.log(`\nDate.UTC - 9h: ${utcDate1.toISOString()}`);

// 방법 2: 직접 9시간 빼기
const utcDate2 = new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
console.log(`Date.UTC(h-9): ${utcDate2.toISOString()}`);

// 방법 3: KST 문자열 파싱
const kstString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00+09:00`;
const utcDate3 = new Date(kstString);
console.log(`ISO string:    ${utcDate3.toISOString()}`);

console.log("\n=== 올바른 변환 ===");
console.log(`KST 1960-01-06 16:43 = UTC 1960-01-06 07:43`);
