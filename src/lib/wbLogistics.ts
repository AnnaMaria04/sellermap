export function calcWBLogistics(lengthCm: number, widthCm: number, heightCm: number, weightKg: number): number {
  const volumeLiters = Math.max(0.1, (lengthCm * widthCm * heightCm) / 1000);
  const base = 55;
  const volumeCost = Math.ceil(volumeLiters * 2.8);
  const weightCost = Math.ceil(Math.max(0, weightKg - 1) * 18);

  return base + volumeCost + weightCost;
}
