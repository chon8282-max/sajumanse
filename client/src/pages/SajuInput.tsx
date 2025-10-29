import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { localDB } from "@/lib/saju-local-storage";
import { TRADITIONAL_TIME_PERIODS } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { calculateSaju } from "@/lib/saju-calculator";

interface Group {
  id: string;
  name: string;
  isDefault: boolean;
}

// 한국 서머타임 적용 기간 데이터
const KOREA_DST_PERIODS = [
  { year: 1948, startMonth: 6, startDay: 1, endMonth: 9, endDay: 13 },
  { year: 1949, startMonth: 4, startDay: 3, endMonth: 9, endDay: 11 },
  { year: 1950, startMonth: 4, startDay: 1, endMonth: 9, endDay: 10 },
  { year: 1951, startMonth: 5, startDay: 6, endMonth: 9, endDay: 9 },
  { year: 1955, startMonth: 5, startDay: 5, endMonth: 9, endDay: 9 },
  { year: 1956, startMonth: 5, startDay: 20, endMonth: 9, endDay: 30 },
  { year: 1957, startMonth: 5, startDay: 5, endMonth: 9, endDay: 22 },
  { year: 1958, startMonth: 5, startDay: 4, endMonth: 9, endDay: 21 },
  { year: 1959, startMonth: 5, startDay: 3, endMonth: 9, endDay: 20 },
  { year: 1960, startMonth: 5, startDay: 1, endMonth: 9, endDay: 18 },
  { year: 1987, startMonth: 5, startDay: 10, endMonth: 10, endDay: 11 },
  { year: 1988, startMonth: 5, startDay: 8, endMonth: 10, endDay: 9 },
];

// 서머타임 기간 체크 함수
function checkDSTPeriod(year: number, month: number, day: number): { isDST: boolean; period?: typeof KOREA_DST_PERIODS[0] } {
  const dstPeriod = KOREA_DST_PERIODS.find(p => p.year === year);
  
  if (!dstPeriod) {
    return { isDST: false };
  }
  
  // 시작일과 종료일 사이인지 확인
  const inputDate = new Date(year, month - 1, day);
  const startDate = new Date(year, dstPeriod.startMonth - 1, dstPeriod.startDay);
  const endDate = new Date(year, dstPeriod.endMonth - 1, dstPeriod.endDay);
  
  if (inputDate >= startDate && inputDate < endDate) {
    return { isDST: true, period: dstPeriod };
  }
  
  return { isDST: false };
}

// 절입일 체크 함수 (서버 API 사용, 당일만 체크)
async function checkSolarTermDay(year: number, month: number, day: number): Promise<{ isSolarTerm: boolean; termInfo?: { name: string; hour: number; minute: number } }> {
  try {
    const response = await fetch(`/api/solar-terms/${year}`);
    const result = await response.json();
    
    if (!result.success || !result.data) {
      console.error('절입일 데이터 로드 실패:', result);
      return { isSolarTerm: false };
    }
    
    // 해당 년도의 모든 절기 중에서 당일 절입일 찾기
    const solarTerms = result.data;
    for (const term of solarTerms) {
      // UTC date에 9시간(KST offset)을 더해서 KST 날짜 계산
      const termDateUTC = new Date(term.date);
      const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
      const termDateKST = new Date(termDateUTC.getTime() + kstOffset);
      
      // KST 날짜 추출 (getUTC* 메서드를 사용하지만 이미 KST로 조정된 Date 객체)
      const kstYear = termDateKST.getUTCFullYear();
      const kstMonth = termDateKST.getUTCMonth() + 1;
      const kstDay = termDateKST.getUTCDate();
      
      // 입력 날짜와 절입일 KST 날짜가 정확히 일치하는지 확인
      if (kstYear === year && kstMonth === month && kstDay === day) {
        // kstHour, kstMinute는 API에서 제공하는 값 사용
        return {
          isSolarTerm: true,
          termInfo: {
            name: term.name,
            hour: term.kstHour,
            minute: term.kstMinute
          }
        };
      }
    }
    
    return { isSolarTerm: false };
  } catch (error) {
    console.error('절입일 체크 중 오류:', error);
    return { isSolarTerm: false };
  }
}

