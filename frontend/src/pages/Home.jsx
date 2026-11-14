import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ScrollHero from '../components/ScrollHero.jsx';
import Dish from '../components/Dish.jsx';
import Reveal from '../components/Reveal.jsx';
import { api } from '../api.js';
import { SITE } from '../config.js';

export default function Home() {
  const [menu, setMenu] = useState([]);
  useEffect(() => { api('/menu').then(setMenu).catch(() => {}); }, []);
  const featured = menu.filter((m) => m.featured).slice(0, 6);
  const breakfast = menu.filter((m) => m.category === 'Breakfast').slice(0, 4);

  return (
    <>
      <ScrollHero />

      {featured.length > 0 && (
        <section className="sec">
          <Reveal><h2 className="title">Most ordered at Khan G</h2></Reveal>
          <div className="grid">{featured.map((m) => <Reveal key={m._id}><Dish item={m} /></Reveal>)}</div>
          <div className="center"><Link className="btn ghost" to="/menu">See the full menu</Link></div>
        </section>
      )}

      <section className="sec band">
        <div className="split">
          <Reveal>
            <h2 className="title">Breakfast starts at 7</h2>
            <p className="lead">Start the day the desi way: hot puri, slow-cooked nihari and tea that actually wakes you up. Served every morning, {SITE.hours[0][1]}.</p>
            <Link className="btn" to="/menu?cat=Breakfast">Order breakfast</Link>
          </Reveal>
          <div className="mini-grid">{breakfast.map((m) => <Reveal key={m._id}><Dish item={m} /></Reveal>)}</div>
        </div>
      </section>

      <section className="sec">
        <div className="trio">
          {[
            ['Fresh every day', 'Spices ground in-house and meat prepared on the day it is cooked.'],
            ['Cooked on real fire', 'Charcoal for the grill, open flame for the karahi, tandoor for the naan.'],
            ['Easy to order', 'Order online for delivery or pickup, or reserve a table in under a minute.'],
          ].map(([h, p]) => (
            <Reveal key={h}><div className="card"><h3>{h}</h3><p className="muted">{p}</p></div></Reveal>
          ))}
        </div>
      </section>

      <section className="sec cta">
        <Reveal>
          <h2 className="title">Coming with family or friends?</h2>
          <p className="lead">Book your table and we will have it ready when you arrive.</p>
          <Link className="btn" to="/reserve">Reserve a table</Link>
        </Reveal>
      </section>
    </>
  );
}
