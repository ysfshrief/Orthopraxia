import { useEffect, useState } from 'react'
import { subscribe } from '../lib/store'
import { useData } from '../context/DataContext'

function ytId(url = '') {
  if (!url) return null
  url = url.trim()
  // try multiple patterns
  const patterns = [
    /[?&]v=([\w-]{11})/,                       // watch?v=ID
    /youtu\.be\/([\w-]{11})/,                  // youtu.be/ID
    /youtube\.com\/embed\/([\w-]{11})/,        // embed/ID
    /youtube\.com\/shorts\/([\w-]{11})/,       // shorts/ID
    /youtube\.com\/live\/([\w-]{11})/,         // live/ID
    /^([\w-]{11})$/                            // bare ID
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export default function MainVideo() {
  const { settings } = useData()
  const [videos, setVideos] = useState([])

  useEffect(() => subscribe('mainVideos', arr => {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0)); setVideos(arr)
  }), [])

  if (!settings?.mainVideoVisible) return null

  // show all visible videos (first is the hero)
  const visible = videos.filter(v => v.visible !== false && ytId(v.url))
  if (visible.length === 0) return null

  const hero = visible[0]
  const heroId = ytId(hero.url)

  return (
    <div style={{ marginBottom: 20 }}>
      {hero.title && <h3 className="section-title" style={{ marginTop: 0 }}>{hero.title}</h3>}
      <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '2px solid var(--gold)' }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${heroId}?rel=0&modestbranding=1&playsinline=1`}
          title={hero.title || 'Main Video'}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <a href={`https://www.youtube.com/watch?v=${heroId}`} target="_blank" rel="noopener noreferrer"
        className="subtle" style={{ display: 'block', textAlign: 'center', marginTop: 6, fontSize: 12 }}>
        لا يعمل الفيديو؟ افتحه على يوتيوب ↗
      </a>

      {/* additional visible videos as smaller players */}
      {visible.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
          {visible.slice(1).map(v => {
            const id = ytId(v.url)
            return (
              <div key={v.id}>
                {v.title && <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--maroon)' }}>{v.title}</div>}
                <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                  <iframe loading="lazy"
                    src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`}
                    title={v.title || 'video'}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
