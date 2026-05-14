import { useState, useEffect, useRef, useLayoutEffect, cloneElement } from "react";
import { createPortal } from "react-dom";

const GAP = 8;
const MARGIN = 10;
const OPEN_DELAY = 150;
const CLOSE_DELAY = 80;
const CLOSE_ANIM_MS = 160;

function getPlacement(triggerRect, tipEl) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tipW = tipEl.offsetWidth;
  const tipH = tipEl.offsetHeight;

  const spaceBelow = vh - triggerRect.bottom - GAP;
  const spaceAbove = triggerRect.top - GAP;
  const below = spaceBelow >= tipH || spaceBelow >= spaceAbove;

  const triggerCX = triggerRect.left + triggerRect.width / 2;
  let left = triggerCX - tipW / 2;
  left = Math.max(MARGIN, Math.min(left, vw - tipW - MARGIN));

  const top = below
    ? triggerRect.bottom + GAP
    : triggerRect.top - tipH - GAP;

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
  // "closed" | "measuring" | "open" | "closing"
  const [phase, setPhase] = useState("closed");
  const [pos, setPos] = useState({ top: 0, left: 0, below: true, arrowLeft: 40 });
  const triggerRef = useRef(null);
  const tipRef = useRef(null);
  const openTimer = useRef(null);
  const closeTimer = useRef(null);
  const closingTimer = useRef(null);
  const phaseRef = useRef("closed");

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => () => { clearTimeout(openTimer.current); clearTimeout(closeTimer.current); clearTimeout(closingTimer.current); }, []);

  function clearTimers() {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    clearTimeout(closingTimer.current);
  }

  function openNow() {
    clearTimers();
    setPhase("measuring");
  }

  function closeNow() {
    clearTimers();
    if (phaseRef.current === "open") {
      setPhase("closing");
      closingTimer.current = setTimeout(() => setPhase("closed"), CLOSE_ANIM_MS);
    } else {
      setPhase("closed");
    }
  }

  function scheduleOpen() {
    clearTimers();
    openTimer.current = setTimeout(() => setPhase("measuring"), OPEN_DELAY);
  }

  function scheduleClose() {
    clearTimers();
    closeTimer.current = setTimeout(() => {
      if (phaseRef.current === "open") {
        setPhase("closing");
        closingTimer.current = setTimeout(() => setPhase("closed"), CLOSE_ANIM_MS);
      } else {
        setPhase("closed");
      }
    }, CLOSE_DELAY);
  }

  // Two-pass: render hidden → measure → position
  useLayoutEffect(() => {
    if (phase !== "measuring" || !tipRef.current || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos(getPlacement(rect, tipRef.current));
    setPhase("open");
  }, [phase]);

  // Close on Escape and scroll
  useEffect(() => {
    if (phase === "closed") return;
    const onEsc = (e) => { if (e.key === "Escape") closeNow(); };
    const onScroll = () => closeNow();
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const isVisible = phase !== "closed";
  const isMeasuring = phase === "measuring";
  const isOpen = phase === "open";
  const isClosing = phase === "closing";
  const isDark = variant === "dark";

  const tooltip = isVisible
    ? createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          onMouseEnter={clearTimers}
          onMouseLeave={scheduleClose}
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
            isClosing ? "tooltip-closing" : "",
          ].join(" ")}
        >
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
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={openNow}
        onBlur={scheduleClose}
        onClick={() => {
          if (phase === "closed" || phase === "closing") openNow();
          else closeNow();
        }}
      >
        {cloneElement(children, {
          "aria-expanded": isOpen,
          "aria-haspopup": "true",
        })}
      </span>
      {tooltip}
    </>
  );
}
