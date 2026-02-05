import React, { useState, useCallback, useMemo } from 'react';
import { Button, Input, Select, Tag, Dropdown, Modal, message, Tooltip } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { TeacherCourse, CourseStatus, MAX_ACTIVE_COURSES } from '../teacherData';
import { DEFAULT_COURSE_COVER } from '@/utils/defaultImages';
import styles from './CourseList.module.scss';

// Configurable: Maximum number of active (published) courses
export { MAX_ACTIVE_COURSES } from '../teacherData';

// ============================================
// Types
// ============================================

interface CourseListProps {
  courses: TeacherCourse[];
  loading?: boolean;
  onCreateCourse: () => void;
  onEditCourse: (course: TeacherCourse) => void;
  onPreviewCourse: (course: TeacherCourse) => void;
  onPublishCourse: (courseId: string) => void;
  onPauseCourse: (courseId: string) => void;
  onDeleteCourse: (courseId: string) => void;
}

// ============================================
// Component
// ============================================

export const CourseList: React.FC<CourseListProps> = ({
  courses,
  onCreateCourse,
  onEditCourse,
  onPreviewCourse,
  onPublishCourse,
  onPauseCourse,
  onDeleteCourse,
}) => {
  const { t } = useTranslation('courseManagement');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<CourseStatus | 'all'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Count published courses
  const publishedCoursesCount = useMemo(() => {
    return courses.filter(course => course.status === 'published').length;
  }, [courses]);

  // Check if user can create more courses
  const canCreateCourse = publishedCoursesCount < MAX_ACTIVE_COURSES;

  // Filter courses based on search and status
  const filteredCourses = useMemo(() => {
    let result = [...courses];

    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase().trim();
      result = result.filter(
        course =>
          course.title.toLowerCase().includes(keyword) ||
          course.subject.toLowerCase().includes(keyword)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(course => course.status === statusFilter);
    }

    return result;
  }, [courses, searchKeyword, statusFilter]);

  // Get action menu items for a course
  const getActionItems = (course: TeacherCourse) => {
    const items = [
      {
        key: 'edit',
        label: t('actions.edit'),
        icon: <EditOutlined />,
        onClick: () => onEditCourse(course),
      },
      {
        key: 'preview',
        label: t('actions.preview'),
        icon: <EyeOutlined />,
        onClick: () => onPreviewCourse(course),
      },
    ];

    if (course.status === 'draft') {
      items.push({
        key: 'publish',
        label: t('actions.publish'),
        icon: <CheckCircleOutlined />,
        onClick: () => onPublishCourse(course.id),
      });
    } else if (course.status === 'published') {
      items.push({
        key: 'pause',
        label: t('actions.pause'),
        icon: <PauseCircleOutlined />,
        onClick: () => onPauseCourse(course.id),
      });
    }

    items.push({
      key: 'delete',
      label: t('actions.delete'),
      icon: <DeleteOutlined />,
      onClick: () => setDeleteConfirm(course.id),
    });

    return items;
  };

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirm) {
      onDeleteCourse(deleteConfirm);
      message.success(t('messages.deleteSuccess'));
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, onDeleteCourse, t]);

  // Status tag config
  const getStatusConfig = (status: CourseStatus) => {
    switch (status) {
      case 'published':
        return { color: 'success', text: t('status.published') };
      case 'draft':
        return { color: 'default', text: t('status.draft') };
      case 'paused':
        return { color: 'warning', text: t('status.paused') };
      default:
        return { color: 'default', text: status };
    }
  };

  // Empty state
  if (courses.length === 0) {
    return (
      <div className={styles.emptyState} data-testid="empty-state">
        <div className={styles.emptyIcon}>
          <PlusOutlined />
        </div>
        <h3 className={styles.emptyTitle}>{t('empty.title')}</h3>
        <p className={styles.emptyDescription}>{t('empty.description')}</p>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateCourse}>
          {t('empty.action')}
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.courseList} data-testid="course-list">
      {/* Header with search and filter */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Input
            className={styles.searchInput}
            placeholder={t('filters.searchPlaceholder')}
            prefix={<SearchOutlined aria-hidden="true" />}
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            allowClear
            aria-label={t('filters.searchPlaceholder')}
            data-testid="search-input"
          />
          <Select
            className={styles.statusFilter}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: t('filters.all') },
              { value: 'published', label: t('filters.published') },
              { value: 'draft', label: t('filters.draft') },
              { value: 'paused', label: t('filters.paused') },
            ]}
            data-testid="status-filter"
          />
        </div>
        <Tooltip
          title={
            t('activeCoursesLimitReached', { count: MAX_ACTIVE_COURSES }) ||
            `You can have a maximum of ${MAX_ACTIVE_COURSES} active courses`
          }
          placement="left"
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateCourse}
            className={styles.createButton}
            disabled={!canCreateCourse}
            data-testid="create-button"
          >
            {t('actions.create')}
          </Button>
        </Tooltip>
      </div>

      {/* Course table */}
      <div className={styles.tableWrapper}>
        <table className={styles.courseTable} data-testid="course-table">
          <thead>
            <tr>
              <th>{t('table.title')}</th>
              <th className={styles.priceCol}>{t('table.price')}</th>
              <th>{t('table.status')}</th>
              <th className={styles.actionsCol}>{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map(course => {
              const statusConfig = getStatusConfig(course.status);
              return (
                <tr key={course.id} data-testid={`course-row-${course.id}`}>
                  <td>
                    <div className={styles.courseInfo}>
                      <img
                        src={course.coverImage || DEFAULT_COURSE_COVER}
                        alt={course.title}
                        className={styles.courseImage}
                      />
                      <div className={styles.courseDetails}>
                        <div className={styles.courseTitle}>{course.title}</div>
                        <div className={styles.courseMeta}>
                          <span className={styles.subjectTag}>
                            {t(`subject.${course.subject}`)}
                          </span>
                          <span>
                            {course.lessonCount} {t('form.lessons')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.coursePrice}>${course.price}</td>
                  <td>
                    <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
                  </td>
                  <td>
                    <Dropdown menu={{ items: getActionItems(course) }} trigger={['click']}>
                      <Button type="text" icon={<MoreOutlined />} aria-label={t('actions.more')} />
                    </Dropdown>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        title={t('actions.delete')}
        open={!!deleteConfirm}
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
        okText={t('actions.confirm')}
        cancelText={t('actions.cancel')}
        okButtonProps={{ danger: true }}
        data-testid="delete-modal"
      >
        <p>{t('actions.deleteConfirm')}</p>
      </Modal>
    </div>
  );
};

export default CourseList;
