/**
 * Auction Routes - CRUD + Search/Filter
 */

import { Router, Response } from 'express';
import Auction from '../models/Auction';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Duration map (same as frontend)
const durationToMs: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '3h': 3 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

/**
 * GET /api/auctions
 * List auctions with optional filters
 */
router.get('/', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, category, sort, limit = '20', page = '1' } = req.query;

    const filter: Record<string, any> = {};

    // Filter by status
    if (status) {
      if (status === 'active') {
        filter.status = { $in: ['live', 'ending_soon'] };
      } else {
        filter.status = status;
      }
    }

    // Filter by category
    if (category && category !== 'All') {
      filter.category = category;
    }

    // Sorting
    let sortOption: Record<string, 1 | -1> = { startTime: -1 };
    switch (sort) {
      case 'ending_soon':
        sortOption = { endTime: 1 };
        break;
      case 'newest':
        sortOption = { startTime: -1 };
        break;
      case 'price_low':
        sortOption = { currentBid: 1 };
        break;
      case 'price_high':
        sortOption = { currentBid: -1 };
        break;
      case 'most_bids':
        sortOption = { bidCount: -1 };
        break;
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [auctions, total] = await Promise.all([
      Auction.find(filter).sort(sortOption).skip(skip).limit(limitNum),
      Auction.countDocuments(filter),
    ]);

    res.json({
      auctions: auctions.map(a => a.toJSON()),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('List auctions error:', error);
    res.status(500).json({ error: 'Failed to fetch auctions' });
  }
});

/**
 * GET /api/auctions/:id
 * Get single auction by ID
 */
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      res.status(404).json({ error: 'Auction not found' });
      return;
    }
    res.json({ auction: auction.toJSON() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch auction' });
  }
});

/**
 * POST /api/auctions
 * Create a new auction (authenticated)
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title, description, category, condition, images,
      startingPrice, reservePrice, buyNowPrice, minIncrement,
      duration, startTime, enableAntiSnipe, isLiveStream,
    } = req.body;

    if (!title || !description || !category) {
      res.status(400).json({ error: 'Title, description, and category are required' });
      return;
    }

    const now = new Date();
    const durationMs = durationToMs[duration] || durationToMs['1d'];
    const auctionStartTime = startTime === 'now' ? now : new Date(startTime);
    const auctionEndTime = new Date(auctionStartTime.getTime() + durationMs);

    const auction = new Auction({
      title,
      description,
      category,
      condition: condition || 'good',
      images: images || [],
      startingPrice: startingPrice || 100,
      currentBid: startingPrice || 100,
      reservePrice: reservePrice || 0,
      buyNowPrice: buyNowPrice || 0,
      minIncrement: minIncrement || 10,
      seller: req.userId,
      sellerName: req.user?.name || 'Unknown',
      startTime: auctionStartTime,
      endTime: auctionEndTime,
      status: startTime === 'now' ? 'live' : 'scheduled',
      enableAntiSnipe: enableAntiSnipe !== false,
      reserveMet: reservePrice ? (startingPrice || 100) >= reservePrice : true,
      isLiveStream: isLiveStream || false,
    });

    await auction.save();

    // Broadcast new auction via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('auction-created', auction.toJSON());
    }

    res.status(201).json({ auction: auction.toJSON() });
  } catch (error) {
    console.error('Create auction error:', error);
    res.status(500).json({ error: 'Failed to create auction' });
  }
});

/**
 * PATCH /api/auctions/:id
 * Update auction (seller only)
 */
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      res.status(404).json({ error: 'Auction not found' });
      return;
    }

    if (auction.seller.toString() !== req.userId) {
      res.status(403).json({ error: 'You can only update your own auctions' });
      return;
    }

    const allowedUpdates = ['title', 'description', 'images', 'status', 'isLiveStream'];
    const updates: Record<string, any> = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const updated = await Auction.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${req.params.id}`).emit('auction-update', updated?.toJSON());
    }

    res.json({ auction: updated?.toJSON() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update auction' });
  }
});

/**
 * POST /api/auctions/:id/watch
 * Toggle watchlist for current user
 */
router.post('/:id/watch', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      res.status(404).json({ error: 'Auction not found' });
      return;
    }

    const userId = req.user!._id;
    const isWatching = auction.watchers.some(w => w.toString() === userId.toString());

    if (isWatching) {
      auction.watchers = auction.watchers.filter(w => w.toString() !== userId.toString());
    } else {
      auction.watchers.push(userId);
    }

    await auction.save();

    res.json({ watching: !isWatching, watcherCount: auction.watchers.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update watchlist' });
  }
});

export default router;
