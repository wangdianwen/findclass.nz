import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrustBadge } from './TrustBadge';
import '@/locales/i18n';

describe('TrustBadge', () => {
  describe('Rendering', () => {
    it('should render badge with level label', () => {
      render(<TrustBadge level="S" showLabel />);
      expect(screen.getByText('S级')).toBeTruthy();
    });

    it('should render badge without label when showLabel is false', () => {
      render(<TrustBadge level="S" showLabel={false} />);
      expect(screen.queryByText('S级')).toBeNull();
    });

    it('should render correct icon for each level', () => {
      const levels: Array<'S' | 'A' | 'B' | 'C' | 'D'> = ['S', 'A', 'B', 'C', 'D'];
      levels.forEach(level => {
        const { container } = render(<TrustBadge level={level} showLabel={false} />);
        const badge = container.querySelector('[data-testid="trust-badge"]');
        expect(badge).toBeTruthy();
      });
    });

    it('should apply correct color class for S level', () => {
      const { container } = render(<TrustBadge level="S" />);
      const badge = container.querySelector('[data-testid="trust-badge"]');
      expect(badge?.className).toContain('trustBadgeS');
    });

    it('should apply correct color class for A level', () => {
      const { container } = render(<TrustBadge level="A" />);
      const badge = container.querySelector('[data-testid="trust-badge"]');
      expect(badge?.className).toContain('trustBadgeA');
    });

    it('should apply correct color class for B level', () => {
      const { container } = render(<TrustBadge level="B" />);
      const badge = container.querySelector('[data-testid="trust-badge"]');
      expect(badge?.className).toContain('trustBadgeB');
    });

    it('should apply correct color class for C level', () => {
      const { container } = render(<TrustBadge level="C" />);
      const badge = container.querySelector('[data-testid="trust-badge"]');
      expect(badge?.className).toContain('trustBadgeC');
    });

    it('should apply correct color class for D level', () => {
      const { container } = render(<TrustBadge level="D" />);
      const badge = container.querySelector('[data-testid="trust-badge"]');
      expect(badge?.className).toContain('trustBadgeD');
    });
  });

  describe('Size Variants', () => {
    it('should apply small size class', () => {
      const { container } = render(<TrustBadge level="S" size="small" />);
      const badge = container.querySelector('[data-testid="trust-badge"]');
      expect(badge?.className).toContain('small');
    });

    it('should apply medium size class (default)', () => {
      const { container } = render(<TrustBadge level="S" />);
      const badge = container.querySelector('[data-testid="trust-badge"]');
      expect(badge?.className).toContain('medium');
    });

    it('should apply large size class', () => {
      const { container } = render(<TrustBadge level="S" size="large" />);
      const badge = container.querySelector('[data-testid="trust-badge"]');
      expect(badge?.className).toContain('large');
    });
  });

  describe('Click Handler', () => {
    it('should call onClick when clickable is true', () => {
      const handleClick = vi.fn();
      const { container } = render(<TrustBadge level="S" clickable onClick={handleClick} />);
      const badge = container.querySelector('[data-testid="trust-badge"]');
      fireEvent.click(badge!);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when clickable is false', () => {
      const handleClick = vi.fn();
      const { container } = render(
        <TrustBadge level="S" clickable={false} onClick={handleClick} />
      );
      const badge = container.querySelector('[data-testid="trust-badge"]');
      fireEvent.click(badge!);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should stop propagation on click', () => {
      const handleClick = vi.fn();
      const handleParentClick = vi.fn();
      const { container } = render(
        <div onClick={handleParentClick}>
          <TrustBadge level="S" clickable onClick={handleClick} />
        </div>
      );
      const badge = container.querySelector('[data-testid="trust-badge"]');
      fireEvent.click(badge!);
      expect(handleClick).toHaveBeenCalled();
      expect(handleParentClick).not.toHaveBeenCalled();
    });
  });

  describe('Custom Class Name', () => {
    it('should apply custom class name', () => {
      const { container } = render(<TrustBadge level="S" className="custom-class" />);
      const badge = container.querySelector('[data-testid="trust-badge"]');
      expect(badge?.className).toContain('custom-class');
    });
  });

  describe('Default Props', () => {
    it('should have medium as default size', () => {
      const { container } = render(<TrustBadge level="S" />);
      const badge = container.querySelector('[data-testid="trust-badge"]');
      expect(badge?.className).toContain('medium');
    });

    it('should have showLabel as true by default', () => {
      render(<TrustBadge level="S" />);
      expect(screen.getByText('S级')).toBeTruthy();
    });

    it('should have clickable as false by default', () => {
      const handleClick = vi.fn();
      const { container } = render(<TrustBadge level="S" onClick={handleClick} />);
      const badge = container.querySelector('[data-testid="trust-badge"]');
      fireEvent.click(badge!);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});
