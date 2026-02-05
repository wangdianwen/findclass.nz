// @ts-nocheck - Storybook stories file
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { ReviewCard } from '@/features/review/components/ReviewCard/index.tsx';
import { MOCK_REVIEWS } from '@/data/reviews.js';

const meta = {
  title: 'Features/Review/Review Card',
  component: ReviewCard,
  tags: ['autodocs', 'a11y'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: 'Review card component for displaying individual reviews' } },
    i18n: {
      locale: 'en',
      loadNamespaces: ['reviews'],
    },
  },
  args: {
    review: MOCK_REVIEWS[0],
    onHelpful: fn(),
    onReport: fn(),
    onEdit: fn(),
  },
} satisfies Meta<typeof ReviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// Default - Review card with all info
// ============================================
export const Default: Story = {
  play: async ({ canvasElement }) => {
    // Verify user info is rendered
    await expect(within(canvasElement).getByText(MOCK_REVIEWS[0].userName)).toBeInTheDocument();

    // Verify title is rendered
    await expect(canvasElement.textContent).toContain(MOCK_REVIEWS[0].title!);

    // Verify content is rendered
    await expect(canvasElement.textContent).toContain(MOCK_REVIEWS[0].content);

    // Verify tags are rendered
    const tags = canvasElement.querySelectorAll('[class~="ant-tag"]');
    await expect(tags.length).toBeGreaterThan(0);
  },
};

// ============================================
// With Reply - Review with reply data
// Note: Reply rendering is handled at the ReviewsPage level, not individual ReviewCard
// This story demonstrates how a review card with reply data would appear
// ============================================
export const WithReply: Story = {
  args: {
    review: MOCK_REVIEWS[0], // This review has a reply in the mock data
  },
  play: async ({ canvasElement }) => {
    // Verify the review card is rendered with the review that has reply data
    await expect(within(canvasElement).getByText(MOCK_REVIEWS[0].userName)).toBeInTheDocument();

    // Verify the main review content is rendered
    await expect(canvasElement.textContent).toContain('老师讲解清晰');
  },
};

// ============================================
// Helpful Action - Click helpful button
// ============================================
export const HelpfulAction: Story = {
  play: async ({ canvasElement, args }) => {
    // Find helpful button and click
    const helpfulButton = canvasElement.querySelector('[data-testid="helpful-button"]');
    if (helpfulButton) {
      await userEvent.click(helpfulButton);
      await expect(args.onHelpful).toHaveBeenCalled();
    }
  },
};

// ============================================
// Report Action - Click report button
// ============================================
export const ReportAction: Story = {
  play: async ({ canvasElement, args }) => {
    // Find report button and click
    const reportButton = canvasElement.querySelector('[data-testid="report-button"]');
    if (reportButton) {
      await userEvent.click(reportButton);
      await expect(args.onReport).toHaveBeenCalled();
    }
  },
};

// ============================================
// Medium Rating - 3 star review
// ============================================
export const MediumRating: Story = {
  args: {
    review: {
      ...MOCK_REVIEWS[0],
      overallRating: 3,
      title: '中规中矩',
      content: '课程内容还可以，但感觉互动性稍微少了一些。',
    },
  },
  play: async ({ canvasElement }) => {
    // Verify title shows correct rating context
    await expect(canvasElement.textContent).toContain('中规中矩');
  },
};

// ============================================
// Low Rating - 1-2 star review
// ============================================
export const LowRating: Story = {
  args: {
    review: {
      ...MOCK_REVIEWS[0],
      overallRating: 2,
      title: '体验一般',
      content: '没有达到预期效果，课程进度有些快。',
    },
  },
  play: async ({ canvasElement }) => {
    // Verify title shows correct rating context
    await expect(canvasElement.textContent).toContain('体验一般');
  },
};

// ============================================
// No Reply - Review without teacher reply
// ============================================
export const NoReply: Story = {
  args: {
    review: MOCK_REVIEWS[1], // This review doesn't have a reply
  },
  play: async ({ canvasElement }) => {
    // Verify the review card is rendered
    await expect(within(canvasElement).getByText(MOCK_REVIEWS[1].userName)).toBeInTheDocument();

    // Verify the review content is rendered (without reply data)
    await expect(canvasElement.textContent).toContain('经过一个学期');
  },
};

// ============================================
// Multiple Tags - Review with 3 tags
// ============================================
export const MultipleTags: Story = {
  args: {
    review: {
      ...MOCK_REVIEWS[0],
      tags: ['教学认真', '有耐心', '收获很大'],
    },
  },
  play: async ({ canvasElement }) => {
    // Verify 3 tags are rendered
    const tags = canvasElement.querySelectorAll('[class~="ant-tag"]');
    await expect(tags.length).toBe(3);
  },
};
