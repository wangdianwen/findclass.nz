import React from 'react';
import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import type { FallbackProps } from 'react-error-boundary';

export const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  const { t } = useTranslation();

  return (
    <Result
      status="error"
      title={t('error.title', 'Something went wrong')}
      subTitle={
        error instanceof Error ? error.message : t('error.unknown', 'An unknown error occurred')
      }
      extra={
        <Button type="primary" onClick={resetErrorBoundary} data-testid="try-again-button">
          {t('error.tryAgain', 'Try Again')}
        </Button>
      }
    />
  );
};

export default ErrorFallback;
