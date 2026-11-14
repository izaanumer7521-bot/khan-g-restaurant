// Small circle that flies from a dish to the cart button when something is added.
export function flyToCart(fromEl, src) {
  const to = document.querySelector('.cartbtn');
  if (!fromEl || !to || !fromEl.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const a = fromEl.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const dot = document.createElement('div');
  dot.className = 'fly';
  if (src) dot.style.backgroundImage = `url("${src}")`;
  dot.style.left = a.left + a.width / 2 - 24 + 'px';
  dot.style.top = a.top + a.height / 2 - 24 + 'px';
  document.body.appendChild(dot);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = dot.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 80}px) scale(.8)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px,${dy}px) scale(.15)`, opacity: 0.4 },
  ], { duration: 750, easing: 'cubic-bezier(.5,0,.7,.4)' });
  anim.onfinish = () => dot.remove();
}
