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
} from './users.service';
import { createSuccessResponse } from '@shared/types/api';

export const getProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required',
        },
      });
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
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required',
        },
      });
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
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required',
        },
      });
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
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required',
        },
      });
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
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required',
        },
      });
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
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required',
        },
      });
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
