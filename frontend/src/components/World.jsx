import { useEffect, useRef } from 'react'
import { SCENES } from '../config/scene'

export default function World({ dim, orbiting, stream, sceneId = 'street' }) {
  const video = useRef(null)
  useEffect(() => {
    if (video.current) video.current.srcObject = stream || null
  }, [stream])
  return (
    <div className={`world ${dim ? 'dim' : ''} ${orbiting ? 'orbiting' : ''}`} aria-hidden="true">
      {Object.values(SCENES).map((sc) => (
        <img key={sc.id} className={`photo ${sc.id === sceneId ? 'on' : ''}`} src={sc.src} alt=""
          style={{ objectPosition: `${sc.focus.x * 100}% ${sc.focus.y * 100}%` }} />
      ))}
      {stream && <video ref={video} className="cam" autoPlay playsInline muted />}
    </div>
  )
}

// The glasses lens: rounded window, dark teal surround, soft falloff, faint sheen.
export const Lens = () => <div className="lens" />
