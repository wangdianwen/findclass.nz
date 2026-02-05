import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

interface CopyableEmailProps {
  /** Email address to display and copy */
  email: string;
  /** Test ID for testing */
  testId?: string;
}

export const CopyableEmail: React.FC<CopyableEmailProps> = ({
  email,
  testId = 'copyable-email',
}) => {
  return (
    <Text copyable={{ text: email }} data-testid={testId}>
      {email}
    </Text>
  );
};

export default CopyableEmail;
