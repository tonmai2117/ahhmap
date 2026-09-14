import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Map from './pages/Map'
import ArtMap from './pages/ArtMap'
import Admin from './pages/Admin'

export default function App() {
  const location = useLocation()
  return (
    <Routes>
      <Route path="/" element={<ArtMap />} />
      <Route path="/art-map" element={<ArtMap />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/map" element={<Map />} />
      <Route path="*" element={<Navigate to={{ pathname: '/map', search: location.search }} replace />} />
    </Routes>
  )
}
