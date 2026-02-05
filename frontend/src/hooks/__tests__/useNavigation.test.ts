import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

import { useNavigation } from '../useSearch';

describe('useNavigation Hook', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('navigates to a path', () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.navigate('/home');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/home', undefined);
  });

  it('navigates with replace option', () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.navigate('/login', { replace: true });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('goes back in history', () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.goBack();
    });

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('returns stable function references', () => {
    const { result, rerender } = renderHook(() => useNavigation());

    const navigate1 = result.current.navigate;
    const goBack1 = result.current.goBack;

    rerender();

    expect(result.current.navigate).toBe(navigate1);
    expect(result.current.goBack).toBe(goBack1);
  });
});
