import type { Meta } from '@storybook/react';

const meta: Meta = {
  title: 'Features/Teacher/CourseManagement',
  parameters: {
    status: {
      type: 'deprecated',
    },
    design: {
      type: 'figma',
      url: 'https://figma.com/file/xxxxx',
    },
  },
};

export default meta;

export * from './CourseForm.stories';
export * from './CourseList.stories';
