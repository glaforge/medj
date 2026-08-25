import React from 'react';

/**
 * Color and contrast utilities for MedJ.
 * Computes optimal text color (black or white) based on background color luminance (WCAG 2.1).
 */

/**
 * Returns either '#000000' (black) or '#ffffff' (white) depending on which provides
 * the highest contrast ratio against the provided background color.
 * 
 * Supports hex (#RGB, #RRGGBB, #RRGGBBAA), rgb(r, g, b), rgba(r, g, b, a), and hsl(h, s, l) strings.
 * 
 * @param backgroundColor - The background color string (e.g. '#facc15', '#1e3a8a')
 * @returns '#000000' for light backgrounds or '#ffffff' for dark backgrounds
 */
export function getContrastTextColor(backgroundColor?: string | null): '#000000' | '#ffffff' {
  if (!backgroundColor || typeof backgroundColor !== 'string') {
    return '#ffffff';
  }

  const bg = backgroundColor.trim().toLowerCase();

  let r = 0;
  let g = 0;
  let b = 0;

  if (bg.startsWith('#')) {
    let hex = bg.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').slice(0, 3).map(c => c + c).join('');
    }
    if (hex.length >= 6) {
      r = parseInt(hex.substring(0, 2), 16) || 0;
      g = parseInt(hex.substring(2, 4), 16) || 0;
      b = parseInt(hex.substring(4, 6), 16) || 0;
    }
  } else if (bg.startsWith('rgb')) {
    const parts = bg.match(/[\d.]+/g);
    if (parts && parts.length >= 3) {
      r = parseFloat(parts[0]) || 0;
      g = parseFloat(parts[1]) || 0;
      b = parseFloat(parts[2]) || 0;
    }
  } else if (bg.startsWith('hsl')) {
    const parts = bg.match(/[\d.]+/g);
    if (parts && parts.length >= 3) {
      const h = (parseFloat(parts[0]) || 0) / 360;
      const s = (parseFloat(parts[1]) || 0) / 100;
      const l = (parseFloat(parts[2]) || 0) / 100;
      if (s === 0) {
        r = g = b = l * 255;
      } else {
        const hue2rgb = (p: number, q: number, t: number) => {
          let tt = t;
          if (tt < 0) tt += 1;
          if (tt > 1) tt -= 1;
          if (tt < 1 / 6) return p + (q - p) * 6 * tt;
          if (tt < 1 / 2) return q;
          if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3) * 255;
        g = hue2rgb(p, q, h) * 255;
        b = hue2rgb(p, q, h - 1 / 3) * 255;
      }
    }
  } else {
    // Default fallback
    return '#ffffff';
  }

  // WCAG 2.1 relative luminance calculation
  const toLinear = (c: number) => {
    const v = Math.min(255, Math.max(0, c)) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };

  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  // Perceptual contrast threshold for medical badges and pills:
  // The mathematical WCAG 2.1 threshold (0.179) chooses black text for saturated medium colors
  // (such as blue #0284c7, purple #8b5cf6, fuchsia #ec4899, emerald #10b981), where white text is visually
  // much sharper and more readable.
  // Using a calibrated perceptual threshold of 0.48 ensures that all saturated and dark colors
  // (blues, purples, fuchsias, indigos, emeralds, teals, slates, rubies) display crisp white (#ffffff) text,
  // while bright/light backgrounds (yellows, bright limes, pastels, creams) display black (#000000) text.
  return luminance > 0.48 ? '#000000' : '#ffffff';
}

/**
 * Helper to generate inline style with background color and contrasting text color.
 */
export function getContrastBadgeStyle(
  backgroundColor?: string | null,
  additionalStyles?: React.CSSProperties
): React.CSSProperties {
  const bg = backgroundColor || '#0284c7';
  const textColor = getContrastTextColor(bg);
  return {
    backgroundColor: bg,
    color: textColor,
    ...additionalStyles
  };
}
