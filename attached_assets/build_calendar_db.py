# -*- coding: utf-8 -*-
"""
1900~2100:
- Lunar calendar (with leap months) via `lunardate`
- 24 Solar Terms (입절일/시각) via `pymeeus` + Espenak–Meeus ΔT polynomials
Outputs: SQLite + CSVs
"""
import math, sqlite3, csv, os
from datetime import datetime, timedelta, timezone
import pandas as pd
from dateutil import tz
from lunardate import LunarDate  # Chinese lunisolar calendar (supports leap months)
from pymeeus.Sun import Sun
from pymeeus.Angle import Angle
from pymeeus.JulianDay import JulianDay

START_YEAR, END_YEAR = 1900, 2100

# --- ΔT: Espenak–Meeus approximation (seconds) ---
# Source summary:
#   - See: "Five Millennium Canon of Solar Eclipses: -1999 to +3000"
#   - Piecewise polynomials by year
def delta_t_seconds(year, month=7):
    y = year + (month - 0.5)/12.0
    # Branches simplified for 1800–2100 coverage
    if y < 1860:
        t = y - 1860
        return 13.72 + 0.332447*t - 0.0068612*(t**2) + 0.0041116*(t**3) + 0.00037436*(t**4) + 0.0000121272*(t**5) + 0.0000001699*(t**6) - 0.000000000875*(t**7)
    elif y < 1900:
        t = y - 1860
        return 7.62 + 0.5737*t - 0.251754*(t**2) + 0.01680668*(t**3) - 0.0004473624*(t**4) + (1/233174.0)*(t**5)
    elif y < 1920:
        t = y - 1900
        return -2.79 + 1.494119*t - 0.0598939*(t**2) + 0.0061966*(t**3) - 0.000197*(t**4)
    elif y < 1941:
        t = y - 1920
        return 21.20 + 0.84493*t - 0.076100*(t**2) + 0.0020936*(t**3)
    elif y < 1961:
        t = y - 1950
        return 29.07 + 0.407*t - (t**2)/233.0 + (t**3)/2547.0
    elif y < 1986:
        t = y - 1975
        return 45.45 + 1.067*t - (t**2)/260.0 - (t**3)/718.0
    elif y < 2005:
        t = y - 2000
        return 63.86 + 0.3345*t - 0.060374*(t**2) + 0.0017275*(t**3) + 0.000651814*(t**4) + 0.00002373599*(t**5)
    elif y < 2050:
        t = y - 2000
        return 62.92 + 0.32217*t + 0.005589*(t**2)
    elif y <= 2100:
        # Linear extrapolation + quadratic term
        t = y - 2000
        return 62.92 + 0.32217*t + 0.005589*(t**2)
    else:
        # Fallback rough
        t = y - 1820
        return -20 + 32*(t**2)

def datetime_to_jd(dt_utc):
    # Convert aware UTC datetime → Julian Day (UT)
    return JulianDay.from_datetime(dt_utc)

def jd_to_datetime_utc(jd):
    return JulianDay(jd).to_datetime()

def sun_ecliptic_longitude_deg(jd_tt):
    # Apparent longitude λ☉ (geocentric) in degrees.
    lam = Sun.apparent_longitude(JulianDay(jd_tt))
    return lam.to_degrees()

def target_longitude_for_index(k):
    # 24 solar terms: 0°, 15°, 30°, ..., 345°
    return (15.0 * (k % 24)) % 360.0

