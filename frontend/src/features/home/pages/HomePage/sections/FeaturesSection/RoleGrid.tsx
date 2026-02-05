import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './FeaturesSection.module.scss';

// ============================================
// Role Card Data Type
// ============================================

interface RoleItem {
  icon: React.ReactNode;
  titleKey: string;
  listItems: string[];
}

// ============================================
// Role Card Component
// ============================================

export const RoleCard: React.FC<{ item: RoleItem }> = ({ item }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.roleCard}>
      <div className={styles.roleIcon}>{item.icon}</div>
      <h3 className={styles.roleCardTitle}>{t(item.titleKey)}</h3>
      <ul className={styles.roleList}>
        {item.listItems.map((listKey, index) => (
          <li key={index}>{t(listKey)}</li>
        ))}
      </ul>
    </div>
  );
};

// ============================================
// Role Grid Component (for Students)
// ============================================

export const StudentRoleGrid: React.FC = () => {
  const studentItems: RoleItem[] = [
    {
      icon: <SearchOutlined />,
      titleKey: 'student.searchCourses',
      listItems: [
        'student.searchCourses.list.1',
        'student.searchCourses.list.2',
        'student.searchCourses.list.3',
        'student.searchCourses.list.4',
      ],
    },
    {
      icon: <CalendarOutlined />,
      titleKey: 'student.bookTrial',
      listItems: [
        'student.bookTrial.list.1',
        'student.bookTrial.list.2',
        'student.bookTrial.list.3',
        'student.bookTrial.list.4',
      ],
    },
    {
      icon: <StarFilled className={styles.starIcon} />,
      titleKey: 'student.reviews',
      listItems: [
        'student.reviews.list.1',
        'student.reviews.list.2',
        'student.reviews.list.3',
        'student.reviews.list.4',
      ],
    },
    {
      icon: <LikeOutlined />,
      titleKey: 'student.favorites',
      listItems: [
        'student.favorites.list.1',
        'student.favorites.list.2',
        'student.favorites.list.3',
        'student.favorites.list.4',
      ],
    },
  ];

  return (
    <div className={styles.roleGrid}>
      {studentItems.map((item, index) => (
        <RoleCard key={index} item={item} />
      ))}
    </div>
  );
};

// ============================================
// Role Grid Component (for Tutors)
// ============================================

export const TutorRoleGrid: React.FC = () => {
  const tutorItems: RoleItem[] = [
    {
      icon: <BookOutlined />,
      titleKey: 'tutor.publishCourses',
      listItems: [
        'tutor.publishCourses.list.1',
        'tutor.publishCourses.list.2',
        'tutor.publishCourses.list.3',
        'tutor.publishCourses.list.4',
      ],
    },
    {
      icon: <UserOutlined />,
      titleKey: 'tutor.studentMgmt',
      listItems: [
        'tutor.studentMgmt.list.1',
        'tutor.studentMgmt.list.2',
        'tutor.studentMgmt.list.3',
        'tutor.studentMgmt.list.4',
      ],
    },
    {
      icon: <SafetyCertificateFilled />,
      titleKey: 'tutor.verification',
      listItems: [
        'tutor.verification.list.1',
        'tutor.verification.list.2',
        'tutor.verification.list.3',
        'tutor.verification.list.4',
      ],
    },
    {
      icon: <ThunderboltOutlined />,
      titleKey: 'tutor.zeroCommission',
      listItems: [
        'tutor.zeroCommission.list.1',
        'tutor.zeroCommission.list.2',
        'tutor.zeroCommission.list.3',
        'tutor.zeroCommission.list.4',
      ],
    },
  ];

  return (
    <div className={styles.roleGrid}>
      {tutorItems.map((item, index) => (
        <RoleCard key={index} item={item} />
      ))}
    </div>
  );
};

// Import additional icons needed
import {
  SearchOutlined,
  CalendarOutlined,
  StarFilled,
  LikeOutlined,
  BookOutlined,
  UserOutlined,
  SafetyCertificateFilled,
  ThunderboltOutlined,
} from '@ant-design/icons';

export default RoleCard;
