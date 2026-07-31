import { useEffect, useState } from "react";

/** Glyphs that read as “garbled” next to the percent column. */
const GLYPHS = "!@#$%&*?/\\=+~<>|^";

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

function scrambleFrame(length) {
  let out = "";
  for (let i = 0; i < length; i++) out += randomGlyph();
  return out;
}

/**
 * Flickering garbled text — used for % during batch reflect.
 * Each instance can stagger so rows don’t tick in lockstep.
 *
 * @param {{
 *   length?: number,
 *   intervalMs?: number,
 *   staggerMs?: number,
 *   className?: string,
 * }} props
 */
export default function ScrambleText({
  length = 4,
  intervalMs = 70,
  staggerMs = 0,
  className,
}) {
  const [text, setText] = useState(() => scrambleFrame(length));

  useEffect(() => {
    let intervalId = null;
    const delayId = setTimeout(() => {
      setText(scrambleFrame(length));
      intervalId = setInterval(() => {
        setText(scrambleFrame(length));
      }, intervalMs);
    }, staggerMs);

    return () => {
      clearTimeout(delayId);
      if (intervalId != null) clearInterval(intervalId);
    };
  }, [length, intervalMs, staggerMs]);

  return <span className={className}>{text}</span>;
}