def find_solar_term_utc(year):
    """
    Return list of dict: { 'year':Y, 'index':k, 'term_deg':deg, 'utc':ISO8601 }
    Using binary search on JD(TT) with ΔT to convert to UT.
    """
    results = []
    # initial guesses
    start_utc = datetime(year, 1, 1, 0, 0, tzinfo=timezone.utc)
    end_utc = datetime(year+1, 1, 1, 0, 0, tzinfo=timezone.utc)
    span_days = (end_utc - start_utc).days

    windows = []
    avg_days_per_term = span_days/24.0
    for k in range(24):
        s = start_utc + timedelta(days=avg_days_per_term*k - 4)
        e = start_utc + timedelta(days=avg_days_per_term*(k+1) + 4)
        if s < start_utc - timedelta(days=7): s = start_utc - timedelta(days=7)
        if e > end_utc + timedelta(days=7): e = end_utc + timedelta(days=7)
        windows.append((k, s, e))

    for k, wstart, wend in windows:
        target = target_longitude_for_index(k)
        def f(dt_utc):
            year = dt_utc.year
            dt_sec = delta_t_seconds(year, dt_utc.month)
            jd_ut = datetime_to_jd(dt_utc).get()
            jd_tt = jd_ut + dt_sec/86400.0
            lam = sun_ecliptic_longitude_deg(jd_tt)
            diff = (lam - target + 540.0) % 360.0 - 180.0
            return diff

        # bracket
        steps = 60
        grid = [wstart + timedelta(seconds=(i/steps)*(wend - wstart).total_seconds()) for i in range(steps+1)]
        fa = f(grid[0])
        found = False
        for i in range(1, len(grid)):
            fx = f(grid[i])
            if fa == 0 or fx == 0 or (fa < 0 and fx > 0) or (fa > 0 and fx < 0):
                a = grid[i-1]; b = grid[i]
                fa = f(a); fb = f(b)
                found = True
                break
            fa = fx
        if not found:
            best = min(grid, key=lambda t: abs(f(t)))
            root = best
        else:
            # bisection
            for _ in range(50):
                mid = a + (b - a)/2
                fm = f(mid)
                if abs(fm) < 1e-6:
                    root = mid
                    break
                if (fa < 0 and fm > 0) or (fa > 0 and fm < 0):
                    b = mid
                else:
                    a = mid
                fa = f(a)
            else:
                root = a + (b - a)/2

        # nearest minute
        root = root.replace(second=0, microsecond=0)
        best = root
        best_abs = abs(f(root))
        for dt in [root + timedelta(minutes=dm) for dm in range(-5,6)]:
            val = abs(f(dt))
            if val < best_abs:
                best_abs = val
                best = dt
        results.append({
            "year": year,
            "index": k,
            "term_deg": target,
            "utc": best.isoformat().replace("+00:00","Z")
        })
    results.sort(key=lambda x: x["utc"])
    return results

def build_solar_terms_csv(csv_path):
    rows = []
    for y in range(START_YEAR, END_YEAR+1):
        terms = find_solar_term_utc(y)
        for t in terms:
            rows.append([t["year"], t["index"], int(t["term_deg"]), t["utc"]])
    df = pd.DataFrame(rows, columns=["year","term_index","ecliptic_longitude_deg","utc_time"])
    df.to_csv(csv_path, index=False, encoding="utf-8")
    return df

def build_lunar_calendar_csv(csv_path):
    rows = []
    start = datetime(START_YEAR,1,1,tzinfo=timezone.utc)
    end = datetime(END_YEAR,12,31,tzinfo=timezone.utc)
    cur = start
    while cur <= end:
        y,m,d = cur.year, cur.month, cur.day
        try:
            ld = LunarDate.fromSolarDate(y,m,d)
            rows.append([y,m,d, ld.year, ld.month, ld.day, 1 if ld.leap else 0])
        except Exception:
            rows.append([y,m,d, None, None, None, None])
        cur += timedelta(days=1)
    df = pd.DataFrame(rows, columns=[
        "greg_year","greg_month","greg_day",
        "lunar_year","lunar_month","lunar_day","is_leap_month"
    ])
    df.to_csv(csv_path, index=False, encoding="utf-8")
    return df

def build_sqlite(db_path, lunar_df, terms_df):
    if os.path.exists(db_path):
        os.remove(db_path)
    con = sqlite3.connect(db_path)
    lunar_df.to_sql("lunar_calendar", con, index=False)
    terms_df.to_sql("solar_terms_24", con, index=False)
    con.execute("CREATE INDEX IF NOT EXISTS idx_lunar_date ON lunar_calendar(greg_year,greg_month,greg_day)")
    con.execute("CREATE INDEX IF NOT EXISTS idx_solar_terms ON solar_terms_24(year,term_index)")
    con.commit()
    con.close()

def main():
    out_db = "east_asia_calendar_1900_2100.sqlite"
    out_lunar = "lunar_calendar_1900_2100.csv"
    out_terms = "solar_terms_24_1900_2100.csv"

    print("[1/3] 24절기 계산(ΔT 보정 포함, UTC 기준) ...")
    terms_df = build_solar_terms_csv(out_terms)
    print("[✓] solar terms ->", out_terms)

    print("[2/3] 음력/윤달 테이블 생성 ...")
    lunar_df = build_lunar_calendar_csv(out_lunar)
    print("[✓] lunar calendar ->", out_lunar)

    print("[3/3] SQLite DB 빌드 ...")
    build_sqlite(out_db, lunar_df, terms_df)
    print("[✓] sqlite ->", out_db)

    print("완료!")

if __name__ == "__main__":
    main()
