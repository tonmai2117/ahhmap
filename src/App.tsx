import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Map from './pages/Map'

export default function App() {
  const location = useLocation()
  return (
    <Routes>
      <Route path="/" element={<Map />} />
      <Route path="/map" element={<Map />} />
      <Route path="*" element={<Navigate to={{ pathname: '/map', search: location.search }} replace />} />
    </Routes>
  )
}