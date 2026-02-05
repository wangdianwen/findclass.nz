import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// 路由导航Hook
export function useNavigation() {
  const navigate = useNavigate();

  const navigateTo = useCallback(
    (path: string, options?: { replace?: boolean }) => {
      navigate(path, options);
    },
    [navigate]
  );

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return {
    navigate: navigateTo,
    goBack,
  };
}

export default useNavigation;
