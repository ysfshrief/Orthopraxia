import { useEffect, useState } from 'react'
import { subscribe } from '../lib/store'
import { useData } from '../context/DataContext'

function ytId(url = '') {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
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
          src={`https://www.youtube.com/embed/${heroId}?rel=0&modestbranding=1`}
          title={hero.title || 'Main Video'}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

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
                    src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`}
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
