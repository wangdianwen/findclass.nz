import React from 'react';
import { Radio, Tooltip } from 'antd';
import { DEFAULT_AVATAR_OPTIONS, DEFAULT_AVATAR } from '@/utils/defaultImages';
import styles from './DefaultAvatarSelector.module.scss';

interface DefaultAvatarSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

// Show all 9 avatars in a 3x3 grid
const DISPLAY_AVATARS = DEFAULT_AVATAR_OPTIONS;

export const DefaultAvatarSelector: React.FC<DefaultAvatarSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const currentValue = value || DEFAULT_AVATAR;

  return (
    <div className={styles.avatarSelector}>
      <Radio.Group
        value={currentValue}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled}
        className={styles.avatarGroup}
      >
        {DISPLAY_AVATARS.map(avatar => (
          <Tooltip key={avatar.id} title={avatar.label} placement="top">
            <Radio.Button value={avatar.url} className={styles.avatarButton}>
              <img src={avatar.url} alt={avatar.label} className={styles.avatarImage} />
            </Radio.Button>
          </Tooltip>
        ))}
      </Radio.Group>
    </div>
  );
};

export default DefaultAvatarSelector;
