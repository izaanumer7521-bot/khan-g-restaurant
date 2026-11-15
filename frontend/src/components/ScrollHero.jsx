import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/*
  Scroll-driven 3D banner.
  - Drop your dish video at  frontend/public/hero.mp4  and it plays forward/backward as the visitor scrolls.
  - Until the video exists, a CSS 3D plate animation reacts to scroll instead.
*/
const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));

export default function ScrollHero() {
  const wrap = useRef();
  const vid = useRef();
  const [noVideo, setNoVideo] = useState(false);
  // phones get a smaller portrait video (decodes and seeks much faster)
  const [src] = useState(() => (window.matchMedia('(max-width: 860px)').matches ? '/hero-m.mp4' : '/hero.mp4'));

  useEffect(() => {
    const el = wrap.current;
    let target = 0, cur = 0, raf, lastT = -1;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const phone = window.matchMedia('(max-width: 860px)').matches;
    const ease = phone ? 0.2 : 0.1;
    let lastSeek = 0;

    const onScroll = () => {
      const total = el.offsetHeight - window.innerHeight;
      target = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total));
    };
    const tick = () => {
      cur += (target - cur) * (reduce ? 1 : ease);
      if (Math.abs(target - cur) < 0.0005) cur = target;
      const s = (k, v) => el.style.setProperty(k, v.toFixed(3));
      s('--p', cur);
      s('--s1', 1 - seg(cur, 0.1, 0.2));
      s('--s2', seg(cur, 0.22, 0.32) * (1 - seg(cur, 0.46, 0.56)));
      s('--s3', seg(cur, 0.58, 0.68) * (1 - seg(cur, 0.78, 0.86)));
      s('--s4', seg(cur, 0.88, 0.96));
      el.classList.toggle('cta-on', cur > 0.9);
      const v = vid.current;
      if (v && v.duration) {
        const t = cur * (v.duration - 0.05);
        const now = performance.now();
        // never queue a new seek while one is still running, and cap the seek rate on phones
        if (!v.seeking && Math.abs(t - lastT) > (phone ? 0.04 : 0.02) && now - lastSeek > (phone ? 50 : 0)) {
          if (v.fastSeek) v.fastSeek(t); else v.currentTime = t;
          lastT = t; lastSeek = now;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // iOS needs a play/pause "unlock" before it allows seeking a muted video
  const unlock = () => { const v = vid.current; if (v) v.play().then(() => v.pause()).catch(() => {}); };

  return (
    <section className="hero" ref={wrap}>
      <div className="hero-stick">
        {!noVideo ? (
          <video ref={vid} src={src} muted playsInline preload="auto" onLoadedMetadata={unlock} onError={() => setNoVideo(true)} />
        ) : (
          <div className="scene" aria-hidden="true">
            <div className="plate"><div className="plate-in" /></div>
            <div className="steam s-a" /><div className="steam s-b" /><div className="steam s-c" />
          </div>
        )}
        <div className="hero-shade" />

        <div className="stage st1">
          <h1>KHAN<b>G</b></h1>
          <p>Cooked over fire. Served with heart.</p>
          <span className="hint">Scroll to taste</span>
        </div>
        <div className="stage st2"><h2>Breakfast, the Khan G way</h2><p>Halwa puri, nihari and fresh paratha from 7 AM.</p></div>
        <div className="stage st3"><h2>Fire. Spice. Soul.</h2><p>Karahi, BBQ and biryani made the slow way.</p></div>
        <div className="stage st4">
          <h2>Your table is waiting</h2>
          <div className="btns">
            <Link to="/menu" className="btn">View menu</Link>
            <Link to="/contact" className="btn ghost">Contact us</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
