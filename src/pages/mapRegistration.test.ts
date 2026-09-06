import { describe, expect, it } from 'vitest'
import { safeNext } from './registerNext'
import { mapRegistrationPath } from './mapRegistration'

describe('campaign map registration return path', () => {
  it('preserves the exact campaign and host query after registration', () => {
    const registrationPath = mapRegistrationPath('/map', '?campaign=halloween&host=demo-host')
    expect(registrationPath).toBe(
      '/register?next=%2Fmap%3Fcampaign%3Dhalloween%26host%3Ddemo-host',
    )

    const next = new URL(registrationPath, 'https://example.test').searchParams.get('next')
    expect(safeNext(next)).toBe('/map?campaign=halloween&host=demo-host')
  })

  it('keeps the default map behavior when no campaign query exists', () => {
    const registrationPath = mapRegistrationPath('/map', '')
    const next = new URL(registrationPath, 'https://example.test').searchParams.get('next')
    expect(safeNext(next)).toBe('/map')
  })
})
