/** Compile the two source values into a browser-ready translucent color. */
export function composeHexOpacity(hex, opacity) {
  const match = String(hex).match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  const alpha = Number(opacity);
  if (!match) throw new TypeError(`Expected a resolved #rrggbb color, received ${hex}.`);
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new RangeError(`Expected opacity from 0 to 1, received ${opacity}.`);
  }

  const channels = match.slice(1).map((channel) => Number.parseInt(channel, 16));
  return `rgb(${channels.join(' ')} / ${alpha})`;
}
