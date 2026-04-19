/**
 * AURA-Auction: A Live, Intelligent Auction Arena
 *
 * A premium real-time auction platform featuring:
 * - Immersive live bidding with real-time updates
 * - Live camera streaming for sellers
 * - AI-powered authentication and trust scores
 * - Glassmorphism design with dark mode
 * - Full buyer and seller dashboards with analytics
 * - Responsive design (mobile, tablet, desktop)
 * - WCAG 2.1 AA accessibility compliance
 */

import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { AuctionProvider } from "./context/AuctionContext";
import { LiveStreamProvider } from "./context/LiveStreamContext";

export default function App() {
  return (
    <AuthProvider>
      <AuctionProvider>
        <LiveStreamProvider>
          <RouterProvider router={router} />
        </LiveStreamProvider>
      </AuctionProvider>
    </AuthProvider>
  );
}