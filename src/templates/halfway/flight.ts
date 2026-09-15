/**
 * Turning breath into flight. The microphone gives a 0..1 loudness; only a real blow gets past
 * the floor (not talking, a fan or a busy café). Blowing speeds the plane up; when the breath
 * runs out it coasts for a moment, then drifts slowly back the way it came, so the distance
 * creeps up again until they blow. Only reaching home makes it stay.
 */

/** Below this loudness nothing happens. */
export const BLOW_FLOOR = 0.35;
/** At this loudness the plane is already flying flat out. */
const BLOW_FULL = 0.85;
/** The fastest the plane goes, in fractions of the whole route per second. */
export const TOP_SPEED = 0.42;
/** How fast it sinks back towards the start once the breath runs out. */
export const FALL_SPEED = 0.03;

/** How hard they're blowing, as 0..1 of full power. */
export function thrust(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.min(1, Math.max(0, (level - BLOW_FLOOR) / (BLOW_FULL - BLOW_FLOOR)));
}

/** The next speed: quick to pick up while blowing, a short coast after, then a slow slide back. */
export function glide(speed: number, push: number, dt: number): number {
  const target = push > 0 ? push * TOP_SPEED : -FALL_SPEED;
  const rate = push > 0 ? 5 : speed > 0 ? 3.5 : 0.8;
  return speed + (target - speed) * (1 - Math.exp(-dt * rate));
}

/** Where that speed takes the plane, never behind the start or past home. */
export function travel(pos: number, speed: number, dt: number): { pos: number; speed: number } {
  const next = Math.min(1, Math.max(0, pos + speed * dt));
  // Back at the start there is nowhere left to sink, so it rests instead of storing up backwards speed.
  return { pos: next, speed: next <= 0 && speed < 0 ? 0 : speed };
}
