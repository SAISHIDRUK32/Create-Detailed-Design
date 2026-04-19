/**
 * Bid Routes - Place bids and get bid history
 *
 * Bid placement uses server-side validation for security.
 */

import { Router, Response } from 'express';
import Auction from '../models/Auction';
import Bid from '../models/Bid';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/bids/:auctionId
 * Place a bid on an auction
 */
router.post('/:auctionId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { auctionId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Valid bid amount is required' });
      return;
    }

    // Get auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      res.status(404).json({ error: 'Auction not found' });
      return;
    }

    // Validate auction is active
    if (auction.status !== 'live' && auction.status !== 'ending_soon') {
      res.status(400).json({ error: 'This auction is not accepting bids' });
      return;
    }

    // Can't bid on own auction
    if (auction.seller.toString() === req.userId) {
      res.status(400).json({ error: 'You cannot bid on your own auction' });
      return;
    }

    // Check minimum bid
    const minBid = auction.currentBid + auction.minIncrement;
    if (amount < minBid) {
      res.status(400).json({ error: `Minimum bid is $${minBid.toLocaleString()}` });
      return;
    }

    // Check if already highest bidder
    const currentWinningBid = await Bid.findOne({
      auction: auctionId,
      status: 'winning',
    });

    if (currentWinningBid && currentWinningBid.bidder.toString() === req.userId) {
      res.status(400).json({ error: 'You are already the highest bidder' });
      return;
    }

    // Update previous winning bid to outbid
    if (currentWinningBid) {
      currentWinningBid.status = 'outbid';
      await currentWinningBid.save();
    }

    // Create new bid
    const bid = new Bid({
      auction: auctionId,
      bidder: req.userId,
      bidderName: req.user?.name || 'Unknown',
      amount,
      status: 'winning',
    });
    await bid.save();

    // Update auction
    let newEndTime = auction.endTime;
    // Anti-snipe: extend if bid placed in last 2 minutes
    if (auction.enableAntiSnipe) {
      const timeRemaining = auction.endTime.getTime() - Date.now();
      if (timeRemaining < 2 * 60 * 1000 && timeRemaining > 0) {
        newEndTime = new Date(auction.endTime.getTime() + 2 * 60 * 1000);
      }
    }

    auction.currentBid = amount;
    auction.bidCount += 1;
    auction.endTime = newEndTime;
    auction.reserveMet = auction.reservePrice ? amount >= auction.reservePrice : true;
    await auction.save();

    const bidData = bid.toJSON();

    // Broadcast new bid via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${auctionId}`).emit('new-bid', {
        bid: bidData,
        auction: auction.toJSON(),
      });
    }

    res.status(201).json({ success: true, bid: bidData });
  } catch (error) {
    console.error('Place bid error:', error);
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

/**
 * GET /api/bids/:auctionId
 * Get bid history for an auction
 */
router.get('/:auctionId', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bids = await Bid.find({ auction: req.params.auctionId })
      .sort({ amount: -1 })
      .limit(50);

    res.json({ bids: bids.map(b => b.toJSON()) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

/**
 * GET /api/bids/user/me
 * Get current user's bids
 */
router.get('/user/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bids = await Bid.find({ bidder: req.userId })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('auction', 'title images status currentBid endTime');

    res.json({ bids: bids.map(b => b.toJSON()) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user bids' });
  }
});

export default router;
