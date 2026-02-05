// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import { I18nextProvider } from 'react-i18next';
import { withRouter } from 'storybook-addon-react-router-v6';
import { mswDecorator } from 'msw-storybook-addon';
import i18n from '../src/locales/i18n';
import '../src/styles/globals.scss';
import './manager.scss';

const preview: Preview = {
  // Global a11y configuration
  parameters: {
    msw: {
      // Enable MSW by default for all stories
      handlers: {
        // Handlers are imported from msw-storybook-addon
      },
    },
    a11y: {
      test: 'error', // A11y violations will fail tests and block CI/CD
      config: {
        rules: [
          { id: 'color-contrast', enabled: false },
          { id: 'aria-input-field-name', enabled: false },
        ],
      },
    },
    // Clean white background for components
    backgrounds: {
      default: 'white',
      values: [
        { name: 'white', value: '#ffffff' },
        { name: 'light', value: '#f5f5f5' },
        { name: 'dark', value: '#141414' },
      ],
    },
    // Ensure components render properly
    layout: 'centered',
  },

  // 语言切换工具栏
  globalTypes: {
    locale: {
      name: 'Locale',
      description: 'Internationalization locale',
      defaultValue: 'en',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', right: 'EN', title: 'English' },
          { value: 'zh', right: 'ZH', title: '简体中文' },
        ],
      },
    },
  },

  decorators: [
    // Enable MSW for all stories
    mswDecorator,
    withRouter,
    (Story, context) => {
      const locale = (context.globals.locale as string) || 'en';

      // 同步 Storybook 的 locale 到 i18next
      if (i18n.language !== locale) {
        i18n.changeLanguage(locale).then(() => {
          i18n.loadNamespaces(['search', 'courseManagement', 'teacher', 'userCenter', 'reviews']);
        });
      }

      return (
        <I18nextProvider i18n={i18n}>
          <Story />
        </I18nextProvider>
      );
    },
  ],
};

export default preview;
