import React, { useEffect, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import ical from 'ical.js'

async function loadIcs(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(\"Couldn't fetch calendar: \" + res.status)
  const text = await res.text()
  const jcalData = ical.parse(text)
  const vcalendar = new ical.Component(jcalData)
  const vevents = vcalendar.getAllSubcomponents('vevent') || []
  return vevents.map((v) => {
    const e = new ical.Event(v)
    return {
      id: e.uid || Math.random().toString(36).slice(2),
      title: e.summary || '(no title)',
      start: e.startDate && e.startDate.toJSDate(),
      end: e.endDate && e.endDate.toJSDate(),
      allDay: e.startDate && e.startDate.isDate,
    }
  })
}

export default function App() {
  const [tab, setTab] = useState('calendar')

  const [icsA, setIcsA] = useState('')
  const [icsB, setIcsB] = useState('')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [shareA, setShareA] = useState(false)
  const [shareB, setShareB] = useState(false)
  const [locA, setLocA] = useState(null)
  const [locB, setLocB] = useState(null)
  const watchIdA = useRef(null)
  const watchIdB = useRef(null)

  async function handleLoadCalendars() {
    setLoading(true)
    setError('')
    try {
      const [evA, evB] = await Promise.all([
        icsA ? loadIcs(icsA) : Promise.resolve([]),
        icsB ? loadIcs(icsB) : Promise.resolve([]),
      ])
      const merged = [
        ...evA.map((e) => ({ ...e, title: `A: ${e.title}` })),
        ...evB.map((e) => ({ ...e, title: `B: ${e.title}` })),
      ]
      setEvents(merged)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function loadDemo() {
    const today = new Date()
    function d(offset) {
      const dt = new Date(today)
      dt.setDate(dt.getDate() + offset)
      return dt
    }
    const sample = [
      { id: '1', title: 'A: Daycare drop-off', start: d(1) },
      { id: '2', title: 'B: Vet appointment', start: d(2), end: d(2) },
      { id: '3', title: 'A: Work shift', start: d(3), end: d(3) },
      { id: '4', title: 'Family dinner', start: d(4) },
    ]
    setEvents(sample)
    setLocA({ lat: -33.8688, lng: 151.2093, t: new Date() })
    setLocB({ lat: -33.7322, lng: 150.9997, t: new Date() })
    setShareA(true)
    setShareB(true)
    setTab('location')
  }

  useEffect(() => {
    if (shareA && navigator.geolocation) {
      watchIdA.current = navigator.geolocation.watchPosition(
        (pos) => setLocA({ lat: pos.coords.latitude, lng: pos.coords.longitude, t: new Date() }),
        (err) => console.warn('A geo error', err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      )
    }
    return () => {
      if (watchIdA.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdA.current)
        watchIdA.current = null
      }
    }
  }, [shareA])

  useEffect(() => {
    if (shareB && navigator.geolocation) {
      watchIdB.current = navigator.geolocation.watchPosition(
        (pos) => setLocB({ lat: pos.coords.latitude, lng: pos.coords.longitude, t: new Date() }),
        (err) => console.warn('B geo error', err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      )
    }
    return () => {
      if (watchIdB.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdB.current)
        watchIdB.current = null
      }
    }
  }, [shareB])

  return (
    <div className="container">
      <div className="header">
        <h1>Family Hub (Demo)</h1>
        <div className="muted">Calendar + live location in one place</div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab==='calendar' ? 'active':''}`} onClick={()=>setTab('calendar')}>Calendar</button>
        <button className={`tab ${tab==='location' ? 'active':''}`} onClick={()=>setTab('location')}>Locations</button>
      </div>

      {tab === 'calendar' && (
        <div className="card">
          <div style={{fontSize:14, color:'#666', marginBottom:12}}>
            Paste each person's private <b>ICS/iCal URL</b>. You can use Google Calendar’s “Secret address in iCal format” or iCloud’s public link.
          </div>

          <div className="row two">
            <div>
              <label htmlFor="icsA">Person A calendar URL</label>
              <input id="icsA" type="text" placeholder="https://...ics" value={icsA} onChange={(e)=>setIcsA(e.target.value)} />
            </div>
            <div>
              <label htmlFor="icsB">Person B calendar URL</label>
              <input id="icsB" type="text" placeholder="https://...ics" value={icsB} onChange={(e)=>setIcsB(e.target.value)} />
            </div>
          </div>

          <div className="actions">
            <button className="primary" onClick={handleLoadCalendars} disabled={loading}>
              {loading ? 'Loading…' : 'Load calendars'}
            </button>
            <button onClick={loadDemo}>Quick demo</button>
            {error && <span className="error">{error}</span>}
          </div>

          <div style={{marginTop:16}} className="card">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              height="auto"
              events={events}
            />
          </div>
        </div>
      )}

      {tab === 'location' && (
        <div className="card">
          <div style={{fontSize:14, color:'#666', marginBottom:12}}>
            Toggle sharing to broadcast your browser location. (Background updates need the native mobile app; this is a demo.)
          </div>

          <div className="locGrid">
            <div className="locCard">
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <div style={{fontWeight:600}}>Person A</div>
                <input className="switch" type="checkbox" checked={shareA} onChange={(e)=>setShareA(e.target.checked)} />
              </div>
              <div className="muted" style={{marginTop:8}}>
                {locA ? (
                  <div>
                    <div>Lat: {locA.lat.toFixed(5)} | Lng: {locA.lng.toFixed(5)}</div>
                    <div>Updated: {locA.t.toLocaleTimeString()}</div>
                  </div>
                ) : 'Not sharing'}
              </div>
            </div>

            <div className="locCard">
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <div style={{fontWeight:600}}>Person B</div>
                <input className="switch" type="checkbox" checked={shareB} onChange={(e)=>setShareB(e.target.checked)} />
              </div>
              <div className="muted" style={{marginTop:8}}>
                {locB ? (
                  <div>
                    <div>Lat: {locB.lat.toFixed(5)} | Lng: {locB.lng.toFixed(5)}</div>
                    <div>Updated: {locB.t.toLocaleTimeString()}</div>
                  </div>
                ) : 'Not sharing'}
              </div>
            </div>
          </div>

          <footer>
            In a full release: background geofencing, zones (home/daycare/work), and end‑to‑end encryption.
          </footer>
        </div>
      )}
    </div>
  )
}
