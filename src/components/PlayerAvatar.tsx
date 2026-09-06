import { useEffect, useState } from 'react'
import { Icon } from './Icon'

type PlayerAvatarProps = {
  /** LINE CDN URL, or null/undefined for a player who has none stored yet. */
  src: string | null | undefined
  alt: string
  size: number
  iconSize: number
  /** Shell overrides — each call site keeps its own circle styling. */
  style?: React.CSSProperties
  /** Applied to the placeholder only, so a fallback can differ from the shell. */
  fallbackStyle?: React.CSSProperties
}

/**
 * One circular avatar for every player-facing surface: the viewer's own profile,
 * the leaderboard podium and the leaderboard rows. Presentational — sizing and
 * shell styling come from the caller, since the three sites differ.
 */
export function PlayerAvatar({ src, alt, size, iconSize, style, fallbackStyle }: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false)

  // A row can be re-rendered with a different player's picture; a previous
  // failure must not suppress the new one.
  useEffect(() => setFailed(false), [src])

  const showImage = typeof src === 'string' && src !== '' && !failed

  return (
    <div style={{ ...S.shell, width: size, height: size, ...style }}>
      {showImage ? (
        // A dead LINE CDN URL degrades to the placeholder rather than showing
        // the browser's broken-image glyph.
        <img src={src} alt={alt} style={S.img} onError={() => setFailed(true)} />
      ) : (
        <div style={{ ...S.fallback, ...fallbackStyle }}>
          <Icon name="user" size={iconSize} />
        </div>
      )}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  shell: {
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  img: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  fallback: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
