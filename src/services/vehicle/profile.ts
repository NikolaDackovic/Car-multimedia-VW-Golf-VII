/**
 * Podaci o mom automobilu koji su POZNATI i potvrdjeni.
 * Sve ostalo u sistemu (brzina, gorivo, vrata, svetla, pritisak u gumama...)
 * je simulacija i tako je i oznaceno u interfejsu.
 *
 * Ovde se ne upisuju pretpostavke: nivo opreme, fabricke opcije, dimenzije
 * felni i stanje vozila nisu poznati dok ih ne potvrdim iz saobracajne
 * dozvole ili sa nalepnice sa PR kodovima.
 */
export interface VehicleProfile {
  make: string
  model: string
  generation: string
  modelYear: number
  engine: string
  fuel: string
  gearbox: string
  body: string
  colorName: string
  /** Hex priblizne boje karoserije — za vizuelni identitet, ne fabricki kod laka. */
  colorHex: string
  photos: Record<string, string>
  /** Izrezani profili sa providnom pozadinom. */
  cutouts: { front: string; right: string; left: string }
}

export const vehicleProfile: VehicleProfile = {
  make: 'Volkswagen',
  model: 'Golf',
  generation: 'VII (5G)',
  modelYear: 2014,
  engine: '1.6 TDI',
  fuel: 'Dizel',
  gearbox: 'Manuelni, 6 stepeni',
  body: 'Hecbek, 3 vrata',
  colorName: 'Teget plava',
  colorHex: '#1b2d5c',
  photos: {
    frontQuarter: '/vehicle/cutout/front-quarter.png',
    frontQuarterRight: '/vehicle/cutout/front-quarter-right.png',
    front: '/vehicle/cutout/front-view.png',
    rear: '/vehicle/cutout/rear-view.png',
    sideLeft: '/vehicle/cutout/side-left.png',
    sideRight: '/vehicle/cutout/side-right.png',
  },
  cutouts: {
    front: '/vehicle/cutout/front-quarter.png',
    right: '/vehicle/cutout/side-right.png',
    left: '/vehicle/cutout/side-left.png',
  },
}

/** Kratak naziv za statusnu traku i startup ekran. */
export const vehicleShortName = 'Golf VII 1.6 TDI'
