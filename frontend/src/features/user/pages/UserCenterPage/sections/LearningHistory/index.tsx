import React, { useState, useMemo } from 'react';
import { Empty, Button, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { CourseCardHistory } from '@/components/ui';
import styles from './LearningHistory.module.scss';

interface Learner {
  id: string;
  name: string;
}

interface LearningRecord {
  id: string;
  courseId: string;
  courseTitle: string;
  institution: string;
  lastViewedAt: string;
  status: 'completed' | 'in_progress' | 'not_started';
  learnerId?: string;
}

interface LearningHistoryProps {
  history: LearningRecord[];
  children?: Learner[];
  onRemove?: (id: string) => void;
  isLoading?: boolean;
  testId?: string;
}

// ============================================
// Component
// ============================================

export const LearningHistory: React.FC<LearningHistoryProps> = ({
  history,
  children = [],
  onRemove,
  isLoading = false,
  testId = 'learning-history',
}) => {
  const { t } = useTranslation('user');
  const [selectedLearner, setSelectedLearner] = useState<string>('all');

  // Build learner list: self + children
  const learners: Learner[] = useMemo(
    () => [{ id: 'self', name: t('history.learnerSelf') }, ...children],
    [children, t]
  );

  // Filter records by selected learner
  const filteredRecords = useMemo(() => {
    if (selectedLearner === 'all') {
      return history;
    }
    if (selectedLearner === 'self') {
      return history.filter(r => !r.learnerId);
    }
    return history.filter(r => r.learnerId === selectedLearner);
  }, [history, selectedLearner]);

  const selectedLearnerName =
    learners.find(l => l.id === selectedLearner)?.name || t('history.allRecords');

  if (isLoading) {
    return (
      <div className={styles.loadingState} data-testid={`${testId}-loading`}>
        <Spin size="large" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className={styles.emptyState} data-testid={`${testId}-empty`}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <>
              <p className={styles.emptyTitle}>{t('history.empty')}</p>
              <p className={styles.emptyDesc}>{t('history.emptyDesc')}</p>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.historySection} data-testid={testId}>
      {/* Learner Filter */}
      {learners.length > 1 && (
        <div className={styles.filterSection}>
          <span className={styles.filterLabel}>{t('history.filterBy')}</span>
          <div className={styles.filterButtons}>
            <Button
              type={selectedLearner === 'all' ? 'primary' : 'default'}
              size="small"
              onClick={() => setSelectedLearner('all')}
            >
              {t('history.allRecords')}
            </Button>
            <Button
              type={selectedLearner === 'self' ? 'primary' : 'default'}
              size="small"
              onClick={() => setSelectedLearner('self')}
            >
              {t('history.learnerSelf')}
            </Button>
            {children.map(child => (
              <Button
                key={child.id}
                type={selectedLearner === child.id ? 'primary' : 'default'}
                size="small"
                onClick={() => setSelectedLearner(child.id)}
              >
                {child.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className={styles.emptyState} data-testid={`${testId}-empty-filtered`}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <>
                <p className={styles.emptyTitle}>
                  {t('history.noRecordsFor', { name: selectedLearnerName })}
                </p>
              </>
            }
          />
        </div>
      ) : (
        <div className={styles.historyList}>
          {filteredRecords.map(record => (
            <CourseCardHistory
              key={record.id}
              id={record.courseId}
              title={record.courseTitle}
              institution={record.institution}
              lastViewedAt={record.lastViewedAt}
              status={record.status}
              onRemove={onRemove ? () => onRemove(record.id) : undefined}
              testId="history"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LearningHistory;
