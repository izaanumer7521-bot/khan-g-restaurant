import { useState } from 'react';
import { api } from '../api.js';

const today = () => new Date().toISOString().slice(0, 10);

export default function Reserve() {
  const [f, setF] = useState({ name: '', phone: '', date: today(), time: '19:00', guests: 2, note: '' });
  const [state, setState] = useState({ busy: false, ok: false, err: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, ok: false, err: '' });
    try { await api('/reservations', { method: 'POST', body: f }); setState({ busy: false, ok: true, err: '' }); }
    catch (x) { setState({ busy: false, ok: false, err: x.message }); }
  };

  if (state.ok) return (
    <div className="sec page narrow center">
      <h1 className="title">Request received</h1>
      <p className="lead">Thank you, {f.name}. We will call {f.phone} to confirm your table for {f.guests} on {f.date} at {f.time}.</p>
    </div>
  );

  return (
    <div className="sec page narrow">
      <h1 className="title">Reserve a table</h1>
      <form className="form" onSubmit={submit}>
        <label>Your name<input required value={f.name} onChange={set('name')} /></label>
        <label>Phone number<input required type="tel" value={f.phone} onChange={set('phone')} /></label>
        <div className="two">
          <label>Date<input required type="date" min={today()} value={f.date} onChange={set('date')} /></label>
          <label>Time<input required type="time" value={f.time} onChange={set('time')} /></label>
        </div>
        <label>Number of guests<input required type="number" min="1" max="50" value={f.guests} onChange={set('guests')} /></label>
        <label>Anything we should know? (optional)<textarea rows="3" value={f.note} onChange={set('note')} /></label>
        {state.err && <p className="err">{state.err}</p>}
        <button className="btn full" disabled={state.busy}>{state.busy ? 'Sending…' : 'Request table'}</button>
      </form>
    </div>
  );
}
