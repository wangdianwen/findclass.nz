import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrustLevelFilter } from './TrustLevelFilter';
import '@/locales/i18n';

describe('TrustLevelFilter', () => {
  describe('Rendering', () => {
    it('should render filter container', () => {
      render(<TrustLevelFilter value="all" showAll />);
      expect(screen.getByTestId('trust-level-filter')).toBeTruthy();
    });

    it('should render all radio buttons when showAll is true', () => {
      render(<TrustLevelFilter value="all" showAll />);
      expect(screen.getByTestId('trust-level-filter-option-all')).toBeTruthy();
      expect(screen.getByTestId('trust-level-filter-option-S')).toBeTruthy();
      expect(screen.getByTestId('trust-level-filter-option-A')).toBeTruthy();
      expect(screen.getByTestId('trust-level-filter-option-B')).toBeTruthy();
      expect(screen.getByTestId('trust-level-filter-option-C')).toBeTruthy();
      expect(screen.getByTestId('trust-level-filter-option-D')).toBeTruthy();
    });

    it('should not render "all" option when showAll is false', () => {
      render(<TrustLevelFilter value="S" showAll={false} />);
      expect(screen.queryByTestId('trust-level-filter-option-all')).toBeNull();
      expect(screen.getByTestId('trust-level-filter-option-S')).toBeTruthy();
      expect(screen.getByTestId('trust-level-filter-option-A')).toBeTruthy();
    });

    it('should render title when provided', () => {
      render(<TrustLevelFilter value="all" title="Trust Level" />);
      expect(screen.getByText('Trust Level')).toBeTruthy();
    });

    it('should not render title when not provided', () => {
      render(<TrustLevelFilter value="all" title={undefined} />);
      expect(screen.queryByText('Trust Level')).toBeNull();
    });
  });

  // Selection behavior is tested in Interaction tests above

  describe('Interaction', () => {
    it('should call onChange when option is selected', () => {
      const handleChange = vi.fn();
      render(<TrustLevelFilter value="all" onChange={handleChange} showAll />);

      const sButton = screen.getByTestId('trust-level-filter-option-S');
      fireEvent.click(sButton);

      expect(handleChange).toHaveBeenCalledWith('S');
    });

    it('should call onChange with "all" when all option is selected', () => {
      const handleChange = vi.fn();
      render(<TrustLevelFilter value="S" onChange={handleChange} showAll />);

      const allButton = screen.getByTestId('trust-level-filter-option-all');
      fireEvent.click(allButton);

      expect(handleChange).toHaveBeenCalledWith('all');
    });

    it('should call onChange when D option is selected', () => {
      const handleChange = vi.fn();
      render(<TrustLevelFilter value="all" onChange={handleChange} showAll />);

      const dButton = screen.getByTestId('trust-level-filter-option-D');
      fireEvent.click(dButton);

      expect(handleChange).toHaveBeenCalledWith('D');
    });
  });

  describe('TrustBadge Integration', () => {
    it('should render TrustBadge for each level option', () => {
      render(<TrustLevelFilter value="all" showAll />);

      // Check that each level has trust badge rendered (verify by icon/text presence)
      expect(screen.getByText('S级')).toBeTruthy();
      expect(screen.getByText('A级')).toBeTruthy();
      expect(screen.getByText('B级')).toBeTruthy();
      expect(screen.getByText('C级')).toBeTruthy();
      expect(screen.getByText('D级')).toBeTruthy();
    });
  });

  describe('Test ID', () => {
    it('should use custom testId when provided', () => {
      render(<TrustLevelFilter value="all" testId="custom-filter" />);
      expect(screen.getByTestId('custom-filter')).toBeTruthy();
    });

    it('should use default testId when not provided', () => {
      render(<TrustLevelFilter value="all" />);
      expect(screen.getByTestId('trust-level-filter')).toBeTruthy();
    });
  });
});
