import React, { useEffect, useState } from 'react';
import { Cloud, CloudRain, Droplets, Sun, MapPin, Loader2, Wind, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../contexts/ThemeContext';

interface WeatherData {
  temp: number;
  humidity: number;
  description: string;
  main: string;
  windSpeed: number;
  cloudsAll: number;
  windDeg: number;
}

const getWindDirectionName = (deg: number | undefined): string => {
  const directions = [
    'ทิศเหนือ', 
    'ทิศอีสาน', 
    'ทิศตะวันออก', 
    'ทิศอาคเนย์', 
    'ทิศใต้', 
    'ทิศหรดี', 
    'ทิศตะวันตก', 
    'ทิศพายัพ'
  ];
  const index = deg !== undefined ? Math.round(deg / 45) % 8 : 1;
  return directions[index];
};

const getWindDescription = (speed: number, deg: number | undefined): string => {
  let forceText = "ปานกลาง";
  if (speed < 1.5) forceText = "อ่อน";
  else if (speed < 5.0) forceText = "ปานกลาง";
  else forceText = "แรง";
  
  const dirName = getWindDirectionName(deg);
  return `💨 ลม${forceText} พัดจาก${dirName}`;
};

const getCloudDescription = (cloudsAll: number): string => {
  if (cloudsAll > 85) return '🌧️ ฟ้าครึ้มจัด โอกาสฝนสูง';
  if (cloudsAll > 60) return '☁️ เมฆครึ้ม ท้องฟ้าสลัว';
  if (cloudsAll > 30) return '🌥️ มีเมฆเป็นส่วนมาก';
  if (cloudsAll > 10) return '🌤️ ท้องฟ้าโปร่ง เมฆบางส่วน';
  return '☀️ ท้องฟ้าแจ่มใส แดดจัด';
};

const CACHE_KEY = 'niphonsfarm_weather_cache';
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds

const getCachedWeather = (): WeatherData | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const age = Date.now() - parsed.timestamp;
    if (age < CACHE_EXPIRY) {
      return parsed.weather;
    }
  } catch (e) {
    console.error("Error reading weather cache:", e);
  }
  return null;
};