export default function SajuInput() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [showSolarTermDialog, setShowSolarTermDialog] = useState(false);
  const [solarTermInfo, setSolarTermInfo] = useState<{ name: string; hour: number; minute: number; previousGanji?: string; afterGanji?: string } | null>(null);
  const [convertedSolarDate, setConvertedSolarDate] = useState<{ year: number; month: number; day: number } | null>(null);
  
  // 편집 모드 확인 (URL 파라미터로 edit=true와 id 존재 여부)
  const urlParams = new URLSearchParams(window.location.search);
  const isEditMode = urlParams.get('edit') === 'true' && urlParams.has('id');
  
  const [formData, setFormData] = useState({
    name: "",
    calendarType: "양력",
    year: "",
    month: "",
    day: "",
    birthTime: "",
    selectedTimeCode: "",
    birthTimeUnknown: false,
    gender: "남자",
    groupId: "",
    memo: "",
  });

  // 엔터키로 다음 입력창 이동 핸들러
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextFieldId?: string) => {
    if (e.key === 'Enter' && nextFieldId) {
      e.preventDefault();
      const nextField = document.getElementById(nextFieldId) as HTMLInputElement;
      if (nextField) {
        nextField.focus();
      }
    }
  };

  // 쿼리 파라미터에서 초기 데이터 로드 (수정 모드)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    // edit=true이고 id가 있을 때만 편집 모드로 데이터 로드
    if (urlParams.get('edit') === 'true' && urlParams.has('id')) {
      const queryData = {
        name: urlParams.get('name') || "",
        calendarType: urlParams.get('calendarType') || "양력",
        year: urlParams.get('year') || "",
        month: urlParams.get('month') || "",
        day: urlParams.get('day') || "",
        birthTime: urlParams.get('birthTime') || "",
        selectedTimeCode: "",
        birthTimeUnknown: !urlParams.get('birthTime'),
        gender: urlParams.get('gender') || "남자",
        groupId: urlParams.get('groupId') || "",
        memo: urlParams.get('memo') || "",
      };
      
      console.log('Loading data from query params:', queryData);
      setFormData(queryData);
    }
  }, []);

  // 그룹 목록 조회 (로컬 저장소)
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["local-groups"],
    queryFn: async () => await localDB.getGroups(),
  });

  // 새 그룹 생성 뮤테이션 (로컬 저장소)
  const createGroupMutation = useMutation({
    mutationFn: async (groupName: string) => {
      return await localDB.createGroup({ name: groupName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-groups"] });
      setNewGroupName("");
      setIsGroupDialogOpen(false);
      toast({
        title: "그룹 생성 완료",
        description: "새 그룹이 성공적으로 생성되었습니다.",
        duration: 700
      });
    },
    onError: (error: Error) => {
      toast({
        title: "그룹 생성 실패",
        description: error.message,
        variant: "destructive",
        duration: 700
      });
    },
  });

  const handleBackToManseryeok = () => {
    setLocation("/manseryeok");
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 서머타임 체크
  const dstCheck = checkDSTPeriod(
    parseInt(formData.year) || 0,
    parseInt(formData.month) || 0,
    parseInt(formData.day) || 0
  );

  const handleSubmit = async (usePreviousMonthPillar?: boolean) => {
    // 생년월일 필수 검증
    const yearNum = parseInt(formData.year);
    const monthNum = parseInt(formData.month);
    const dayNum = parseInt(formData.day);
    
    if (!formData.year || !formData.month || !formData.day || 
        isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) ||
        yearNum < 1900 || yearNum > 2100 ||
        monthNum < 1 || monthNum > 12 ||
        dayNum < 1 || dayNum > 31) {
      toast({
        title: "입력 오류", 
        description: "올바른 생년월일을 입력해주세요. (년: 1900-2100, 월: 1-12, 일: 1-31)",
        variant: "destructive",
        duration: 700
      });
      return;
    }

    // 절입일 체크 (대화상자가 아직 표시되지 않았을 때만)
    if (usePreviousMonthPillar === undefined) {
      let solarYear = yearNum;
      let solarMonth = monthNum;
      let solarDay = dayNum;
      
      // 생시 파싱 (절입 시각 비교용)
      let inputHour: number | null = null;
      let inputMinute = 0;
      if (formData.selectedTimeCode && !formData.birthTimeUnknown) {
        const timePeriod = TRADITIONAL_TIME_PERIODS.find(p => p.code === formData.selectedTimeCode);
        if (timePeriod) {
          inputHour = timePeriod.hour;
        }
      } else if (formData.birthTime && !formData.birthTimeUnknown) {
        const timeStr = formData.birthTime.trim();
        if (timeStr.includes(':')) {
          const parts = timeStr.split(':');
          inputHour = parseInt(parts[0]) || null;
          inputMinute = parseInt(parts[1]) || 0;
        } else {
          inputHour = parseInt(timeStr) || null;
        }
      }

      // 음력/윤달인 경우 양력으로 변환 후 체크
      if (formData.calendarType === "음력" || formData.calendarType === "윤달") {
        try {
          console.log(`🔄 음력→양력 변환 시작: ${yearNum}-${monthNum}-${dayNum} (${formData.calendarType})`);
          const response = await fetch('/api/lunar-solar/convert/solar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lunYear: yearNum,
              lunMonth: monthNum,
              lunDay: dayNum,
              isLeapMonth: formData.calendarType === "윤달"
            })
          });
          const result = await response.json();
          console.log('📅 변환 결과:', result);
          
          if (result.success && result.data) {
            solarYear = result.data.solYear;
            solarMonth = result.data.solMonth;
            solarDay = result.data.solDay;
            // 변환된 양력 날짜 저장
            setConvertedSolarDate({ year: solarYear, month: solarMonth, day: solarDay });
            console.log(`✅ 변환 완료: ${solarYear}-${solarMonth}-${solarDay}`);
          }
        } catch (error) {
          console.error('❌ 음력→양력 변환 실패:', error);
          // 변환 실패시 그냥 진행
        }
      } else {
        // 양력 입력인 경우 변환 날짜 초기화
        setConvertedSolarDate(null);
      }

      // 변환된 양력 날짜로 절입일 체크
      console.log(`🔍 절입일 체크: ${solarYear}-${solarMonth}-${solarDay}, 생시=${inputHour !== null ? inputHour : '모름'}:${inputMinute}`);
      const solarTermCheck = await checkSolarTermDay(solarYear, solarMonth, solarDay);
      console.log('📊 절입일 체크 결과:', solarTermCheck);
      
      // 생시가 명확한 경우, 절입 시각과 비교해서 다이얼로그 표시 여부 결정
      // 단, 입춘일은 연주가 바뀌므로 생시와 무관하게 무조건 다이얼로그 표시
      let shouldShowDialog = true;
      if (solarTermCheck.isSolarTerm && solarTermCheck.termInfo) {
        const isLichun = solarTermCheck.termInfo.name === '입춘';
        
        if (isLichun) {
          console.log(`🌸 입춘일이므로 생시와 무관하게 다이얼로그 표시`);
          shouldShowDialog = true;
        } else if (inputHour !== null) {
          const termHour = solarTermCheck.termInfo.hour;
          const termMinute = solarTermCheck.termInfo.minute;
          const inputTotalMinutes = inputHour * 60 + inputMinute;
          const termTotalMinutes = termHour * 60 + termMinute;
          const timeDiff = Math.abs(inputTotalMinutes - termTotalMinutes);
          
          // 절입 시각과 2시간(120분) 이상 차이나면 다이얼로그 표시 안함
          if (timeDiff > 120) {
            console.log(`⏭️ 생시(${inputHour}:${inputMinute})와 절입 시각(${termHour}:${termMinute})이 ${Math.floor(timeDiff/60)}시간 ${timeDiff%60}분 차이 → 다이얼로그 생략`);
            shouldShowDialog = false;
          } else {
            console.log(`⚠️ 생시(${inputHour}:${inputMinute})와 절입 시각(${termHour}:${termMinute})이 ${Math.floor(timeDiff/60)}시간 ${timeDiff%60}분 차이 → 다이얼로그 표시`);
          }
        }
      }
      
      if (solarTermCheck.isSolarTerm && solarTermCheck.termInfo && shouldShowDialog) {
        console.log('🎯 절입일 발견! 다이얼로그 표시');
        
        const CHEONGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
        const JIJI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
        
        // 연주 간지 계산 함수
        const getYearGanji = (year: number) => {
          const yearFromBase = year - 1924;
          const yearIndex = ((yearFromBase % 60) + 60) % 60;
          const skyIndex = yearIndex % 10;
          const earthIndex = yearIndex % 12;
          return { sky: CHEONGAN[skyIndex], earth: JIJI[earthIndex], skyIndex, earthIndex };
        };
        
        // 월주 간지 계산 함수 (년주 천간 기준)
        const getMonthGanji = (yearSkyIndex: number, monthEarthIndex: number) => {
          // 월주 천간 시작 인덱스 (인월 기준)
          let monthSkyStart: number;
          if (yearSkyIndex === 0 || yearSkyIndex === 5) monthSkyStart = 2; // 甲己년: 인월=丙
          else if (yearSkyIndex === 1 || yearSkyIndex === 6) monthSkyStart = 4; // 乙庚년: 인월=戊
          else if (yearSkyIndex === 2 || yearSkyIndex === 7) monthSkyStart = 6; // 丙辛년: 인월=庚
          else if (yearSkyIndex === 3 || yearSkyIndex === 8) monthSkyStart = 8; // 丁壬년: 인월=壬
          else monthSkyStart = 0; // 戊癸년: 인월=甲
          
          // monthEarthIndex: 0=인월, 1=묘월, ..., 11=축월
          // 월주 천간 = 인월 천간 + monthEarthIndex (mod 10)
          // 예: 乙庚년 축월(11) = 戊(4) + 11 = 己(15 % 10 = 5)
          const monthSkyIndex = (monthSkyStart + monthEarthIndex) % 10;
          return { sky: CHEONGAN[monthSkyIndex], earth: JIJI[(monthEarthIndex + 2) % 12] }; // 인월=寅(2), 묘월=卯(3), ..., 축월=丑(1)
        };
        
        let previousGanji: string, afterGanji: string;
        
        if (solarTermCheck.termInfo.name === '입춘') {
          // 입춘: 절입전은 전년도 간지 + 전년도 월주법의 축월
          const prevYear = getYearGanji(solarYear - 1);
          const prevMonth = getMonthGanji(prevYear.skyIndex, 11); // 축월 = 11
          previousGanji = `${prevYear.sky}${prevYear.earth}년 ${prevMonth.sky}${prevMonth.earth}월`;
          
          // 입춘: 절입후는 당해년도 간지 + 당해년도 월주법의 인월
          const currYear = getYearGanji(solarYear);
          const currMonth = getMonthGanji(currYear.skyIndex, 0); // 인월 = 0
          afterGanji = `${currYear.sky}${currYear.earth}년 ${currMonth.sky}${currMonth.earth}월`;
        } else {
          // 다른 절기: 년주는 그대로, 월주만 전월/당월
          const currYear = getYearGanji(solarYear);
          
          // 현재 절기의 월 인덱스 (인월=0, 묘월=1, ...)
          // 각 월은 2개의 절기로 구성: 첫 번째 절기와 두 번째 절기 모두 같은 월
          const termMonthMap: { [key: string]: number } = {
            '소한': 11, '대한': 11,  // 축월
            '입춘': 0, '우수': 0,    // 인월
            '경칩': 1, '춘분': 1,    // 묘월
            '청명': 2, '곡우': 2,    // 진월
            '입하': 3, '소만': 3,    // 사월
            '망종': 4, '하지': 4,    // 오월
            '소서': 5, '대서': 5,    // 미월
            '입추': 6, '처서': 6,    // 신월
            '백로': 7, '추분': 7,    // 유월
            '한로': 8, '상강': 8,    // 술월
            '입동': 9, '소설': 9,    // 해월
            '대설': 10, '동지': 10   // 자월
          };
          const currentMonthIndex = termMonthMap[solarTermCheck.termInfo.name] ?? 0;
          const prevMonthIndex = (currentMonthIndex - 1 + 12) % 12;
          
          const prevMonth = getMonthGanji(currYear.skyIndex, prevMonthIndex);
          previousGanji = `${currYear.sky}${currYear.earth}년 ${prevMonth.sky}${prevMonth.earth}월`;
          
          const currMonth = getMonthGanji(currYear.skyIndex, currentMonthIndex);
          afterGanji = `${currYear.sky}${currYear.earth}년 ${currMonth.sky}${currMonth.earth}월`;
        }
        
        console.log(`절입일 간지 계산: 절입전=${previousGanji}, 절입후=${afterGanji}`);
        
        setSolarTermInfo({
          ...solarTermCheck.termInfo,
          previousGanji,
          afterGanji
        });
        setShowSolarTermDialog(true);
        return; // 대화상자 표시 후 여기서 멈춤
      } else {
        console.log('❎ 절입일 아님');
        // 절입일이 아니면 변환된 날짜 초기화
        setConvertedSolarDate(null);
      }
    }

    setIsSubmitting(true);

    try {
      // 편집 모드 확인
      const urlParams = new URLSearchParams(window.location.search);
      const submitIsEditMode = urlParams.get('edit') === 'true' && urlParams.has('id');
      const editId = urlParams.get('id');

      // API 요청 데이터 준비 (이름이 비어있으면 "이름없음" 사용)
      const requestData: any = {
        name: formData.name.trim() || "이름없음",
        birthYear: yearNum,
        birthMonth: monthNum,
        birthDay: dayNum,
        birthTime: formData.selectedTimeCode || formData.birthTime.trim() || null,
        calendarType: formData.calendarType,
        gender: formData.gender,
        groupId: formData.groupId === "none" ? null : formData.groupId || null,
        memo: formData.memo.trim() || null,
      };

      // 절입일 전월 간지 적용: 클라이언트에서 직접 계산한 사주 전달
      if (usePreviousMonthPillar !== undefined) {
        requestData.usePreviousMonthPillar = usePreviousMonthPillar;
        
        // 음력 입력이었다면 변환된 양력 날짜를 requestData에 반영
        if (convertedSolarDate) {
          // 원본 음력 정보 별도 저장
          requestData.lunarYear = yearNum;
          requestData.lunarMonth = monthNum;
          requestData.lunarDay = dayNum;
          requestData.isLeapMonth = formData.calendarType === "윤달";
          
          // 변환된 양력 날짜로 업데이트
          requestData.birthYear = convertedSolarDate.year;
          requestData.birthMonth = convertedSolarDate.month;
          requestData.birthDay = convertedSolarDate.day;
          
          // calendarType을 양력으로 변경 (서버가 중복 변환하지 않도록)
          requestData.calendarType = "양력";
        }
        
        // 절입일 사주 무조건 직접 계산
        try {
          const CHEONGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
          const JIJI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
          
          // 시주 파싱
          let hour = 12;
          let minute = 0;
          if (formData.selectedTimeCode) {
            const timePeriod = TRADITIONAL_TIME_PERIODS.find(p => p.code === formData.selectedTimeCode);
            if (timePeriod) {
              hour = timePeriod.hour;
            }
          }
          
          // 양력 날짜 (음력 입력이었다면 변환된 양력 날짜 사용)
          let solarYear = convertedSolarDate?.year || yearNum;
          let solarMonth = convertedSolarDate?.month || monthNum;
          let solarDay = convertedSolarDate?.day || dayNum;
          
          // 월 인덱스 맵 (인월=0, 묘월=1, ..., 축월=11)
          // 각 월은 2개의 절기로 구성: 첫 번째 절기와 두 번째 절기 모두 같은 월
          const termMonthMap: { [key: string]: number} = {
            '소한': 11, '대한': 11,  // 축월
            '입춘': 0, '우수': 0,    // 인월
            '경칩': 1, '춘분': 1,    // 묘월
            '청명': 2, '곡우': 2,    // 진월
            '입하': 3, '소만': 3,    // 사월
            '망종': 4, '하지': 4,    // 오월
            '소서': 5, '대서': 5,    // 미월
            '입추': 6, '처서': 6,    // 신월
            '백로': 7, '추분': 7,    // 유월
            '한로': 8, '상강': 8,    // 술월
            '입동': 9, '소설': 9,    // 해월
            '대설': 10, '동지': 10   // 자월
          };
          
          // 년주 계산 (입춘 절입전만 년도 변경)
          let targetYear = solarYear;
          if (solarTermInfo?.name === '입춘' && usePreviousMonthPillar) {
            targetYear = solarYear - 1;
          }
          
          const yearIndex = ((targetYear - 1924) % 60 + 60) % 60;
          const yearSky = CHEONGAN[yearIndex % 10];
          const yearEarth = JIJI[yearIndex % 12];
          const yearSkyIndex = yearIndex % 10;
          
          // 월주 계산 (월주법)
          let monthSkyStart: number;
          if (yearSkyIndex === 0 || yearSkyIndex === 5) monthSkyStart = 2; // 甲己년
          else if (yearSkyIndex === 1 || yearSkyIndex === 6) monthSkyStart = 4; // 乙庚년
          else if (yearSkyIndex === 2 || yearSkyIndex === 7) monthSkyStart = 6; // 丙辛년
          else if (yearSkyIndex === 3 || yearSkyIndex === 8) monthSkyStart = 8; // 丁壬년
          else monthSkyStart = 0; // 戊癸년
          
          // 월 인덱스 계산
          const currentMonthIndex = solarTermInfo ? (termMonthMap[solarTermInfo.name] ?? 0) : 0;
          const monthIndex = usePreviousMonthPillar ? (currentMonthIndex - 1 + 12) % 12 : currentMonthIndex;
          
          // 월주 천간 = 인월 천간 + monthIndex (mod 10)
          // 예: 乙庚년 축월(11) = 戊(4) + 11 = 己(15 % 10 = 5)
          const monthSky = CHEONGAN[(monthSkyStart + monthIndex) % 10];
          const monthEarth = JIJI[(monthIndex + 2) % 12]; // 인월=2(寅), 묘월=3(卯), ..., 축월=1(丑)
          
          // 일주/시주는 양력 기준 계산
          const response = await fetch('/api/lunar-solar/convert/lunar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              solYear: solarYear,
              solMonth: solarMonth,
              solDay: solarDay
            })
          });
          const lunarData = await response.json();
          
          // 년주/월주는 클라이언트에서 계산, 일시주는 서버에서 계산됨
          // (DB 절기 데이터 없이는 정확한 계산 불가)
          requestData.clientCalculatedSaju = {
            yearSky,
            yearEarth,
            monthSky,
            monthEarth,
            daySky: '', // 서버에서 계산
            dayEarth: '', // 서버에서 계산
            hourSky: '', // 서버에서 계산
            hourEarth: '' // 서버에서 계산
          };
          
          console.log(`🎯 절입${usePreviousMonthPillar ? '전' : '후'} 년월주만 전달 (일시주는 서버 계산):`, requestData.clientCalculatedSaju);
        } catch (error) {
          console.error('❌ 절입일 사주 계산 실패:', error);
        }
      }

      console.log("사주 정보 저장 요청:", requestData);

      // 로컬 저장소에 저장 - 편집 모드면 UPDATE, 아니면 CREATE
      let savedRecord;
      if (submitIsEditMode && editId) {
        savedRecord = await localDB.updateSajuRecord(editId, requestData);
        if (!savedRecord) {
          throw new Error("사주 수정에 실패했습니다.");
        }
      } else {
        savedRecord = await localDB.createSajuRecord(requestData);
      }

      // 사주 목록 캐시 새로고침 (저장된 사주가 리스트에 나타나도록)
      queryClient.invalidateQueries({ queryKey: ["local-saju-records"] });
      
      // 감정중인 사주로 sessionStorage에 저장 (앱 종료 전까지 유지)
      if (savedRecord.id) {
        sessionStorage.setItem('currentSajuId', savedRecord.id);
        sessionStorage.setItem('currentSajuName', formData.name);
        sessionStorage.setItem('currentSajuTimestamp', new Date().toISOString());
      }
      
      // 성공시 사주 결과 페이지로 이동
      if (submitIsEditMode && editId) {
        // 편집 모드에서는 편집한 사주의 결과 페이지로 이동
        setLocation(`/saju-result/${editId}`);
      } else if (savedRecord.id) {
        // 새로 생성한 경우 새 사주의 결과 페이지로 이동
        setLocation(`/saju-result/${savedRecord.id}`);
      } else {
        // ID가 없으면 만세력 페이지로 이동
        setLocation("/manseryeok");
      }
    } catch (error) {
      console.error("사주 저장 오류:", error);
      
      // 네트워크 오류인지 확인
      const isNetworkError = error instanceof Error && 
        (error.message.includes("fetch") || error.message.includes("Failed to fetch") || 
         error.message.includes("네트워크") || error.message.includes("network"));
      
      toast({
        title: isNetworkError ? "네트워크 연결 오류" : "저장 실패",
        description: isNetworkError 
          ? "인터넷 연결을 확인하고 다시 시도해주세요."
          : (error instanceof Error ? error.message : "사주 정보 저장 중 오류가 발생했습니다."),
        variant: "destructive",
        duration: 700
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-3 py-1">
      {/* 헤더 */}
      <div className="relative flex items-center mb-1.5">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleBackToManseryeok}
          data-testid="button-back-manseryeok"
          className="absolute left-0 hover-elevate active-elevate-2 flex items-center gap-1 px-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs">뒤로</span>
        </Button>
        <div className="w-full text-center">
          <h1 className="text-lg font-bold text-foreground">사주입력</h1>
          <p className="text-xs text-muted-foreground">정확한 생년월일을 입력하주세요</p>
        </div>
      </div>

      {/* 입력 폼 */}
      <div className="max-w-md mx-auto space-y-2">
        {/* 성명 */}
        <div className="space-y-0.5">
          <Label htmlFor="name" className="text-xs font-medium">성명</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "year")}
            placeholder="이름을 입력하세요"
            data-testid="input-name"
            className="text-sm h-8"
          />
        </div>

        {/* 음양 */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">음양</Label>
          <RadioGroup 
            value={formData.calendarType} 
            onValueChange={(value) => handleInputChange("calendarType", value)}
            className="flex gap-4"
            data-testid="radio-calendar-type"
          >
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="양력" id="yang" data-testid="radio-calendar-yang" />
              <Label htmlFor="yang" className="text-xs">양력</Label>
            </div>
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="음력" id="eum" data-testid="radio-calendar-eum" />
              <Label htmlFor="eum" className="text-xs">음력</Label>
            </div>
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="윤달" id="yoon" data-testid="radio-calendar-yoon" />
              <Label htmlFor="yoon" className="text-xs">윤달</Label>
            </div>
          </RadioGroup>
        </div>

        {/* 년월일 */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">생년월일</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="year"
              type="text"
              inputMode="numeric"
              value={formData.year}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                handleInputChange("year", value);
              }}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => handleKeyDown(e, "month")}
              placeholder=""
              maxLength={4}
              data-testid="input-year"
              className="w-20 text-center h-8"
            />
            <span className="text-xs">년</span>
            <Input
              id="month"
              type="text"
              inputMode="numeric"
              value={formData.month}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                handleInputChange("month", value);
              }}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => handleKeyDown(e, "day")}
              placeholder=""
              maxLength={2}
              data-testid="input-month"
              className="w-16 text-center h-8"
            />
            <span className="text-xs">월</span>
            <Input
              id="day"
              type="text"
              inputMode="numeric"
              value={formData.day}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                handleInputChange("day", value);
              }}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // 생시 Select 컴포넌트 열기
                  const selectTrigger = document.querySelector('[data-testid="select-birth-time"]') as HTMLButtonElement;
                  if (selectTrigger) {
                    selectTrigger.click();
                  }
                }
              }}
              placeholder=""
              maxLength={2}
              data-testid="input-day"
              className="w-16 text-center h-8"
            />
            <span className="text-xs">일</span>
          </div>
        </div>

        {/* 서머타임 안내 문구 */}
        {dstCheck.isDST && dstCheck.period && formData.calendarType === "양력" && (
          <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold">⚠️ 서머타임 적용 기간 안내</div>
              <div>
                양력 {dstCheck.period.year}년 {dstCheck.period.startMonth}월 {dstCheck.period.startDay}일부터<br />
                양력 {dstCheck.period.year}년 {dstCheck.period.endMonth}월 {dstCheck.period.endDay}일까지 서머타임을 실시하였습니다.
              </div>
              <div className="pt-1">
                이 시간은 서머타임 적용기간입니다. 알고 계신 시간에서 <span className="font-bold text-amber-700 dark:text-amber-300">1시간을 빼고</span> 계산하여야 맞습니다.
              </div>
              <div className="text-amber-800 dark:text-amber-300 pt-0.5">
                (예: 출생시간 5시 10분 → 실제적용시간 4시 10분)
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 생시 */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">생시 (전통 십이시)</Label>
          <div className="flex gap-2 items-center">
            <Select 
              value={formData.selectedTimeCode}
              onValueChange={(value) => {
                handleInputChange("selectedTimeCode", value);
                handleInputChange("birthTime", value);
              }}
              disabled={formData.birthTimeUnknown}
            >
              <SelectTrigger data-testid="select-birth-time" className="text-sm h-8 flex-1">
                <SelectValue placeholder="생시를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {TRADITIONAL_TIME_PERIODS.map((period) => (
                  <SelectItem 
                    key={period.code} 
                    value={period.code}
                    data-testid={`select-time-${period.code}`}
                  >
                    {period.name} ({period.range})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-1.5 whitespace-nowrap">
              <Checkbox 
                id="birthTimeUnknown"
                checked={formData.birthTimeUnknown}
                onCheckedChange={(checked) => {
                  handleInputChange("birthTimeUnknown", !!checked);
                  if (checked) {
                    handleInputChange("selectedTimeCode", "");
                    handleInputChange("birthTime", "");
                  }
                }}
                data-testid="checkbox-birth-time-unknown"
              />
              <Label htmlFor="birthTimeUnknown" className="text-xs cursor-pointer leading-tight">
                생시<br/>모름
              </Label>
            </div>
          </div>
        </div>

        {/* 성별 */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">성별</Label>
          <RadioGroup 
            value={formData.gender} 
            onValueChange={(value) => handleInputChange("gender", value)}
            className="flex gap-4"
            data-testid="radio-gender"
          >
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="남자" id="male" data-testid="radio-gender-male" />
              <Label htmlFor="male" className="text-xs">남자</Label>
            </div>
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="여자" id="female" data-testid="radio-gender-female" />
              <Label htmlFor="female" className="text-xs">여자</Label>
            </div>
          </RadioGroup>
        </div>

        {/* 그룹 */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">그룹</Label>
          <div className="flex gap-2">
            <Select 
              value={formData.groupId} 
              onValueChange={(value) => handleInputChange("groupId", value)}
            >
              <SelectTrigger data-testid="select-group" className="text-sm flex-1 h-8">
                <SelectValue placeholder="그룹 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" data-testid="select-group-none">그룹 없음</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id} data-testid={`select-group-${group.id}`}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="whitespace-nowrap h-8"
                  data-testid="button-create-group"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  <span className="text-xs">그룹생성</span>
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-create-group">
                <DialogHeader>
                  <DialogTitle>새 그룹 만들기</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="newGroupName">그룹 이름</Label>
                    <Input
                      id="newGroupName"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="새 그룹 이름을 입력하세요"
                      data-testid="input-new-group-name"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setIsGroupDialogOpen(false)}
                      data-testid="button-cancel-group"
                    >
                      취소
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => {
                        if (newGroupName.trim()) {
                          createGroupMutation.mutate(newGroupName.trim());
                        }
                      }}
                      disabled={!newGroupName.trim() || createGroupMutation.isPending}
                      data-testid="button-save-group"
                    >
                      {createGroupMutation.isPending ? "생성 중..." : "생성"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 메모 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="memo" className="text-xs font-medium">메모</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                const today = new Date();
                const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
                const currentMemo = formData.memo;
                const newMemo = currentMemo ? `${currentMemo}\n${dateString}` : dateString;
                handleInputChange("memo", newMemo);
              }}
              data-testid="button-today-date"
            >
              오늘날짜
            </Button>
          </div>
          <Card>
            <CardContent className="p-2">
              <Textarea
                id="memo"
                value={formData.memo}
                onChange={(e) => handleInputChange("memo", e.target.value)}
                placeholder="메모 입력하는 곳"
                data-testid="textarea-memo"
                className="min-h-14 resize-none border-0 focus-visible:ring-0 text-xs"
              />
            </CardContent>
          </Card>
        </div>

        {/* 제출 버튼 */}
        <div className="pt-1">
          <Button 
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="w-full text-sm"
            data-testid="button-submit-saju"
          >
            {isSubmitting ? "저장 중..." : "사주 뽑기"}
          </Button>
        </div>
      </div>

      {/* 절입일 확인 대화상자 */}
      <Dialog open={showSolarTermDialog} onOpenChange={setShowSolarTermDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">절입일 안내</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <p className="text-base font-semibold">
                {solarTermInfo?.name} 절입일입니다
              </p>
              <p className="text-sm text-muted-foreground">
                절입시간: {solarTermInfo?.hour}시 {String(solarTermInfo?.minute).padStart(2, '0')}분
              </p>
              <p className="text-sm font-medium mt-3">
                어떤 월주를 사용하시겠습니까?
              </p>
            </div>
            <div className="space-y-2 text-sm px-2">
              <p className="text-foreground">
                <strong className="text-primary">절입 전:</strong> {solarTermInfo?.previousGanji || ''}
              </p>
              <p className="text-foreground">
                <strong className="text-primary">절입 후:</strong> {solarTermInfo?.afterGanji || ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowSolarTermDialog(false);
                handleSubmit(true); // 전월 간지: 월주 -1 (정묘, 계축)
              }}
              data-testid="button-solar-term-previous"
            >
              절입 전 사용
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setShowSolarTermDialog(false);
                handleSubmit(false); // 절입 후 간지: 그대로 유지 (무진, 갑인)
              }}
              data-testid="button-solar-term-after"
            >
              절입 후 사용
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}