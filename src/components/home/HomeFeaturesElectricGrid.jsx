import { useEffect, useRef, useState } from 'react';

const GRID_SIZE = 48;
const HEAD_STEP = 3.2;
const HEAD_STEP_NEAR = 2.6;
const HEAD_SIZE = 10;
const TAIL_LAG = 72;
const MAX_TRAIL_POINTS = 240;
const MIN_BODY_SPAN = 4;
const AXIS_HYSTERESIS = 18;
const NEAR_CURSOR_RADIUS = 36;

function snapLine(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function getCell(x, y) {
  const col = Math.floor(x / GRID_SIZE);
  const row = Math.floor(y / GRID_SIZE);
  return { col, row, key: `${col},${row}` };
}

function nearestIntersection(x, y) {
  return { x: snapLine(x), y: snapLine(y) };
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function resolveAxis(x, y, prevAxis) {
  const gridX = snapLine(x);
  const gridY = snapLine(y);
  const distH = Math.abs(y - gridY);
  const distV = Math.abs(x - gridX);

  if (prevAxis == null) return distH <= distV ? 'h' : 'v';
  if (prevAxis === 'h') return distV + AXIS_HYSTERESIS < distH ? 'v' : 'h';
  return distH + AXIS_HYSTERESIS < distV ? 'h' : 'v';
}

function targetOnAxis(x, y, axis) {
  const gridX = snapLine(x);
  const gridY = snapLine(y);
  return axis === 'h' ? { x, y: gridY } : { x: gridX, y };
}

function nextWaypoint(head, target, axis) {
  const headY = snapLine(head.y);
  const headX = snapLine(head.x);

  if (axis === 'h') {
    if (Math.abs(headY - target.y) > 0.6) return { x: headX, y: target.y };
    return target;
  }

  if (Math.abs(headX - target.x) > 0.6) return { x: target.x, y: headY };
  return target;
}

function moveOnGrid(from, to, step) {
  if (Math.abs(from.x - to.x) > 0.35) {
    const dir = Math.sign(to.x - from.x);
    return {
      x: from.x + dir * Math.min(step, Math.abs(to.x - from.x)),
      y: snapLine(from.y),
    };
  }
  if (Math.abs(from.y - to.y) > 0.35) {
    const dir = Math.sign(to.y - from.y);
    return {
      x: snapLine(from.x),
      y: from.y + dir * Math.min(step, Math.abs(to.y - from.y)),
    };
  }
  return { x: to.x, y: to.y };
}

function pushTrail(trail, point) {
  if (trail.length > 0 && dist(trail[0], point) < 0.1) return;
  trail.unshift({ x: point.x, y: point.y });
  if (trail.length > MAX_TRAIL_POINTS) trail.pop();
}

function tailFromTrail(trail, lag = TAIL_LAG) {
  if (trail.length === 0) return { x: 0, y: 0 };
  if (trail.length === 1) return { ...trail[0] };

  let remaining = lag;
  for (let i = 0; i < trail.length - 1; i += 1) {
    const from = trail[i];
    const to = trail[i + 1];
    const segLen = dist(from, to);
    if (segLen < 0.001) continue;
    if (remaining <= segLen) {
      const t = remaining / segLen;
      return {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      };
    }
    remaining -= segLen;
  }

  return { ...trail[trail.length - 1] };
}

function getSnakeSegments(tail, head) {
  const segments = [];
  const pathLen = Math.abs(head.x - tail.x) + Math.abs(head.y - tail.y);
  if (pathLen < MIN_BODY_SPAN) return segments;

  const tailY = snapLine(tail.y);
  const tailX = snapLine(tail.x);
  const headY = snapLine(head.y);
  const headX = snapLine(head.x);

  if (Math.abs(tailY - headY) < 0.6) {
    segments.push({
      key: 'straight-h',
      horizontal: true,
      linePos: tailY,
      start: tail.x,
      end: head.x,
    });
    return segments;
  }

  if (Math.abs(tailX - headX) < 0.6) {
    segments.push({
      key: 'straight-v',
      horizontal: false,
      linePos: tailX,
      start: tail.y,
      end: head.y,
    });
    return segments;
  }

  segments.push({
    key: 'corner-h',
    horizontal: true,
    linePos: tailY,
    start: tail.x,
    end: head.x,
  });
  segments.push({
    key: 'corner-v',
    horizontal: false,
    linePos: headX,
    start: tail.y,
    end: head.y,
  });

  return segments;
}

function segmentStyle(segment) {
  const low = Math.min(segment.start, segment.end);
  const span = Math.max(Math.abs(segment.end - segment.start), MIN_BODY_SPAN);
  const headAtHigh = segment.end >= segment.start;

  if (segment.horizontal) {
    return {
      className: `home-features-electric-snake is-horizontal ${headAtHigh ? 'head-at-high' : 'head-at-low'}`,
      style: {
        top: `${segment.linePos - 1}px`,
        left: `${low}px`,
        width: `${span}px`,
      },
    };
  }

  return {
    className: `home-features-electric-snake is-vertical ${headAtHigh ? 'head-at-high' : 'head-at-low'}`,
    style: {
      left: `${segment.linePos - 1}px`,
      top: `${low}px`,
      height: `${span}px`,
    },
  };
}

export default function HomeFeaturesElectricGrid() {
  const overlayRef = useRef(null);
  const pointerRef = useRef(null);
  const physicsRef = useRef({
    active: false,
    head: { x: 0, y: 0 },
    trail: [],
    lockedAxis: null,
    activeCellKey: '',
  });
  const [renderState, setRenderState] = useState(null);

  useEffect(() => {
    const section = overlayRef.current?.closest('.home-features-section');
    if (!section) return undefined;

    const onPointerMove = (event) => {
      const rect = section.getBoundingClientRect();
      pointerRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const onPointerLeave = () => {
      pointerRef.current = null;
      physicsRef.current.active = false;
      physicsRef.current.trail = [];
      physicsRef.current.lockedAxis = null;
      setRenderState(null);
    };

    section.addEventListener('pointermove', onPointerMove);
    section.addEventListener('pointerleave', onPointerLeave);

    let frameId = 0;

    const tick = () => {
      const point = pointerRef.current;
      const physics = physicsRef.current;

      if (point) {
        const cell = getCell(point.x, point.y);

        if (!physics.active) {
          const start = nearestIntersection(point.x, point.y);
          physics.head = { ...start };
          physics.trail = [{ ...start }];
          physics.lockedAxis = resolveAxis(point.x, point.y, null);
          physics.activeCellKey = cell.key;
          physics.active = true;
        }

        if (cell.key !== physics.activeCellKey) {
          physics.activeCellKey = cell.key;
          physics.lockedAxis = resolveAxis(point.x, point.y, null);
        }

        const axisPreview = physics.lockedAxis ?? resolveAxis(point.x, point.y, null);
        const targetPreview = targetOnAxis(point.x, point.y, axisPreview);
        const headDist = dist(physics.head, targetPreview);

        if (headDist >= NEAR_CURSOR_RADIUS) {
          physics.lockedAxis = resolveAxis(point.x, point.y, physics.lockedAxis);
        } else {
          const headY = snapLine(physics.head.y);
          const headX = snapLine(physics.head.x);
          if (Math.abs(physics.head.y - headY) < 2) physics.lockedAxis = 'h';
          else if (Math.abs(physics.head.x - headX) < 2) physics.lockedAxis = 'v';
        }

        const target = targetOnAxis(point.x, point.y, physics.lockedAxis);
        const waypoint = nextWaypoint(physics.head, target, physics.lockedAxis);
        const step = headDist < NEAR_CURSOR_RADIUS ? HEAD_STEP_NEAR : HEAD_STEP;

        physics.head = moveOnGrid(physics.head, waypoint, step);

        pushTrail(physics.trail, physics.head);
        const tail = tailFromTrail(physics.trail, TAIL_LAG);

        setRenderState({
          head: { ...physics.head },
          tail,
          segments: getSnakeSegments(tail, physics.head),
        });
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      section.removeEventListener('pointermove', onPointerMove);
      section.removeEventListener('pointerleave', onPointerLeave);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className={`home-features-electric-grid${renderState ? ' is-active' : ''}`}
      aria-hidden="true"
    >
      {renderState ? (
        <>
          {renderState.segments.map((segment) => {
            const { className, style } = segmentStyle(segment);
            return <span key={segment.key} className={className} style={style} />;
          })}
          <span
            className="home-features-electric-snake-head"
            style={{
              left: `${renderState.head.x}px`,
              top: `${renderState.head.y}px`,
              width: `${HEAD_SIZE}px`,
              height: `${HEAD_SIZE}px`,
            }}
          />
        </>
      ) : null}
    </div>
  );
}
