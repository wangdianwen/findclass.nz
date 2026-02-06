import React, { useCallback, useState } from 'react';
import { Upload, Button, Input, message } from 'antd';
import {
  InboxOutlined,
  DeleteOutlined,
  EyeOutlined,
  LinkOutlined,
  FileImageOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { uploadApi } from '@/services/api';
import styles from './QualificationUpload.module.scss';

interface Evidence {
  id: string;
  type: string;
  name: string;
  value: string; // URL for files, link text for URLs
}

interface TeachingEvidenceUploadProps {
  evidence: Evidence[];
  onUpload: (evidence: Evidence) => void;
  onRemove: (id: string) => void;
}

// ============================================
// Component
// ============================================

export const TeachingEvidenceUpload: React.FC<TeachingEvidenceUploadProps> = ({
  evidence,
  onUpload,
  onRemove,
}) => {
  const { t } = useTranslation('teacher');
  const [uploading, setUploading] = useState<string | null>(null);
  const [linkInputs, setLinkInputs] = useState<Record<string, string>>({});

  const handleFileUpload = useCallback(
    async (type: string, file: File) => {
      setUploading(type);

      try {
        const response = await uploadApi.uploadQualification(file, type);
        if (response.success && response.data?.url) {
          const newEvidence: Evidence = {
            id: `${type}-${Date.now()}`,
            type,
            name: file.name,
            value: response.data.url,
          };
          onUpload(newEvidence);
        }
      } catch {
        message.error(t('error'));
      } finally {
        setUploading(null);
      }
    },
    [onUpload, t]
  );

  const handleLinkSubmit = useCallback(
    async (type: string, linkValue: string) => {
      if (!linkValue.trim()) return;

      setUploading(type);

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 500));

      const newEvidence: Evidence = {
        id: `${type}-${Date.now()}`,
        type,
        name: linkValue,
        value: linkValue,
      };

      onUpload(newEvidence);
      setLinkInputs(prev => ({ ...prev, [type]: '' }));
      setUploading(null);
    },
    [onUpload]
  );

  const uploadProps = {
    beforeUpload: (file: File) => {
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error(t('teacherOnboarding.evidence.maxSize', { size: '10MB' }));
        return Upload.LIST_IGNORE;
      }
      return false;
    },
    maxCount: 1,
  };

  // Evidence types with icons and descriptions
  const evidenceTypes = [
    {
      key: 'teachingPhotos',
      title: t('teacherOnboarding.evidence.teachingPhotos'),
      description: t('teacherOnboarding.evidence.teachingPhotosDesc'),
      icon: <FileImageOutlined />,
      accept: 'image/*',
      isLink: false,
      required: true,
    },
    {
      key: 'platformLinks',
      title: t('teacherOnboarding.evidence.platformLinks'),
      description: t('teacherOnboarding.evidence.platformLinksDesc'),
      icon: <LinkOutlined />,
      isLink: true,
      placeholder: t('teacherOnboarding.evidence.linkPlaceholder'),
    },
    {
      key: 'introLetter',
      title: t('teacherOnboarding.evidence.introLetter'),
      description: t('teacherOnboarding.evidence.introLetterDesc'),
      icon: <FileTextOutlined />,
      isLink: false,
      accept: 'image/*,.pdf',
      required: true,
    },
    {
      key: 'awards',
      title: t('teacherOnboarding.evidence.awards'),
      description: t('teacherOnboarding.evidence.awardsDesc'),
      icon: <FileImageOutlined />,
      isLink: false,
      accept: 'image/*,.pdf',
    },
  ];

  const renderUploadArea = (item: (typeof evidenceTypes)[0]) => {
    const existingEvidence = evidence.filter(e => e.type === item.key);
    const isUploading = uploading === item.key;
    const linkInput = linkInputs[item.key] || '';

    return (
      <div
        className={`${styles.uploadCard} ${isUploading ? styles.uploading : ''}`}
        data-testid={`upload-area-${item.key}`}
      >
        <div className={styles.evidenceHeader}>
          <span className={styles.evidenceIcon}>{item.icon}</span>
          <div className={styles.evidenceInfo}>
            <h4 className={styles.evidenceTitle}>{item.title}</h4>
            <p className={styles.evidenceDescription}>{item.description}</p>
          </div>
        </div>

        {existingEvidence.length > 0 ? (
          <div className={styles.fileList}>
            {existingEvidence.map(ev => (
              <div key={ev.id} className={styles.fileItem}>
                <div className={styles.fileInfo}>
                  {ev.value.startsWith('http') ? (
                    <>
                      <LinkOutlined className={styles.fileIcon} />
                      <span className={styles.fileName}>{ev.name}</span>
                    </>
                  ) : (
                    <>
                      <FileImageOutlined className={styles.fileIcon} />
                      <span className={styles.fileName}>{ev.name}</span>
                    </>
                  )}
                </div>
                <div className={styles.fileActions}>
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => window.open(ev.value, '_blank')}
                    data-testid={`preview-button-${item.key}`}
                  />
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onRemove(ev.id)}
                    data-testid={`remove-button-${item.key}`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : item.isLink ? (
          <div className={styles.linkInputSection}>
            <Input
              placeholder={item.placeholder}
              value={linkInput}
              onChange={e => setLinkInputs(prev => ({ ...prev, [item.key]: e.target.value }))}
              onPressEnter={() => handleLinkSubmit(item.key, linkInput)}
              suffix={
                <Button
                  type="primary"
                  size="small"
                  loading={isUploading}
                  onClick={() => handleLinkSubmit(item.key, linkInput)}
                  disabled={!linkInput.trim()}
                >
                  {t('teacherOnboarding.evidence.addLink')}
                </Button>
              }
              data-testid={`link-input-${item.key}`}
            />
          </div>
        ) : (
          <Upload
            {...uploadProps}
            accept={item.accept || 'image/*,.pdf'}
            showUploadList={false}
            onChange={({ file }) => handleFileUpload(item.key, file.originFileObj as File)}
          >
            <div className={styles.uploadContent}>
              <InboxOutlined className={styles.uploadIcon} />
              <p className={styles.uploadPrompt}>
                <Button type="primary" loading={isUploading}>
                  {t('teacherOnboarding.evidence.upload')}
                </Button>
              </p>
            </div>
          </Upload>
        )}
      </div>
    );
  };

  return (
    <div className={styles.uploadSection}>
      <h3 className={styles.sectionTitle}>{t('teacherOnboarding.evidence.title')}</h3>
      <p className={styles.description}>{t('teacherOnboarding.evidence.description')}</p>

      <div className={styles.evidenceList}>{evidenceTypes.map(item => renderUploadArea(item))}</div>
    </div>
  );
};

export default TeachingEvidenceUpload;
