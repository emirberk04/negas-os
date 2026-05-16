// Open-Meteo — key gerektirmez, Konya hava durumu
// https://open-meteo.com/

export type Weather = {
  city: string;
  temp: number;
  feels: number;
  code: number;
  label: string;
  tomorrowMax: number;
  tomorrowMin: number;
};

// WMO weather codes → kısa TR etiket
function codeLabel(c: number): string {
  if (c === 0) return "Açık";
  if (c === 1) return "Genelde açık";
  if (c === 2) return "Parçalı bulutlu";
  if (c === 3) return "Kapalı";
  if (c >= 45 && c <= 48) return "Sisli";
  if (c >= 51 && c <= 57) return "Çisenti";
  if (c >= 61 && c <= 67) return "Yağmurlu";
  if (c >= 71 && c <= 77) return "Karlı";
  if (c >= 80 && c <= 82) return "Sağanak";
  if (c >= 95 && c <= 99) return "Fırtınalı";
  return "—";
}

// Konya merkez yaklaşık
const LAT = 37.87;
const LON = 32.49;

export async function fetchKonyaWeather(): Promise<Weather | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,apparent_temperature,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min` +
      `&timezone=Europe/Istanbul&forecast_days=2`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const json = await res.json();
    const cur = json.current;
    const daily = json.daily;
    return {
      city: "KONYA",
      temp: Math.round(cur.temperature_2m),
      feels: Math.round(cur.apparent_temperature),
      code: cur.weather_code,
      label: codeLabel(cur.weather_code),
      tomorrowMax: Math.round(daily.temperature_2m_max[1] ?? daily.temperature_2m_max[0]),
      tomorrowMin: Math.round(daily.temperature_2m_min[1] ?? daily.temperature_2m_min[0]),
    };
  } catch {
    return null;
  }
}
