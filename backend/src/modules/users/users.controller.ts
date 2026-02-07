/**
 * Users Module - Controller
 */

import type { Request, Response, NextFunction } from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getChildren,
  addChild,
  recordParentalConsent,
  getFavorites,
  changePassword,
  deactivateAccount,
  updateChildById,
  deleteChildById,
  deleteLearningRecordById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getMyReviews,
  deleteReviewById,
} from './users.service';
import { createSuccessResponse } from '@shared/types/api';

// Helper to get user ID from request
function getUserIdFromRequest(req: Request): string | null {
  return req.user?.userId || null;
}

// Helper to get param ID from request (handles string | string[])
function getParamId(req: Request, paramName: string): string {
  const value = req.params[paramName];
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}

// Helper to send unauthorized response
function sendUnauthorized(res: Response): void {
  res.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message: 'User authentication required',
    },
  });
}

export const getProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }
    const user = await getUserProfile(userId);

    res.json(
      createSuccessResponse(
        user,
        'Profile retrieved',
        user?.language,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

export const updateProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }
    const dto = req.body;
    const user = await updateUserProfile(userId, dto);

    res.json(
      createSuccessResponse(
        { user },
        'Profile updated',
        user.language,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getChildrenController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }
    const children = await getChildren(userId);

    res.json(
      createSuccessResponse(
        { items: children },
        'Children retrieved',
        req.headers['accept-language'] as string,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

export const addChildController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }
    const dto = req.body;
    const child = await addChild(userId, dto);

    res
      .status(201)
      .json(
        createSuccessResponse(
          { child },
          'Child added',
          dto.language,
          req.headers['x-request-id'] as string
        )
      );
  } catch (error) {
    next(error);
  }
};

export const parentalConsentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }
    const { childId } = req.body;
    await recordParentalConsent(userId, childId);

    res.json(
      createSuccessResponse(
        { consentDate: new Date().toISOString() },
        'Parental consent recorded',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getFavoritesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }
    const favorites = await getFavorites(userId);

    res.json(
      createSuccessResponse(
        { items: favorites },
        'Favorites retrieved',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

// ============ NEW CONTROLLERS ============

/**
 * Change password controller
 */
export const changePasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }
    const { currentPassword, newPassword } = req.body;

    await changePassword(userId, currentPassword, newPassword);

    res.json(
      createSuccessResponse(
        null,
        'Password changed successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete account controller (soft delete)
 */
export const deleteAccountController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }

    await deactivateAccount(userId);

    res.json(
      createSuccessResponse(
        null,
        'Account deleted successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update child controller
 */
export const updateChildController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }
    const id = getParamId(req, 'id');
    const dto = req.body;

    const child = await updateChildById(id, userId, dto);

    res.json(
      createSuccessResponse(
        { child },
        'Child updated successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete child controller
 */
export const deleteChildController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }
    const id = getParamId(req, 'id');

    await deleteChildById(id, userId);

    res.json(
      createSuccessResponse(
        null,
        'Child deleted successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete learning record controller
 */
export const deleteLearningRecordController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }
    const id = getParamId(req, 'id');

    await deleteLearningRecordById(id, userId);

    res.json(
      createSuccessResponse(
        null,
        'History item removed successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read controller
 */
export const markNotificationReadController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }
    const id = getParamId(req, 'id');

    await markNotificationAsRead(id, userId);

    res.json(
      createSuccessResponse(
        null,
        'Notification marked as read',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read controller
 */
export const markAllNotificationsReadController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }

    await markAllNotificationsAsRead(userId);

    res.json(
      createSuccessResponse(
        null,
        'All notifications marked as read',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete notification controller
 */
export const deleteNotificationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }
    const id = getParamId(req, 'id');

    await deleteNotification(id, userId);

    res.json(
      createSuccessResponse(
        null,
        'Notification deleted successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get my reviews controller
 */
export const getMyReviewsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }

    const { reviews, total } = await getMyReviews(userId);

    res.json(
      createSuccessResponse(
        { items: reviews, total },
        'Reviews retrieved',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete review controller
 */
export const deleteReviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      sendUnauthorized(res);
      return;
    }
    const id = getParamId(req, 'id');

    await deleteReviewById(id, userId);

    res.json(
      createSuccessResponse(
        null,
        'Review deleted successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};
