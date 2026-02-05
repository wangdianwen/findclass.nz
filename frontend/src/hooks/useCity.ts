import { useState, useCallback, useRef, useEffect } from 'react';
import { REGION_DATA, type CourseData } from '@/data/courseData';

// 城市选择相关的状态管理和逻辑
interface UseCityOptions {
  initialCity?: string;
  onCityChange?: (city: string) => void;
}

interface UseCityReturn {
  selectedCity: string;
  selectedSubRegion: string;
  subRegions: readonly string[];
  handleCityChange: (city: string) => void;
  handleSubRegionChange: (region: string) => void;
  reset: () => void;
}

export function useCity(options: UseCityOptions = {}): UseCityReturn {
  const { initialCity = 'all', onCityChange } = options;
  const [selectedCity, setSelectedCity] = useState<string>(() => initialCity);
  const [selectedSubRegion, setSelectedSubRegion] = useState<string>('');

  const subRegions =
    selectedCity && selectedCity !== 'all' && selectedCity !== 'online'
      ? [...(REGION_DATA[selectedCity] || [])]
      : [];

  const handleCityChange = useCallback(
    (city: string) => {
      setSelectedCity(city);
      setSelectedSubRegion('');
      onCityChange?.(city);
    },
    [onCityChange]
  );

  const handleSubRegionChange = useCallback((region: string) => {
    setSelectedSubRegion(region);
  }, []);

  const reset = useCallback(() => {
    setSelectedCity('all');
    setSelectedSubRegion('');
  }, []);

  return {
    selectedCity,
    selectedSubRegion,
    subRegions,
    handleCityChange,
    handleSubRegionChange,
    reset,
  };
}

// ============================================

// 搜索相关的状态管理和逻辑
interface UseSearchOptions {
  initialKeyword?: string;
  onSearch?: (keyword: string) => void;
}

interface UseSearchReturn {
  keyword: string;
  setKeyword: (keyword: string) => void;
  handleSearch: () => void;
  handleKeywordChange: (keyword: string) => void;
  clear: () => void;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const { initialKeyword = '', onSearch } = options;
  const [keyword, setKeyword] = useState<string>(() => initialKeyword);
  const keywordRef = useRef(initialKeyword);

  useEffect(() => {
    keywordRef.current = keyword;
  }, [keyword]);

  const handleSearch = useCallback(() => {
    onSearch?.(keywordRef.current);
  }, [onSearch]);

  const handleKeywordChange = useCallback((newKeyword: string) => {
    setKeyword(newKeyword);
  }, []);

  const clear = useCallback(() => {
    setKeyword('');
  }, []);

  return {
    keyword,
    setKeyword,
    handleSearch,
    handleKeywordChange,
    clear,
  };
}

// ============================================

// 课程过滤逻辑
export function useCourseFilter(courses: readonly CourseData[]) {
  const [searchKeyword, setSearchKeyword] = useState('');

  const filteredCourses = searchKeyword
    ? courses.filter(
        course =>
          course.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          course.subject.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          course.teacherName.toLowerCase().includes(searchKeyword.toLowerCase())
      )
    : courses;

  const isEmpty = filteredCourses.length === 0;

  return {
    searchKeyword,
    setSearchKeyword,
    filteredCourses,
    isEmpty,
  };
}
