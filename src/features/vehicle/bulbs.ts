/** Sva spoljna svetla Golfa VII — svako ima svoje mesto na 3D modelu i svoj kadar. */
export const BULBS = [
  'headLeft',
  'headRight',
  'indicatorFrontLeft',
  'indicatorFrontRight',
  'fogLeft',
  'fogRight',
  'mirrorLeft',
  'mirrorRight',
  'tailLeft',
  'tailRight',
  'rearLowLeft',
  'rearLowRight',
  'brakeThird',
  'plate',
] as const
export type BulbId = (typeof BULBS)[number]
