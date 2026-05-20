import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BookingPage    from './pages/BookingPage'
import AdminPage      from './pages/AdminPage'
import AdminLoginPage from './pages/AdminLoginPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"             element={<Navigate to="/rezervace" replace />} />
        <Route path="/rezervace"    element={<BookingPage />} />
        <Route path="/admin"        element={<AdminPage />} />
        <Route path="/admin/login"  element={<AdminLoginPage />} />
        <Route path="*"             element={<Navigate to="/rezervace" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
