import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ImagePlaceholder } from './ImagePlaceholder'

describe('ImagePlaceholder', () => {
  it('renders a supplied image URL instead of the camera placeholder', () => {
    const markup = renderToStaticMarkup(
      <ImagePlaceholder
        aspectRatio="16 / 9"
        src="https://cdn.example.test/host-cover.png"
        alt="Host cover"
      />,
    )

    expect(markup).toContain('<img')
    expect(markup).toContain('src="https://cdn.example.test/host-cover.png"')
    expect(markup).toContain('alt="Host cover"')
  })

  it('keeps the placeholder when no image URL is available', () => {
    const markup = renderToStaticMarkup(<ImagePlaceholder aspectRatio="4 / 3" src={null} />)

    expect(markup).not.toContain('<img')
    expect(markup).toContain('aria-hidden="true"')
  })
})
