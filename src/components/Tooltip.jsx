import { useState, useEffect, useRef, useLayoutEffect, cloneElement } from "react";
import { createPortal } from "react-dom";

const GAP = 8;
const MARGIN = 10;

function getPlacement(triggerRect, tipEl) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tipW = tipEl.offsetWidth;
  const tipH = tipEl.offsetHeight;

  const spaceBelow = vh - triggerRect.bottom - GAP;
  const spaceAbove = triggerRect.top - GAP;
  const below = spaceBelow >= tipH || spaceBelow >= spaceAbove;

  // Center horizontally on trigger, clamp to viewport
  const triggerCX = triggerRect.left + triggerRect.width / 2;
  let left = triggerCX - tipW / 2;
  left = Math.max(MARGIN, Math.min(left, vw - tipW - MARGIN));

  const top = below
    ? triggerRect.bottom + GAP
    : triggerRect.top - tipH - GAP;

  // Arrow offset: points at trigger center
  const arrowLeft = Math.round(
    Math.max(10, Math.min(triggerCX - left - 6, tipW - 22))
  );

  return { top, left, below, arrowLeft };
}

export default function Tooltip({
  children,
  content,
  variant = "dark",
  maxWidth = 288,
  wrapperClass = "",
}) {
  const [phase, setPhase] = useState("closed"); // "closed" | "measuring" | "open"
  const [pos, setPos] = useState({ top: 0, left: 0, below: true, arrowLeft: 40 });
  const triggerRef = useRef(null);
  const tipRef = useRef(null);

  const handleToggle = () => {
    setPhase((p) => (p === "closed" ? "measuring" : "closed"));
  };

  // Two-pass: render hidden first → measure → position
  useLayoutEffect(() => {
    if (phase !== "measuring" || !tipRef.current || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos(getPlacement(rect, tipRef.current));
    setPhase("open");
  }, [phase]);

  useEffect(() => {
    if (phase === "closed") return;
    const onOutside = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        tipRef.current?.contains(e.target)
      ) return;
      setPhase("closed");
    };
    const onEsc = (e) => { if (e.key === "Escape") setPhase("closed"); };
    const onScroll = () => setPhase("closed");
    document.addEventListener("mousedown", onOutside, true);
    document.addEventListener("touchstart", onOutside, true);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("mousedown", onOutside, true);
      document.removeEventListener("touchstart", onOutside, true);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [phase]);

  const isOpen = phase === "open";
  const isMeasuring = phase === "measuring";
  const isVisible = isOpen || isMeasuring;

  const trigger = cloneElement(children, {
    "aria-expanded": isOpen,
    "aria-haspopup": "true",
  });

  const isDark = variant === "dark";

  const tooltip = isVisible
    ? createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          style={{
            position: "fixed",
            top: isMeasuring ? -9999 : pos.top,
            left: isMeasuring ? -9999 : pos.left,
            maxWidth,
            visibility: isMeasuring ? "hidden" : "visible",
            zIndex: 9999,
          }}
          data-placement={pos.below ? "below" : "above"}
          className={[
            "tooltip-popup",
            isDark ? "tooltip-dark" : "tooltip-light",
            isOpen ? "tooltip-open" : "",
          ].join(" ")}
        >
          {/* Arrow */}
          <span
            className={[
              "tooltip-arrow",
              pos.below ? "tooltip-arrow-below" : "tooltip-arrow-above",
              isDark ? "tooltip-arrow-dark" : "tooltip-arrow-light",
            ].join(" ")}
            style={{ left: pos.arrowLeft }}
            aria-hidden="true"
          />
          {content}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <span
        ref={triggerRef}
        className={`inline-flex items-center ${wrapperClass}`}
        onClick={handleToggle}
      >
        {trigger}
      </span>
      {tooltip}
    </>
  );
}
