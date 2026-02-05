import React from 'react';
import styles from './Loading.module.scss';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

const SIZE_MAP = {
  small: 16,
  medium: 24,
  large: 32,
};

const SPINNER_SIZE_CLASSES = {
  small: 'spinnerIconSmall',
  medium: 'spinnerIconMedium',
  large: 'spinnerIconLarge',
};

export const Loading: React.FC<LoadingProps> = ({ size = 'medium', text }) => {
  const iconSize = SIZE_MAP[size];
  const sizeClass = SPINNER_SIZE_CLASSES[size];

  return (
    <div className={styles.loadingContainer}>
      <span className={`anticon anticon-loading ${styles[sizeClass]}`}>
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="31.4 31.4"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 12 12"
              to="360 12 12"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </span>
      {text && <span className={styles.loadingText}>{text}</span>}
    </div>
  );
};

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
}) => {
  return (
    <div
      className={styles.skeleton}
      style={
        {
          '--skeleton-width': typeof width === 'number' ? `${width}px` : width,
          '--skeleton-height': typeof height === 'number' ? `${height}px` : height,
          '--skeleton-radius': `${borderRadius}px`,
        } as React.CSSProperties
      }
    />
  );
};

interface SectionSkeletonProps {
  height?: string;
  size?: 'small' | 'medium' | 'large';
}

export const SectionSkeleton: React.FC<SectionSkeletonProps> = ({
  height = '200px',
  size = 'large',
}) => {
  const sizeClass =
    size === 'small'
      ? 'sectionSkeletonSmall'
      : size === 'medium'
        ? 'sectionSkeletonMedium'
        : 'sectionSkeletonLarge';
  return (
    <div
      className={`${styles[sizeClass]}`}
      style={{ '--section-skeleton-height': height } as React.CSSProperties}
    >
      <Loading size={size} />
    </div>
  );
};

export const HeroSkeleton: React.FC = () => {
  return (
    <div className={styles.sectionSkeletonHero}>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonSubtitle} />
        <div className={styles.skeletonSearchBar} />
        <div className={styles.skeletonFilters} />
      </div>
    </div>
  );
};

export const FeaturedCoursesSkeleton: React.FC = () => {
  return (
    <div className={styles.sectionSkeletonCourses}>
      <div className={styles.skeletonContainer}>
        <div className={styles.skeletonSectionTitle} />
        <div className={styles.skeletonCardsGrid}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      </div>
    </div>
  );
};

export const FeaturesSkeleton: React.FC = () => {
  return (
    <div className={styles.sectionSkeletonFeatures}>
      <div className={styles.skeletonContainer1200}>
        <div className={styles.skeletonSectionTitleCenter} />
        <div className={styles.skeletonGrid}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className={styles.skeletonGridItem} />
          ))}
        </div>
      </div>
    </div>
  );
};

export const ValueSkeleton: React.FC = () => {
  return (
    <div className={styles.sectionSkeletonValue}>
      <div className={styles.skeletonContainer1200}>
        <div className={styles.skeletonRow}>
          <div className={styles.skeletonTextContent}>
            <div className={styles.skeletonLineShort} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineSm} />
            <div className={styles.skeletonStatGrid}>
              <div className={styles.skeletonStatsGrid}>
                <div className={styles.skeletonStatSimple} />
                <div className={styles.skeletonStatSimple} />
                <div className={styles.skeletonStatSimple} />
                <div className={styles.skeletonStatSimple} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CTASkeleton: React.FC = () => {
  return (
    <div className={styles.sectionSkeletonCTA}>
      <div className={styles.skeletonContainer800}>
        <div className={styles.skeletonLineShort} />
        <div className={styles.skeletonLineNarrow} />
        <div className={styles.skeletonButtons}>
          <div className={styles.skeletonButton} />
          <div className={styles.skeletonButtonOutline} />
        </div>
      </div>
    </div>
  );
};

export const InstitutionSkeleton: React.FC = () => {
  return (
    <div className={styles.sectionSkeletonInstitution}>
      <div className={styles.skeletonInstitutionCard} />
    </div>
  );
};

export const HeaderSkeleton: React.FC = () => {
  return (
    <div className={styles.headerSkeleton}>
      <div className={styles.headerSkeletonContent}>
        <div className={styles.skeletonLogo} />
        <div className={styles.headerSkeletonNav}>
          <div className={styles.skeletonNavLink} />
          <div className={styles.skeletonNavLink} />
          <div className={styles.skeletonNavLink} />
        </div>
        <div className={styles.headerSkeletonActions}>
          <div className={styles.skeletonSelect} />
          <div className={styles.skeletonSelectSmall} />
          <div className={styles.skeletonButton} />
          <div className={styles.skeletonButtonPrimary} />
        </div>
      </div>
    </div>
  );
};

export const AnnouncementBarSkeleton: React.FC = () => {
  return (
    <div className={styles.announcementBarSkeleton}>
      <div className={styles.skeletonAnnouncementIcon} />
      <div className={styles.skeletonAnnouncementText} />
      <div className={styles.skeletonAnnouncementClose} />
    </div>
  );
};

export default Loading;
