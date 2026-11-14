import { useEffect, useRef } from 'react';

// Fades a block in once as it first enters the screen.
export default function Reveal({ children, className = '' }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { el && el.classList.add('in'); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={'reveal ' + className}>{children}</div>;
}
