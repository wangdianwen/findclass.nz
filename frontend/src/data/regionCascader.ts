import { MAIN_CITIES, REGION_DATA } from './courseData';

/**
 * Convert REGION_DATA to Cascader format for Ant Design Cascader component
 * Used in CourseSearchPage FilterSection
 */

interface CascaderOption {
  value: string;
  label: string;
  children?: CascaderOption[];
}

// Map English region names to lowercase with hyphens for consistency
const normalizeRegionName = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, '-');
};

// Create cascader options from MAIN_CITIES and REGION_DATA
export const REGION_CASCADER_OPTIONS: CascaderOption[] = MAIN_CITIES.map(city => {
  const cityValue = city.value;
  const cityLabel = city.label;

  // Special handling for 'online' - no sub-districts
  if (cityValue === 'online') {
    return {
      value: cityValue,
      label: cityLabel,
    };
  }

  // Get sub-regions for this city
  const subRegions = REGION_DATA[cityValue] || [];

  const children: CascaderOption[] = subRegions.map(region => ({
    value: normalizeRegionName(region),
    label: region,
  }));

  return {
    value: cityValue,
    label: cityLabel,
    children,
  };
});

// Helper function to get display labels from cascader values
export const getRegionLabels = (
  selectedValues: string[],
  options: CascaderOption[] = REGION_CASCADER_OPTIONS
): string[] => {
  const labels: string[] = [];

  const findLabel = (opts: CascaderOption[], depth: number = 0): void => {
    for (const opt of opts) {
      if (depth === 0 && selectedValues.includes(opt.value)) {
        labels.push(opt.label);
        if (opt.children) {
          findLabel(opt.children, depth + 1);
        }
      } else if (depth > 0 && selectedValues.includes(opt.value)) {
        labels.push(opt.label);
      }
    }
  };

  findLabel(options);
  return labels;
};

// Search filter function for cascader
export const filterCascaderOption = (input: string, option: CascaderOption): boolean => {
  return option.label.toLowerCase().includes(input.toLowerCase());
};
