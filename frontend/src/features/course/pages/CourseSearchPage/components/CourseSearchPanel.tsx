import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Cascader, Select } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { REGION_CASCADER_OPTIONS } from '@/data/regionCascader';
import { SUBJECT_LABELS, GRADE_LABELS } from '@/data/courseData';
import styles from './CourseSearchPanel.module.scss';

// ============================================
// Types
// ============================================

interface FilterState {
  keyword: string;
  region: string[];
  subject: string | null;
  grade: string | null;
  teachingMode: string | null;
  trustLevel: string | null;
  sortBy: string;
}

interface CourseSearchPanelProps {
  filters: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  localKeyword: string;
  onKeywordChange: (keyword: string) => void;
}

// ============================================
// Component
// ============================================

export const CourseSearchPanel: React.FC<CourseSearchPanelProps> = ({
  filters,
  onFilterChange,
  localKeyword,
  onKeywordChange,
}) => {
  const { t } = useTranslation('search');

  // Track IME composition state for Chinese input support
  const [isComposing, setIsComposing] = useState(false);

  // Debounced keyword search with 1s delay
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const filterOption = useCallback((input: string, option: DefaultOptionType): boolean => {
    const label = option.label as string;
    return label.toLowerCase().includes(input.toLowerCase());
  }, []);

  const subjectOptions = React.useMemo(() => {
    return Object.entries(SUBJECT_LABELS).map(([value, labelKey]) => ({
      value,
      label: t(labelKey as string),
    }));
  }, [t]);

  const gradeOptions = React.useMemo(() => {
    return Object.entries(GRADE_LABELS).map(([value, labelKey]) => ({
      value,
      label: t(labelKey as string),
    }));
  }, [t]);

  const teachingModeOptions = [
    { value: 'offline', label: t('course.offline') },
    { value: 'online', label: t('course.online') },
  ];

  const trustLevelOptions = [
    { value: 'S', label: t('trustLevel.s') },
    { value: 'A', label: t('trustLevel.a') },
    { value: 'B', label: t('trustLevel.b') },
    { value: 'C', label: t('trustLevel.c') },
    { value: 'D', label: t('trustLevel.d') },
  ];

  const sortOptions = [
    { value: 'best-match', label: t('sort.bestMatch') },
    { value: 'rating', label: t('sort.rating') },
    { value: 'price-low', label: t('sort.priceLow') },
    { value: 'price-high', label: t('sort.priceHigh') },
    { value: 'reviews', label: t('sort.reviews') },
  ];

  const handleRegionChange = (value: (string | number | null)[]) => {
    const filtered = (value || []).filter(
      (v): v is string => v !== null && v !== undefined && typeof v === 'string'
    );
    onFilterChange({ region: filtered });
  };

  const handleKeywordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const keyword = e.target.value;
      onKeywordChange(keyword);

      // Skip debounce during IME composition (Chinese input)
      if (isComposing) {
        return;
      }

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout - search triggers 1s after user stops typing
      searchTimeoutRef.current = setTimeout(() => {
        onFilterChange({ keyword });
      }, 1000);
    },
    [isComposing, onKeywordChange, onFilterChange]
  );

  // Trigger search when composition ends
  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
    onFilterChange({ keyword: localKeyword });
  }, [localKeyword, onFilterChange]);

  // ============================================
  // Render
  // ============================================

  return (
    <div
      className={`${styles.searchPanel} filters`}
      data-testid="course-search-panel"
      data-testid-filter-panel="filter-panel"
    >
      {/* Search Section */}
      <div className={styles.searchSection}>
        <div className={styles.searchBar}>
          <SearchOutlined className={styles.searchIcon} />
          <input
            type="text"
            className={`${styles.searchInput} search-input`}
            placeholder={t('filter.keywordPlaceholder')}
            value={localKeyword}
            onChange={handleKeywordChange}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={handleCompositionEnd}
            data-testid="search-input"
            data-testid-keyword-input="keyword-input"
          />
          {localKeyword && (
            <button
              className={styles.clearSearch}
              onClick={() => {
                onKeywordChange('');
                onFilterChange({ keyword: '' });
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className={`${styles.filterRow} filters section-filter`} data-testid="filter-row">
        <div className={`${styles.filterItem} filter-city city-filter`}>
          <Cascader
            options={REGION_CASCADER_OPTIONS}
            value={filters.region.length > 0 ? filters.region : undefined}
            onChange={handleRegionChange}
            placeholder={t('filter.regionPlaceholder')}
            allowClear
            showSearch={{ filter: filterOption }}
            multiple={false}
            size="large"
            data-testid="region-cascader"
          />
        </div>

        <div className={`${styles.filterItem} filter-subject subject-filter`}>
          <Select
            value={filters.subject}
            onChange={value => onFilterChange({ subject: value })}
            placeholder={t('filter.subject')}
            allowClear
            size="large"
            options={subjectOptions}
            data-testid="subject-select"
          />
        </div>

        <div className={`${styles.filterItem} filter-grade grade-filter`}>
          <Select
            value={filters.grade}
            onChange={value => onFilterChange({ grade: value })}
            placeholder={t('filter.grade')}
            allowClear
            size="large"
            options={gradeOptions}
            data-testid="grade-select"
          />
        </div>

        <div className={styles.filterItem}>
          <Select
            value={filters.teachingMode}
            onChange={value => onFilterChange({ teachingMode: value })}
            placeholder={t('filter.teachingMode')}
            allowClear
            size="large"
            options={teachingModeOptions}
            data-testid="teaching-mode-select"
          />
        </div>

        <div className={styles.filterItem}>
          <Select
            value={filters.trustLevel}
            onChange={value => onFilterChange({ trustLevel: value })}
            placeholder={t('filter.trustLevel')}
            allowClear
            size="large"
            options={trustLevelOptions}
            data-testid="trust-level-select"
          />
        </div>

        <div className={styles.filterItem}>
          <Select
            value={filters.sortBy === 'best-match' ? undefined : filters.sortBy}
            onChange={value => onFilterChange({ sortBy: value })}
            options={sortOptions}
            size="large"
            placeholder={t('sort.bestMatch')}
            data-testid="sort-select"
          />
        </div>
      </div>
    </div>
  );
};

export default CourseSearchPanel;
