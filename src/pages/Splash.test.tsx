import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import Splash, { SPLASH_BACKGROUND } from './Splash'
// Vite's ?raw import (typed by vite/client) rather than node:fs: avoids adding
// @types/node, and side-steps import.meta.url resolving to jsdom's fake
// http://localhost origin instead of a real file:// path under vitest+jsdom.
import indexHtml from '../../index.html?raw'

afterEach(cleanup)

describe('boot splash handoff', () => {
  it('paints the same gradient in index.html as the React splash, so the handoff is invisible', () => {
    expect(indexHtml).toContain(SPLASH_BACKGROUND)
  })

  it('preloads the splash logo so it does not pop in a frame after the gradient', () => {
    expect(indexHtml).toContain('rel="preload"')
    expect(indexHtml).toContain('/brand/aahhmap-logo.png')
  })

  it('removes the static boot splash once the React splash has mounted', () => {
    const boot = document.createElement('div')
    boot.id = 'boot-splash'
    document.body.appendChild(boot)

    render(<Splash />)

    expect(document.getElementById('boot-splash')).toBeNull()
  })
})
