// @ts-nocheck - Storybook stories file
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent } from '@storybook/test';
import { MyReviews } from '@/features/user/pages/UserCenterPage/sections/MyReviews/index.tsx';

const meta = {
  title: 'Features/User/User Center/My Reviews',
  component: MyReviews,
  tags: ['autodocs', 'a11y'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Component for displaying and managing user reviews in the personal center.',
      },
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['reviews'],
    },
  },
  args: {},
} satisfies Meta<typeof MyReviews>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// Default - Shows user's reviews with edit buttons
// ============================================
export const Default: Story = {
  play: async ({ canvasElement }) => {
    // Verify component renders
    await expect(canvasElement.querySelector('[data-testid="my-reviews"]')).toBeInTheDocument();

    // Verify title renders
    const title = canvasElement.querySelector('h2');
    await expect(title).toBeInTheDocument();

    // Verify review cards render (should have 2 reviews in mock data)
    const reviewCards = canvasElement.querySelectorAll('[data-testid="review-card"]');
    await expect(reviewCards.length).toBe(2);

    // Verify edit buttons exist (for own reviews)
    const editButtons = canvasElement.querySelectorAll('[data-testid^="edit-"]');
    await expect(editButtons.length).toBe(2);

    // Verify no write review button
    const writeButton = canvasElement.querySelector('[data-testid="write-review-button"]');
    await expect(writeButton).not.toBeInTheDocument();

    // Verify no action buttons (helpful/report) - they should not exist when showActions={false}
    const actionsDiv = canvasElement.querySelector('[class*="actions"]');
    await expect(actionsDiv).not.toBeInTheDocument();

    // Verify course/teacher links exist
    const courseLinks = canvasElement.querySelectorAll('[class*="linkItem"]');
    await expect(courseLinks.length).toBeGreaterThan(0);
  },
};

// ============================================
// Edit Review - Click edit button
// ============================================
export const EditReview: Story = {
  play: async ({ canvasElement }) => {
    // Find the first review card
    const firstReviewCard = canvasElement.querySelector('[data-testid="review-card"]');
    await expect(firstReviewCard).toBeInTheDocument();

    // Verify edit button exists in first review card
    const editButton = firstReviewCard.querySelector('[data-testid="edit-review-001"]');
    await expect(editButton).toBeInTheDocument();

    // Click edit button
    await userEvent.click(editButton);

    // Note: Modal may not render in test environment due to portal rendering
    // but the click should trigger the onEdit handler
  },
};

// ============================================
// Review Content - Verify review details display
// ============================================
export const ReviewContent: Story = {
  play: async ({ canvasElement }) => {
    // Get first review card
    const reviewCards = canvasElement.querySelectorAll('[data-testid="review-card"]');
    await expect(reviewCards.length).toBeGreaterThan(0);

    const firstReviewCard = reviewCards[0];

    // Verify review title renders
    await expect(firstReviewCard.textContent).toContain('非常推荐张老师！');

    // Verify review content renders
    await expect(firstReviewCard.textContent).toContain('老师讲解清晰');

    // Verify tags render
    const tags = firstReviewCard.querySelectorAll('[class~="ant-tag"]');
    await expect(tags.length).toBeGreaterThan(0);

    // Verify course link renders
    const courseLinks = firstReviewCard.querySelectorAll('[class*="linkItem"]');
    await expect(courseLinks.length).toBe(1); // course link only

    // Verify course link has correct text
    const courseLink = firstReviewCard.querySelector('[class*="linkItem"]');
    await expect(courseLink?.textContent).toContain('数学提高班');
  },
};
