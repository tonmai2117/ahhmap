import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MapBottomSheet } from './MapBottomSheet'
import type { Treasure } from '../types'

class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', StubResizeObserver)

afterEach(() => { cleanup(); vi.clearAllMocks() })

function makeTreasure(overrides: Partial<Treasure>): Treasure {
  return {
    id: 't1',
    name: 'Portal A',
    lat: 13.75,
    lng: 100.5,
    radius_m: 20,
    coin_reward: 10,
    ar_content: null,
    tier: 'rare',
    ...overrides,
  }
}

describe('MapBottomSheet portal selection', () => {
  it('lets the player pick which overlapping in-range portal to enter', () => {
    const portalA = makeTreasure({ id: 'a', name: 'Portal A' })
    const portalB = makeTreasure({ id: 'b', name: 'Portal B' })
    const onSelectPortal = vi.fn()
    const onPanTo = vi.fn()

    render(
      <MapBottomSheet
        state="expanded"
        onStateChange={() => {}}
        onHeightChange={() => {}}
        mode="daily"
        treasures={[portalA, portalB]}
        nearbyCount={2}
        pos={{ lat: 13.75, lng: 100.5, accuracy: 5 }}
        nearbyTreasure={portalA}
        inRangeTreasures={[portalA, portalB]}
        selectedPortalId="a"
        onSelectPortal={onSelectPortal}
        onPanTo={onPanTo}
        onGoToAR={() => {}}
        demoLaunch={null}
        onOpenDemo={() => {}}
        portalBusy={false}
      />,
    )

    expect(screen.getByText(/เข้า Portal — Portal A/)).toBeTruthy()

    fireEvent.click(screen.getByText('Portal B'))

    expect(onSelectPortal).toHaveBeenCalledWith(portalB)
    expect(onPanTo).toHaveBeenCalledWith(portalB)
  })

  it('does not select a portal that is out of collection range, only pans to it', () => {
    const portalA = makeTreasure({ id: 'a', name: 'Portal A' })
    const farPortal = makeTreasure({ id: 'far', name: 'Portal Far' })
    const onSelectPortal = vi.fn()
    const onPanTo = vi.fn()

    render(
      <MapBottomSheet
        state="expanded"
        onStateChange={() => {}}
        onHeightChange={() => {}}
        mode="daily"
        treasures={[portalA, farPortal]}
        nearbyCount={1}
        pos={{ lat: 13.75, lng: 100.5, accuracy: 5 }}
        nearbyTreasure={portalA}
        inRangeTreasures={[portalA]}
        selectedPortalId="a"
        onSelectPortal={onSelectPortal}
        onPanTo={onPanTo}
        onGoToAR={() => {}}
        demoLaunch={null}
        onOpenDemo={() => {}}
        portalBusy={false}
      />,
    )

    fireEvent.click(screen.getByText('Portal Far'))

    expect(onSelectPortal).not.toHaveBeenCalled()
    expect(onPanTo).toHaveBeenCalledWith(farPortal)
  })
})