const setCachedWeather = (weather: WeatherData) => {
  try {
    const data = {
      weather,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Error writing weather cache:", e);
  }
};

export default function HeaderWeatherWidget() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [weather, setWeather] = useState<WeatherData | null>(() => {
    // Try to pre-load from cache if valid during initial render
    return getCachedWeather();
  });
  const [loading, setLoading] = useState(() => {
    // If we have cached code, we do NOT show the initial global spinner
    return !getCachedWeather();
  });
  const [error, setError] = useState<string | null>(null);

  // Lat & Lon provided by user for the farm (บ้านลำพาล)
  const lat = 7.6224;
  const lon = 99.9995;

  const getThaiDateString = () => {
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const now = new Date();
    const dayName = days[now.getDay()];
    const dateNum = now.getDate();
    const monthName = months[now.getMonth()];
    const BEYear = now.getFullYear() + 543;
    return `${dayName} ${dateNum} ${monthName} ${BEYear}`;
  };

  useEffect(() => {
    const fetchWeather = async (force = false) => {
      // 1. Check cache first if not forced
      if (!force) {
        const cached = getCachedWeather();
        if (cached) {
          setWeather(cached);
          setLoading(false);
          setError(null);
          return;
        }
      }

      // If we don't have cached data yet, or it's expired but we're reloading,
      // prevent full flash screen if there's already some weather state to display
      setWeather(prev => {
        if (!prev) setLoading(true);
        return prev;
      });

      try {
        const res = await fetch(`/api/weather?latitude=${lat}&longitude=${lon}`);
        if (!res.ok) {
          throw new Error('Failed to fetch weather');
        }
        const data = await res.json();
        const current = data.current;
        
        // Map WMO codes to descriptions and simple condition names
        const getConditionInfo = (code: number) => {
          if (code === 0) return { desc: 'ท้องฟ้าแจ่มใส', main: 'clear' };
          if (code >= 1 && code <= 3) return { desc: 'มีเมฆบางส่วน', main: 'clouds' };
          if (code >= 45 && code <= 48) return { desc: 'มีหมอก', main: 'fog' };
          if (code >= 51 && code <= 67) return { desc: 'ฝนตกปรอยๆ', main: 'rain' };
          if (code >= 80 && code <= 82) return { desc: 'ฝนตกหนัก', main: 'rain' };
          if (code >= 95) return { desc: 'พายุฝนฟ้าคะนอง', main: 'thunderstorm' };
          return { desc: 'เมฆครึ้ม', main: 'clouds' };
        };

        const info = getConditionInfo(current.weather_code);

        const freshWeather: WeatherData = {
          temp: Math.round(current.temperature_2m),
          humidity: current.relative_humidity_2m,
          description: info.desc,
          main: info.main,
          windSpeed: current.wind_speed_10m,
          cloudsAll: current.clouds?.all ?? current.cloud_cover ?? 96,
          windDeg: current.wind?.deg ?? current.wind_direction_10m ?? 45,
        };

        setWeather(freshWeather);
        setCachedWeather(freshWeather);
        setError(null);
      } catch (err) {
        console.error("Weather fetch error:", err);
        // Fallback to expired cache if we fail to fetch fresh data
        const fallbackCached = localStorage.getItem(CACHE_KEY);
        if (fallbackCached) {
          try {
            const parsed = JSON.parse(fallbackCached);
            setWeather(parsed.weather);
            setError(null);
            return;
          } catch (_) {}
        }
        setError("โหลดสภาพอากาศไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };

    // Initial check (non-forced, uses cache if still fresh)
    fetchWeather();

    // Refresh if cache is expired on window focus or visibility change
    const handleFocus = () => {
      fetchWeather(false);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchWeather(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    // Refresh every 30 minutes in the background
    const interval = setInterval(() => {
      fetchWeather(true);
    }, CACHE_EXPIRY);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [lat, lon]);

  const getWeatherIcon = (className = "w-3.5 h-3.5") => {
    if (!weather) return <Cloud className={className} />;
    const mainCondition = weather.main.toLowerCase();
    if (mainCondition.includes('rain') || mainCondition.includes('drizzle') || mainCondition.includes('thunderstorm')) {
      return <CloudRain className={`${className} text-white fill-white/10`} />;
    }
    if (mainCondition.includes('clear')) {
      return <Sun className={`${className} text-white fill-white/10`} />;
    }
    return <Cloud className={`${className} text-white fill-white/10`} />;
  };

  if (loading) {
    return (
      <div className="bg-transparent py-2 px-4 select-none relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-[11px] font-bold text-white/70 bg-white/20 border border-white/30 backdrop-blur-[4px] rounded-full py-1 px-4.5 w-max">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
          <span>กำลังโหลดสภาพอากาศ...</span>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-transparent py-2 px-4 select-none relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-[11px] font-bold text-white bg-red-500/35 border border-red-500/40 backdrop-blur-[4px] rounded-full py-1 px-4.5 w-max">
          <span>{error || 'ไม่พบข้อมูลสภาพอากาศ'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-transparent pt-1 pb-1 px-4 select-none transition-all duration-300 relative z-10">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {/* Location Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/40 bg-white/25 backdrop-blur-[4px] text-xs font-black tracking-tight text-white shadow-sm transition-all duration-300">
          <MapPin className="w-3.5 h-3.5 text-white" />
          <span>บ้านลำพาล</span>
        </div>

        {/* Date Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/40 bg-white/25 backdrop-blur-[4px] text-xs font-black tracking-tight text-white shadow-sm transition-all duration-300">
          <Calendar className="w-3.5 h-3.5 text-white" />
          <span>{getThaiDateString()}</span>
        </div>

        {/* Temperature Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/40 bg-white/25 backdrop-blur-[4px] text-xs font-black tracking-tight text-white shadow-sm transition-all duration-300">
          {getWeatherIcon("w-3.5 h-3.5")}
          <span>{weather.temp}°C</span>
        </div>

        {/* Rain Chance Pill (representing cloud/rain level) */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/40 bg-white/25 backdrop-blur-[4px] text-xs font-black tracking-tight text-white shadow-sm transition-all duration-300">
          <CloudRain className="w-3.5 h-3.5 text-white fill-white/10" />
          <span>ฝน {weather.cloudsAll}%</span>
        </div>

        {/* Humidity Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/40 bg-white/25 backdrop-blur-[4px] text-xs font-black tracking-tight text-white shadow-sm transition-all duration-300">
          <Droplets className="w-3.5 h-3.5 text-white" />
          <span>หยดน้ำ {weather.humidity}%</span>
        </div>
      </div>
    </div>
  );
}
