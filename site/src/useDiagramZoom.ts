import { useEffect, useRef, type RefObject } from 'react';

export function useDiagramZoom(
  wrapRef: RefObject<HTMLDivElement | null>,
  innerRef: RefObject<HTMLDivElement | null>,
) {
  const state = useRef({ scale: 1, tx: 0, ty: 0, dragging: false, startX: 0, startY: 0, startTx: 0, startTy: 0 });

  useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    const s = state.current;

    function apply() {
      if (inner) {
        inner.style.transform = `translate(${s.tx}px,${s.ty}px) scale(${s.scale})`;
      }
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = wrap!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const oldScale = s.scale;
      s.scale = Math.min(Math.max(s.scale * (e.deltaY > 0 ? 0.9 : 1.1), 0.2), 5);
      s.tx = mx - (mx - s.tx) * (s.scale / oldScale);
      s.ty = my - (my - s.ty) * (s.scale / oldScale);
      apply();
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return;
      s.dragging = true;
      s.startX = e.clientX;
      s.startY = e.clientY;
      s.startTx = s.tx;
      s.startTy = s.ty;
    }

    function onMouseMove(e: MouseEvent) {
      if (!s.dragging) return;
      s.tx = s.startTx + (e.clientX - s.startX);
      s.ty = s.startTy + (e.clientY - s.startY);
      apply();
    }

    function onMouseUp() {
      s.dragging = false;
    }

    wrap.addEventListener('wheel', onWheel, { passive: false });
    wrap.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      wrap.removeEventListener('wheel', onWheel);
      wrap.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [wrapRef, innerRef]);

  const resetZoom = () => {
    const s = state.current;
    const inner = innerRef.current;
    s.scale = 1;
    s.tx = 0;
    s.ty = 0;
    if (inner) {
      inner.style.transform = `translate(0px,0px) scale(1)`;
    }
  };

  const zoomIn = () => {
    const s = state.current;
    s.scale = Math.min(s.scale * 1.25, 5);
    if (innerRef.current) {
      innerRef.current.style.transform = `translate(${s.tx}px,${s.ty}px) scale(${s.scale})`;
    }
  };

  const zoomOut = () => {
    const s = state.current;
    s.scale = Math.max(s.scale / 1.25, 0.2);
    if (innerRef.current) {
      innerRef.current.style.transform = `translate(${s.tx}px,${s.ty}px) scale(${s.scale})`;
    }
  };

  return { zoomIn, zoomOut, resetZoom };
}
