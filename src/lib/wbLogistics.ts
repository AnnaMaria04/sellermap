// WB FBO logistics tariff: ₽33 base + ₽8 per litre over 1L + ₽12 per kg over 0.5kg
export function calcWBLogistics(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  weightKg: number,
): number {
  const volumeLitres = (lengthCm * widthCm * heightCm) / 1000;
  const baseRate = 33;
  const volumeCharge = Math.max(0, volumeLitres - 1) * 8;
  const weightCharge = Math.max(0, weightKg - 0.5) * 12;
  return Math.round(baseRate + volumeCharge + weightCharge);
}

// ₽0.056 per litre per day (standard warehouse)
export function calcWBStorage(volumeLitres: number, daysPerMonth = 30): number {
  return Math.round(volumeLitres * 0.056 * daysPerMonth);
}
