import { Routes, Route, Navigate } from 'react-router-dom'
import Register from './pages/Register'
import Map      from './pages/Map'
import AR       from './pages/AR'
import Wallet   from './pages/Wallet'
import ShopCoupons from './pages/ShopCoupons'
import ShopStats from './pages/ShopStats'
import ShopHost from './pages/ShopHost'
import ShopMap from './pages/ShopMap'
import Profile  from './pages/Profile'
import HostRedirect from './pages/HostRedirect'
import HostCampaigns from './pages/HostCampaigns'
import CampaignDetail from './pages/CampaignDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/register"        element={<Register />} />
      <Route path="/map"             element={<Map />} />
      <Route path="/ar/:treasureId"  element={<AR />} />
      <Route path="/wallet"          element={<Wallet />} />
      <Route path="/holder"          element={<Navigate to="/shop/coupons" replace />} />
      <Route path="/shop/coupons"    element={<ShopCoupons />} />
      <Route path="/shop/stats"      element={<ShopStats />} />
      <Route path="/shop/host"       element={<ShopHost />} />
      <Route path="/shop/map"        element={<ShopMap />} />
      <Route path="/profile"         element={<Profile />} />
      <Route path="/host"            element={<HostRedirect />} />
      <Route path="/hosts/:hostSlug/campaigns" element={<HostCampaigns />} />
      <Route path="/hosts/:hostSlug/campaigns/:campaignSlug" element={<CampaignDetail />} />
      <Route path="*"                element={<Navigate to="/map" replace />} />
    </Routes>
  )
}
