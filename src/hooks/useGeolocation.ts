import { useEffect, useRef } from 'react'

export type GeoPosition = {
  lat: number
  lng: number
  accuracy: number
}

type UseGeolocationOptions = {
  enabled?: boolean
  watch?: boolean
  options?: PositionOptions
  onPosition: (position: GeoPosition) => void
  onError?: (error: GeolocationPositionError | Error) => void
}

export function useGeolocation({
  enabled = true,
  watch = false,
  options,
  onPosition,
  onError,
}: UseGeolocationOptions) {
  const onPositionRef = useRef(onPosition)
  const onErrorRef = useRef(onError)
  const enableHighAccuracy = options?.enableHighAccuracy
  const maximumAge = options?.maximumAge
  const timeout = options?.timeout

  onPositionRef.current = onPosition
  onErrorRef.current = onError

  useEffect(() => {
    if (!enabled) return

    if (!navigator.geolocation) {
      onErrorRef.current?.(new Error('geolocation_unavailable'))
      return
    }

    const handlePosition = (position: GeolocationPosition) => {
      onPositionRef.current({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      })
    }

    const positionOptions = { enableHighAccuracy, maximumAge, timeout }

    if (watch) {
      const watchId = navigator.geolocation.watchPosition(
        handlePosition,
        (error) => onErrorRef.current?.(error),
        positionOptions,
      )
      return () => navigator.geolocation.clearWatch(watchId)
    }

    navigator.geolocation.getCurrentPosition(
      handlePosition,
      (error) => onErrorRef.current?.(error),
      positionOptions,
    )
  }, [enabled, watch, enableHighAccuracy, maximumAge, timeout])
}
