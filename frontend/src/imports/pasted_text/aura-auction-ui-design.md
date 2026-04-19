Design a distinctive, user-centric **live auction website UI** for a platform called “AURA-Auction” — a real-time, AI-assisted auction system focused on speed, fairness, and trust.

---

## 1) Audience and Goals

### Target Users

* **Collectors** (high-value, detail-oriented, trust-focused)
* **Casual bidders** (mobile-first, quick interactions, low friction)
* **Sellers** (need transparency, analytics, and control)

### Primary Goals

* Make bidding **fast, intuitive, and real-time**
* Enable **easy discovery of auctions** with minimal cognitive load
* Build **trust and transparency** through UI (clear history, verification signals)
* Ensure **accessibility-first design** for all user types

---

## 2) Design Direction and Constraints

### Visual Style

* Brand-agnostic but futuristic and premium
* Combine **glassmorphism + soft shadows + subtle gradients**
* Optional themes:

  * Dark mode (primary)
  * Light mode (secondary)
* Use motion to convey “live” activity (pulsing, flowing data)

### Accessibility Targets

* WCAG 2.1 AA compliance minimum
* Color contrast ≥ 4.5:1
* Full keyboard navigation support
* Screen reader hints for:

  * Bid updates
  * Countdown timers
  * Alerts (e.g., outbid notifications)

### Responsiveness

* Desktop (1440px+): full dashboard with multi-panel layout
* Tablet (768–1024px): simplified grid + collapsible panels
* Mobile (360–480px): stacked layout, thumb-friendly bidding UI

---

## 3) Core Features to Inspire UI

### Live Bidding Interface

* Prominent **current highest bid (center focus)**
* Real-time bid updates (animated transitions)
* Countdown timer with urgency cues
* Reserve price status (met / not met)
* “You are leading” / “You’ve been outbid” states

### Auction Discovery

* Card-based browsing with:

  * Category filters
  * Smart recommendations (“Based on your activity”)
* Visual tags (ending soon, trending, verified seller)

### Real-Time Participation

* Watchlist system
* Notification tray (live updates, alerts)
* Activity feed showing bids in real time

### Seller/Buyer Dashboards

* Seller: auction performance, bids graph, payout status
* Buyer: active bids, watchlist, history
* Verification flows (ID check, trust badges)

### Transparency Features

* Full bid history timeline
* Provenance section (ownership, authenticity proof)
* Risk/trust indicators (AI confidence score UI hint)

---

## 4) Unique Design Cues to Differentiate

### Novel Interaction Patterns

* “Immersive bidding scene”:

  * A focused modal-like environment where users feel inside the auction
* AR-like preview for items (3D rotation or depth illusion)
* Tactile micro-interactions:

  * Bid button has pressure-like feedback animation
  * Countdown pulses faster near end

### Innovative Layout Approaches

* Fluid layout with **modular cards + live data overlays**
* Ambient data visualization:

  * Subtle graphs showing bidding intensity over time
* Split-screen:

  * Left: item preview
  * Right: live bidding + chat/activity

### Microcopy & Tone

* Friendly but high-trust tone:

  * “You’re in the lead”
  * “Another bidder just jumped in”
  * “Final seconds — place your bid now”
* Avoid robotic language; use **human, exciting, transparent messaging**

---

## 5) Figma AI Prompt Structure

### Required Deliverables

* Low-fidelity wireframes (all key screens)
* High-fidelity UI designs (desktop + mobile)
* Component library (design system)
* Motion specifications (animations, transitions)

### Suggested Components

* AuctionCard
* LiveBiddingPanel
* PreviewGallery (with 3D/interactive feel)
* BidButton (states: idle, hover, active, success, error)
* CountdownTimer
* FiltersPanel
* UserBadge (verified, risk level)
* NotificationTray
* BidHistoryTimeline

### Asset & Data Guidance

Use realistic sample data:

Auction Listing:

* title, images, starting_price, current_bid, reserve_price, end_time, seller_info

Bid:

* bidder_id, amount, timestamp, status

User:

* name, rating, verification_status

### Prototyping Interactions

* Real-time bid update simulation (auto-refresh every 1–2 sec)
* Smooth transitions between bids
* Micro-interactions:

  * Button press animation
  * Notification slide-in
* Countdown urgency animation
* State changes (leading → outbid)

### Accessibility & Inclusive Design Notes

* Provide text alternatives for all visuals
* Ensure focus states are clearly visible
* Avoid color-only indicators (use icons + labels)
* Large tap targets for mobile

---

## 6) Evaluation and Iteration Plan

### Evaluate Uniqueness

* Does it feel different from eBay-style layouts?
* Are interactions immersive and “live-feeling”?
* Is AI-driven trust visibly integrated into UI?

### A/B Testing Ideas

* Standard list vs immersive bidding view
* Static vs animated countdown
* Minimal vs rich data overlays

### Success Metrics

* Time to place first bid
* User engagement (watchlist, session time)
* Bid conversion rate
* Trust perception (user feedback)
* Drop-off during bidding process

---

Design the experience to feel like:
**“A live, intelligent auction arena — not just a website.”**
