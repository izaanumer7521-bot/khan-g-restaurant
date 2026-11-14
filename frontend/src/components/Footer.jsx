import { Link } from 'react-router-dom';
import { SITE } from '../config.js';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="foot-grid">
        <div>
          <img className="logo-img big" src="/logo.png" alt="Khan G" />
          <p className="muted">Breakfast, karahi, BBQ and biryani, cooked fresh every day.</p>
        </div>
        <div>
          <h4>Opening hours</h4>
          {SITE.hours.map(([a, b]) => <p key={a} className="muted">{a}: {b}</p>)}
        </div>
        <div>
          <h4>Find us</h4>
          <p className="muted">{SITE.address}</p>
          <p className="muted"><a href={'tel:' + SITE.phone.replace(/\s/g, '')}>{SITE.phone}</a></p>
          <p className="muted"><a href={SITE.mapLink} target="_blank" rel="noreferrer">Open in Maps</a></p>
        </div>
        <div>
          <h4>Explore</h4>
          <p><Link to="/menu">Menu</Link></p>
          <p><Link to="/contact">Contact</Link></p>
        </div>
      </div>
      <div className="copy">© {new Date().getFullYear()} Khan G Restaurant. All rights reserved.</div>
    </footer>
  );
}
