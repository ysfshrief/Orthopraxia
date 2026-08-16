import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider, useData } from './context/DataContext'
import { ToastProvider } from './components/UI'
import { DEMO_MODE } from './lib/firebase'
import TabBar from './components/TabBar'
import Home from './pages/Home'
import Program from './pages/Program'
import Leaderboard from './pages/Leaderboard'
import Scan from './pages/Scan'
import Videos from './pages/Videos'
import Competition from './pages/Competition'
import Audio from './pages/Audio'
import Admin from './pages/Admin'

function Shell() {
  const { ready } = useData()
  if (!ready) {
    return <div className="page center-col" style={{ paddingTop: 120 }}><div className="spinner" /><p className="subtle" style={{ marginTop: 14 }}>جارٍ التحميل...</p></div>
  }
  return (
    <>
      {DEMO_MODE && (
        <div style={{ background: 'var(--gold)', color: '#4a2f12', textAlign: 'center', fontSize: 12, fontWeight: 700, padding: '6px 8px' }}>
          وضع تجريبي (Demo) — البيانات محلية. أضف مفاتيح Firebase لتفعيل المزامنة.
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/program" element={<Program />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/videos" element={<Videos />} />
        <Route path="/competition" element={<Competition />} />
        <Route path="/audio" element={<Audio />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      <TabBar />
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <DataProvider>
          <ToastProvider>
            <Shell />
          </ToastProvider>
        </DataProvider>
      </AuthProvider>
    </HashRouter>
  )
}
