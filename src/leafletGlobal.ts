import L from 'leaflet'

// leaflet-routing-machine ships a CommonJS bundle that reads the global `L`.
// Vite 8 (rolldown) no longer leaks it implicitly the way the old rollup
// build did, so expose it before that module evaluates.
;(window as unknown as { L: typeof L }).L = L
