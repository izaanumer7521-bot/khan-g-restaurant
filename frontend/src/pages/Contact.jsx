import { useState } from 'react';
import { api } from '../api.js';
import { SITE } from '../config.js';

export default function Contact() {
  const [f, setF] = useState({ name: '', email: '', phone: '', message: '' });
  const [state, setState] = useState({ busy: false, ok: false, err: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, ok: false, err: '' });
    try { await api('/messages', { method: 'POST', body: f }); setState({ busy: false, ok: true, err: '' }); setF({ name: '', email: '', phone: '', message: '' }); }
    catch (x) { setState({ busy: false, ok: false, err: x.message }); }
  };

  return (
    <div className="sec page">
      <h1 className="title">Contact us</h1>
      <div className="split">
        <div>
          <p className="lead">Questions, feedback or a big event coming up? Send a message or call us.</p>
          <p><strong>Address</strong><br /><span className="muted">{SITE.address}</span></p>
          <p><strong>Phone</strong><br /><a href={'tel:' + SITE.phone.replace(/\s/g, '')}>{SITE.phone}</a></p>
          <p><strong>Hours</strong><br />{SITE.hours.map(([a, b]) => <span className="muted" key={a}>{a}: {b}<br /></span>)}</p>
          <div className="btns">
            <a className="btn" href={'https://wa.me/' + SITE.whatsapp} target="_blank" rel="noreferrer">Chat on WhatsApp</a>
            <a className="btn ghost" href={SITE.mapLink} target="_blank" rel="noreferrer">Get directions</a>
          </div>
        </div>
        <form className="form" onSubmit={submit}>
          <label>Your name<input required value={f.name} onChange={set('name')} /></label>
          <div className="two">
            <label>Email<input type="email" value={f.email} onChange={set('email')} /></label>
            <label>Phone<input type="tel" value={f.phone} onChange={set('phone')} /></label>
          </div>
          <label>Message<textarea required rows="5" value={f.message} onChange={set('message')} /></label>
          {state.err && <p className="err">{state.err}</p>}
          {state.ok && <p className="okmsg">Message sent. We will get back to you soon.</p>}
          <button className="btn full" disabled={state.busy}>{state.busy ? 'Sending…' : 'Send message'}</button>
        </form>
      </div>
    </div>
  );
}
