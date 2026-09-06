import { useEffect, useState } from 'react'
import { Icon } from './Icon'

type ImagePlaceholderProps = {
  aspectRatio?: number | string
  size?: number | string
  shape?: 'rect' | 'circle'
  src?: string | null
  alt?: string
}

export function ImagePlaceholder({
  aspectRatio,
  size,
  shape = 'rect',
  src,
  alt = '',
}: ImagePlaceholderProps) {
  const isCircle = shape === 'circle'
  const [imageFailed, setImageFailed] = useState(false)
  const hasImage = Boolean(src) && !imageFailed

  useEffect(() => {
    setImageFailed(false)
  }, [src])

  return (
    <div
      aria-hidden={hasImage ? undefined : true}
      style={{
        ...S.placeholder,
        ...(isCircle ? S.circle : S.rect),
        ...(aspectRatio ? { aspectRatio } : {}),
        ...(size ? { width: size, height: size, flex: `0 0 ${typeof size === 'number' ? `${size}px` : size}` } : {}),
      }}
    >
      {hasImage ? (
        <img src={src!} alt={alt} style={S.image} onError={() => setImageFailed(true)} />
      ) : (
        <Icon name="camera" size={isCircle ? 28 : 48} />
      )}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: 'var(--fill)',
    color: 'var(--fill-strong)',
  },
  rect: {
    width: '100%',
  },
  circle: {
    borderRadius: 'var(--radius-full)',
  },
  image: {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'cover',
  },
}
