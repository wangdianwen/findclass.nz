import { renderHook, act } from '@testing-library/react';
import { useCity, useSearch, useCourseFilter } from '../useCity';
import { REGION_DATA } from '@/data/courseData';

describe('useCity Hook', () => {
  it('initializes with default city', () => {
    const { result } = renderHook(() => useCity());

    expect(result.current.selectedCity).toBe('all');
    expect(result.current.selectedSubRegion).toBe('');
    expect(result.current.subRegions).toEqual([]);
  });

  it('initializes with custom initial city', () => {
    const { result } = renderHook(() => useCity({ initialCity: 'auckland' }));

    expect(result.current.selectedCity).toBe('auckland');
    expect(result.current.subRegions).toEqual([...REGION_DATA.auckland]);
  });

  it('calls onCityChange callback when city changes', () => {
    const onCityChange = vi.fn();
    const { result } = renderHook(() => useCity({ onCityChange }));

    act(() => {
      result.current.handleCityChange('Wellington');
    });

    expect(onCityChange).toHaveBeenCalledWith('Wellington');
    expect(result.current.selectedCity).toBe('Wellington');
  });

  it('resets subRegion when city changes', () => {
    const { result } = renderHook(() => useCity({ initialCity: 'auckland' }));

    act(() => {
      result.current.handleSubRegionChange('CBD');
    });
    expect(result.current.selectedSubRegion).toBe('CBD');

    act(() => {
      result.current.handleCityChange('wellington');
    });
    expect(result.current.selectedSubRegion).toBe('');
  });

  it('updates subRegions when handleCityChange is called', () => {
    const { result } = renderHook(() => useCity({ initialCity: 'all' }));

    expect(result.current.subRegions).toEqual([]);

    act(() => {
      result.current.handleCityChange('auckland');
    });
    expect(result.current.subRegions).toEqual([...REGION_DATA.auckland]);

    act(() => {
      result.current.handleCityChange('online');
    });
    expect(result.current.subRegions).toEqual([]);
  });

  it('handles subRegion change', () => {
    const { result } = renderHook(() => useCity({ initialCity: 'auckland' }));

    act(() => {
      result.current.handleSubRegionChange('North Shore');
    });

    expect(result.current.selectedSubRegion).toBe('North Shore');
  });

  it('resets to default values', () => {
    const { result } = renderHook(() => useCity({ initialCity: 'Auckland' }));

    act(() => {
      result.current.handleCityChange('Wellington');
      result.current.handleSubRegionChange('CBD');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.selectedCity).toBe('all');
    expect(result.current.selectedSubRegion).toBe('');
  });

  it('handles empty string city', () => {
    const { result } = renderHook(() => useCity({ initialCity: '' }));

    expect(result.current.selectedCity).toBe('');
    expect(result.current.subRegions).toEqual([]);
  });
});

describe('useSearch Hook', () => {
  it('initializes with empty keyword', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.keyword).toBe('');
  });

  it('initializes with custom initial keyword', () => {
    const { result } = renderHook(() => useSearch({ initialKeyword: 'python' }));

    expect(result.current.keyword).toBe('python');
  });

  it('updates keyword', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setKeyword('math');
    });

    expect(result.current.keyword).toBe('math');
  });

  it('calls onSearch with current keyword', () => {
    const onSearch = vi.fn();
    const { result } = renderHook(() => useSearch({ onSearch }));

    act(() => {
      result.current.handleKeywordChange('python');
    });

    expect(result.current.keyword).toBe('python');
    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      result.current.handleSearch();
    });

    expect(onSearch).toHaveBeenCalledWith('python');
  });

  it('clears keyword', () => {
    const { result } = renderHook(() => useSearch({ initialKeyword: 'python' }));

    act(() => {
      result.current.clear();
    });

    expect(result.current.keyword).toBe('');
  });

  it('handles keyword change', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.handleKeywordChange('course');
    });

    expect(result.current.keyword).toBe('course');
  });
});

describe('useCourseFilter Hook', () => {
  const mockCourses: import('@/data/courseData').CourseData[] = [
    {
      id: '1',
      title: 'Python Course',
      subject: 'programming',
      teacherName: 'John',
      price: 50,
      lessonCount: 12,
      lessonDuration: 60,
      rating: 4.5,
      reviewCount: 100,
      city: 'Auckland',
      region: 'CBD',
      grade: 'High School',
      teachingMode: 'offline',
      trustLevel: 'A',
      language: 'English',
      schedule: 'Weekends',
    },
    {
      id: '2',
      title: 'Math Class',
      subject: 'math',
      teacherName: 'Jane',
      price: 40,
      lessonCount: 10,
      lessonDuration: 60,
      rating: 4.8,
      reviewCount: 50,
      city: 'Auckland',
      region: 'North Shore',
      grade: 'Primary',
      teachingMode: 'online',
      trustLevel: 'S',
      language: 'English',
      schedule: 'Weekdays',
    },
    {
      id: '3',
      title: 'Python Programming',
      subject: 'programming',
      teacherName: 'Bob',
      price: 60,
      lessonCount: 8,
      lessonDuration: 90,
      rating: 4.2,
      reviewCount: 80,
      city: 'Wellington',
      region: 'CBD',
      grade: 'University',
      teachingMode: 'offline',
      trustLevel: 'B',
      language: 'English',
      schedule: 'Weekends',
    },
  ];

  it('returns all courses when no search keyword', () => {
    const { result } = renderHook(() => useCourseFilter(mockCourses));

    expect(result.current.filteredCourses).toHaveLength(3);
    expect(result.current.searchKeyword).toBe('');
    expect(result.current.isEmpty).toBe(false);
  });

  it('filters courses by title', () => {
    const { result } = renderHook(() => useCourseFilter(mockCourses));

    act(() => {
      result.current.setSearchKeyword('Python');
    });

    expect(result.current.filteredCourses).toHaveLength(2);
    expect(result.current.filteredCourses[0].title).toBe('Python Course');
  });

  it('filters courses by subject', () => {
    const { result } = renderHook(() => useCourseFilter(mockCourses));

    act(() => {
      result.current.setSearchKeyword('math');
    });

    expect(result.current.filteredCourses).toHaveLength(1);
    expect(result.current.filteredCourses[0].subject).toBe('math');
  });

  it('filters courses by teacher name', () => {
    const { result } = renderHook(() => useCourseFilter(mockCourses));

    act(() => {
      result.current.setSearchKeyword('Jane');
    });

    expect(result.current.filteredCourses).toHaveLength(1);
    expect(result.current.filteredCourses[0].teacherName).toBe('Jane');
  });

  it('is case insensitive', () => {
    const { result } = renderHook(() => useCourseFilter(mockCourses));

    act(() => {
      result.current.setSearchKeyword('PYTHON');
    });

    expect(result.current.filteredCourses).toHaveLength(2);
  });

  it('returns empty when no matches', () => {
    const { result } = renderHook(() => useCourseFilter(mockCourses));

    act(() => {
      result.current.setSearchKeyword('nonexistent');
    });

    expect(result.current.filteredCourses).toHaveLength(0);
    expect(result.current.isEmpty).toBe(true);
  });

  it('handles empty courses array', () => {
    const { result } = renderHook(() => useCourseFilter([]));

    expect(result.current.filteredCourses).toHaveLength(0);
    expect(result.current.isEmpty).toBe(true);
  });
});
