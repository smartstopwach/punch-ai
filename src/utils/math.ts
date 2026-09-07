export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
  return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
};

export const smoothStep = (t: number) => t * t * (3 - 2 * t);

export const spring = (current: number, target: number, velocity: number, stiffness = 0.15, damping = 0.8) => {
  const f = (target - current) * stiffness;
  const newVel = (velocity + f) * damping;
  const newPos = current + newVel;
  return { position: newPos, velocity: newVel };
};

export const distance2D = (a: {x:number,y:number}, b: {x:number,y:number}) => Math.hypot(a.x - b.x, a.y - b.y);

export const normalizeAngle = (deg: number) => ((deg % 360) + 360) % 360;
