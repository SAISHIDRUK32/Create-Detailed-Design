import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { AuctionDetail } from "./pages/AuctionDetail";
import { BuyerDashboard } from "./pages/BuyerDashboard";
import { SellerDashboard } from "./pages/SellerDashboard";
import { Watchlist } from "./pages/Watchlist";
import { AdminPanel } from "./pages/AdminPanel";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { CreateAuction } from "./pages/CreateAuction";
import { LiveAuction } from "./pages/LiveAuction";
import { LiveAuctionViewer } from "./pages/LiveAuctionViewer";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  // Auth routes (no layout)
  { path: "/login", Component: Login },
  { path: "/register", Component: Register },

  // Main app routes (with layout)
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "auction/:id", Component: AuctionDetail },
      { path: "create-auction", Component: CreateAuction },
      { path: "live/:id", Component: LiveAuction },
      { path: "live/:id/watch", Component: LiveAuctionViewer },
      { path: "buyer-dashboard", Component: BuyerDashboard },
      { path: "seller-dashboard", Component: SellerDashboard },
      { path: "watchlist", Component: Watchlist },
      { path: "admin", Component: AdminPanel },
      { path: "*", Component: NotFound },
    ],
  },
]);