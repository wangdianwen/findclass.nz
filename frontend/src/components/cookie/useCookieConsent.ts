import { useState, useCallback } from 'react';
import type { CookieCategory } from './types';
import { COOKIE_CONSENT_KEY, ANALYTICS_ENABLED_KEY } from './types';

/**
 * Cookie Consent 管理 Hook
 * 提供 Cookie 同意状态管理和持久化功能
 */
export function useCookieConsent() {
  // 懒加载初始化：从 localStorage 读取保存的偏好
  const [consent, setConsent] = useState<CookieCategory[] | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (savedConsent) {
        return JSON.parse(savedConsent);
      }
    } catch {
      return null;
    }
    return null;
  });

  // 保存用户选择
  const saveConsent = useCallback((categories: CookieCategory[]) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(categories));

    // 根据用户选择启用/禁用分析 Cookie
    const analyticsEnabled = categories.find(c => c.id === 'analytics')?.enabled ?? false;
    localStorage.setItem(ANALYTICS_ENABLED_KEY, String(analyticsEnabled));
  }, []);

  // 检查是否已有同意
  const hasConsent = useCallback(() => consent !== null, [consent]);

  // 检查分析 Cookie 是否启用
  const isAnalyticsEnabled = useCallback(
    () => consent?.find(c => c.id === 'analytics')?.enabled ?? false,
    [consent]
  );

  // 重置同意状态
  const resetConsent = useCallback(() => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    localStorage.removeItem(ANALYTICS_ENABLED_KEY);
    setConsent(null);
  }, []);

  return {
    consent,
    saveConsent,
    hasConsent,
    isAnalyticsEnabled,
    resetConsent,
  };
}

// 默认导出
export default useCookieConsent;
