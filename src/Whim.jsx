// Whim — Travelo Swipe & Route Builder
// Faithful React implementation of Travelo.dc.html (Claude Design component).
// The original was a DCLogic class with an sc-if/sc-for/{{ }} template; this is
// the same state machine and styling translated to real React + JSX.
import React from 'react';
import IOSDevice from './IOSDevice.jsx';

const SERIF = "'Playfair Display', serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

export default class Whim extends React.Component {
  constructor(props) {
    super(props);
    this.rootRef = React.createRef();
    this.accentColor = props.accentColor || '#D97757';
    this.startScreen = props.startScreen || 'home';
    this.city = 'Tokyo';
    this.vibes = ['Daytime', 'The Classics', 'Nature', 'After Dark'];
    this.deck = [
      {
        id: 'senso', title: 'Sensō-ji Temple', kind: 'Temple', area: 'Asakusa', hours: 'Open 6:00 AM',
        tone: '#E7DCCB', photo: 'lantern gate at dawn', tags: ['Iconic', 'Sunrise'],
        desc: 'Tokyo’s oldest temple, framed by the giant Kaminarimon lantern and a lane of century-old snack stalls.',
        nearby: [
          { id: 'nakamise', title: 'Nakamise snack crawl', kind: 'Street food', mins: 3, tone: '#E9D7CE', photo: 'melon-pan stall' },
          { id: 'kappa', title: 'Kappabashi knife street', kind: 'Shopping', mins: 9, tone: '#DDE2D6', photo: 'handmade knives' },
          { id: 'sumida', title: 'Sumida riverwalk', kind: 'Stroll', mins: 6, tone: '#D7DEE4', photo: 'river & skytree' },
        ],
      },
      {
        id: 'meiji', title: 'Meiji Jingū', kind: 'Shrine', area: 'Harajuku', hours: 'Open at sunrise',
        tone: '#DCE3D8', photo: 'forest torii path', tags: ['Forest', 'Serene'],
        desc: 'A vast evergreen forest in the heart of the city, leading to one of Japan’s grandest Shinto shrines.',
        nearby: [
          { id: 'takeshita', title: 'Takeshita Street', kind: 'Shopping', mins: 7, tone: '#E9D7CE', photo: 'crepe stand' },
          { id: 'yoyogi', title: 'Yoyogi Park picnic', kind: 'Nature', mins: 5, tone: '#DDE2D6', photo: 'open lawn' },
          { id: 'omote', title: 'Omotesandō cafés', kind: 'Coffee', mins: 10, tone: '#E7DCCB', photo: 'pour-over bar' },
        ],
      },
      {
        id: 'teamlab', title: 'teamLab Planets', kind: 'Art museum', area: 'Toyosu', hours: 'Opens 10:00 AM',
        tone: '#DED7E0', photo: 'mirrored water room', tags: ['Immersive', 'Book ahead'],
        desc: 'Wade barefoot through water and infinite mirrored rooms in this walk-through digital art museum.',
        nearby: [
          { id: 'toyosu', title: 'Toyosu Market sushi', kind: 'Breakfast', mins: 12, tone: '#E9D7CE', photo: 'fresh nigiri' },
          { id: 'teahouse', title: 'Garden tea house', kind: 'Tea', mins: 2, tone: '#DCE3D8', photo: 'matcha set' },
        ],
      },
      {
        id: 'tsukiji', title: 'Tsukiji Outer Market', kind: 'Food market', area: 'Tsukiji', hours: 'Best before noon',
        tone: '#E9D7CE', photo: 'tamagoyaki stall', tags: ['Foodie', 'Go early'],
        desc: 'A maze of stalls slinging tamagoyaki skewers, fresh uni and the sharpest knives in the city.',
        nearby: [
          { id: 'tama', title: 'Tamagoyaki on a stick', kind: 'Snack', mins: 1, tone: '#E7DCCB', photo: 'sweet omelette' },
          { id: 'hama', title: 'Hamarikyū Gardens', kind: 'Nature', mins: 11, tone: '#DCE3D8', photo: 'tidal pond' },
        ],
      },
      {
        id: 'shibuya', title: 'Shibuya Sky', kind: 'Observation', area: 'Shibuya', hours: 'Opens 10:00 AM',
        tone: '#D7DEE4', photo: 'rooftop at dusk', tags: ['Skyline', 'Sunset'],
        desc: 'An open-air rooftop 230m up. The whole city, and on clear evenings Mt. Fuji, glowing at golden hour.',
        nearby: [
          { id: 'cross', title: 'Shibuya Crossing', kind: 'Landmark', mins: 2, tone: '#E9D7CE', photo: 'scramble crossing' },
          { id: 'hachiko', title: 'Hachikō statue', kind: 'Photo stop', mins: 3, tone: '#E7DCCB', photo: 'bronze dog' },
          { id: 'vintage', title: 'Shibuya vintage shops', kind: 'Shopping', mins: 6, tone: '#DDE2D6', photo: 'denim racks' },
        ],
      },
      {
        id: 'nakame', title: 'Nakameguro Canal', kind: 'Neighbourhood', area: 'Nakameguro', hours: 'Anytime',
        tone: '#DDE2D6', photo: 'willow-lined canal', tags: ['Local', 'Dreamy'],
        desc: 'A willow-lined canal threaded with tiny coffee roasters, second-hand bookshops and low-key boutiques.',
        nearby: [
          { id: 'roast', title: 'Single-origin roastery', kind: 'Coffee', mins: 4, tone: '#E7DCCB', photo: 'roasting drum' },
          { id: 'books', title: 'COW BOOKS reading', kind: 'Books', mins: 5, tone: '#DED7E0', photo: 'curated shelf' },
        ],
      },
    ];
    this.state = {
      screen: ['home', 'swipe', 'bucket', 'itinerary'].includes(this.startScreen) ? this.startScreen : 'home',
      vibe: 1,
      index: 0,
      matches: [],
      sheetSpot: null,
      sheetExpanded: false,
      selectedActs: [],
      drag: { type: null, id: null, dx: 0, dy: 0, sx: 0, sy: 0 },
      exiting: null,
    };
  }

  componentDidMount() {
    this._move = (e) => {
      const d = this.state.drag;
      if (!d.type) return;
      this.setState({ drag: { ...d, dx: e.clientX - d.sx, dy: e.clientY - d.sy } });
    };
    this._up = () => {
      const d = this.state.drag;
      if (!d.type) return;
      if (d.type === 'card') this.endCard(d);
      else this.endRow(d);
    };
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
    this.syncAccent();
  }
  componentDidUpdate() { this.syncAccent(); }
  componentWillUnmount() {
    window.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('pointercancel', this._up);
  }
  syncAccent() { if (this.rootRef.current) this.rootRef.current.style.setProperty('--accent', this.accentColor); }

  reset() { this.setState({ drag: { type: null, id: null, dx: 0, dy: 0, sx: 0, sy: 0 } }); }
  go(screen) { this.setState({ screen }); }

  cardDown(e) { if (this.state.exiting) return; this.setState({ drag: { type: 'card', id: null, dx: 0, dy: 0, sx: e.clientX, sy: e.clientY } }); }
  endCard(d) { this.reset(); if (d.dx > 95) this.like(); else if (d.dx < -95) this.pass(); }
  like() {
    const spot = this.deck[this.state.index];
    if (!spot) return;
    this.setState({ exiting: 'like' });
    setTimeout(() => this.setState((s) => ({ index: s.index + 1, exiting: null, sheetSpot: spot, sheetExpanded: false, selectedActs: [] })), 300);
  }
  pass() {
    if (!this.deck[this.state.index]) return;
    this.setState({ exiting: 'pass' });
    setTimeout(() => this.setState((s) => ({ index: s.index + 1, exiting: null })), 300);
  }

  sightsee() {
    const spot = this.state.sheetSpot;
    if (!spot) return;
    this.setState((s) => ({ matches: [...s.matches, { spot, acts: [] }], sheetSpot: null, sheetExpanded: false, selectedActs: [] }));
  }
  explore() { this.setState({ sheetExpanded: true }); }
  toggleAct(id) {
    this.setState((s) => ({ selectedActs: s.selectedActs.includes(id) ? s.selectedActs.filter((x) => x !== id) : [...s.selectedActs, id] }));
  }
  confirmExplore() {
    const spot = this.state.sheetSpot;
    if (!spot) return;
    const acts = this.state.selectedActs;
    this.setState((s) => ({ matches: [...s.matches, { spot, acts }], sheetSpot: null, sheetExpanded: false, selectedActs: [] }));
  }

  rowDown(id, e) { this.setState({ drag: { type: 'row', id, dx: 0, dy: 0, sx: e.clientX, sy: e.clientY } }); }
  endRow(d) { this.reset(); if (d.dx < -80) this.deleteMatch(d.id); }
  deleteMatch(idx) { this.setState((s) => ({ matches: s.matches.filter((_, i) => i !== idx) })); }
  generate() { if (this.state.matches.length) this.setState({ screen: 'itinerary' }); }

  fmt(mins) {
    let h = Math.floor(mins / 60);
    const m = mins % 60;
    const ap = h >= 12 ? 'PM' : 'AM';
    let hh = h % 12;
    if (hh === 0) hh = 12;
    return hh + ':' + String(m).padStart(2, '0') + ' ' + ap;
  }
  stripe(tone) {
    return {
      backgroundColor: tone,
      backgroundImage:
        'repeating-linear-gradient(135deg, rgba(255,255,255,.5) 0px, rgba(255,255,255,.5) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 12px)',
    };
  }

  buildItinerary() {
    const nodes = [];
    this.state.matches.forEach((m) => {
      nodes.push({ title: m.spot.title, kind: m.spot.kind, tone: m.spot.tone, type: 'anchor' });
      m.spot.nearby
        .filter((n) => m.acts.includes(n.id))
        .forEach((a) => nodes.push({ title: a.title, kind: a.kind, tone: a.tone, mins: a.mins, type: 'act' }));
    });
    let t = 9 * 60;
    return nodes.map((n, i) => {
      const transit = i === 0 ? null : n.type === 'act' ? n.mins + ' min walk' : '12 min metro';
      const time = this.fmt(t);
      t += (n.type === 'anchor' ? 90 : 40) + (transit ? (transit.includes('walk') ? 10 : 14) : 0);
      return {
        num: i + 1,
        time,
        title: n.title,
        kind: n.kind,
        transit,
        hasTransit: !!transit,
        imgStyle: { ...this.stripe(n.tone), width: 52, height: 52, borderRadius: 12, flexShrink: 0 },
      };
    });
  }

  renderVals() {
    const ACCENT = this.accentColor;
    const { screen, index, drag, exiting } = this.state;
    const len = this.deck.length;
    const navColor = (s) => (screen === s ? ACCENT : '#B6B1A9');

    // swipe stack
    const stack = [];
    for (let d = 0; d < 3; d++) {
      const s = this.deck[index + d];
      if (!s) break;
      const isTop = d === 0;
      const scale = 1 - d * 0.05;
      const peek = -d * 9;
      let tx = 0, ty = 0, rot = 0, opacity = 1;
      let transition = 'transform .35s cubic-bezier(.2,.8,.2,1), opacity .3s ease';
      if (isTop) {
        if (exiting === 'like') { tx = 640; rot = 18; opacity = 0; }
        else if (exiting === 'pass') { tx = -640; rot = -18; opacity = 0; }
        else if (drag.type === 'card') { tx = drag.dx; ty = drag.dy; rot = drag.dx * 0.04; transition = 'none'; }
      }
      const lk = isTop && drag.type === 'card' ? Math.max(0, Math.min(1, drag.dx / 90)) : 0;
      const ps = isTop && drag.type === 'card' ? Math.max(0, Math.min(1, -drag.dx / 90)) : 0;
      stack.push({
        key: s.id, title: s.title, kind: s.kind, area: s.area, desc: s.desc, hours: s.hours, photo: s.photo, tags: s.tags,
        onDown: isTop && !exiting ? (e) => this.cardDown(e) : undefined,
        style: {
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 28,
          overflow: 'hidden', boxShadow: '0 20px 44px rgba(28,28,28,.15), 0 2px 8px rgba(28,28,28,.05)',
          transform: `translate(${tx}px, ${peek + ty}px) rotate(${rot}deg) scale(${scale})`, transformOrigin: 'center top',
          opacity, transition, zIndex: 10 - d, touchAction: 'none', cursor: isTop ? 'grab' : 'default',
        },
        imgStyle: { ...this.stripe(s.tone), height: '54%', position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'flex-end' },
        likeStamp: {
          position: 'absolute', top: 20, left: 18, padding: '5px 14px', border: `3px solid ${ACCENT}`, color: ACCENT,
          borderRadius: 10, fontWeight: 800, fontSize: 19, letterSpacing: 1.5, transform: 'rotate(-13deg)', opacity: lk, fontFamily: 'Inter',
        },
        passStamp: {
          position: 'absolute', top: 20, right: 18, padding: '5px 14px', border: '3px solid #9A9A9A', color: '#9A9A9A',
          borderRadius: 10, fontWeight: 800, fontSize: 19, letterSpacing: 1.5, transform: 'rotate(13deg)', opacity: ps, fontFamily: 'Inter',
        },
      });
    }

    // sheet acts
    const sp = this.state.sheetSpot;
    const sheetActs = sp
      ? sp.nearby.map((a) => {
          const sel = this.state.selectedActs.includes(a.id);
          return {
            id: a.id, title: a.title, kind: a.kind, mins: a.mins, photo: a.photo,
            imgStyle: { ...this.stripe(a.tone), height: 88, position: 'relative', display: 'flex', alignItems: 'flex-end' },
            onToggle: () => this.toggleAct(a.id),
            btnLabel: sel ? 'Added' : 'Add',
            btnStyle: sel
              ? { marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 11, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }
              : { marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 11, border: '1.5px solid rgba(28,28,28,.18)', background: '#fff', color: '#1C1C1C', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' },
          };
        })
      : [];

    // bucket groups
    const groups = this.state.matches.map((m, i) => {
      const dragging = drag.type === 'row' && drag.id === i;
      const dx = dragging ? Math.min(0, drag.dx) : 0;
      return {
        key: 'g' + i, title: m.spot.title, kind: m.spot.kind, area: m.spot.area,
        imgStyle: { ...this.stripe(m.spot.tone), width: 60, height: 60, borderRadius: 14, flexShrink: 0 },
        acts: m.spot.nearby
          .filter((n) => m.acts.includes(n.id))
          .map((a) => ({ key: a.id, title: a.title, kind: a.kind, mins: a.mins, imgStyle: { ...this.stripe(a.tone), width: 36, height: 36, borderRadius: 9, flexShrink: 0 } })),
        onDown: (e) => this.rowDown(i, e),
        cardStyle: {
          position: 'relative', background: '#fff', borderRadius: 20, boxShadow: '0 6px 18px rgba(28,28,28,.06)',
          transform: `translateX(${dx}px)`, transition: dragging ? 'none' : 'transform .25s ease', touchAction: 'pan-y', cursor: 'grab',
        },
        revealStyle: {
          position: 'absolute', inset: 0, background: '#C2603F', borderRadius: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'flex-end', gap: 7, paddingRight: 22, color: '#fff', fontWeight: 600, fontSize: 14,
          opacity: dragging ? Math.min(1, -dx / 80) : 0,
        },
      };
    });

    const itin = this.buildItinerary();
    const pos = [[55, 238], [120, 168], [96, 92], [186, 128], [266, 182], [302, 92], [236, 44], [150, 52]];
    const cnt = Math.min(itin.length, pos.length);

    const vibePill = (active) =>
      active
        ? { flexShrink: 0, padding: '10px 18px', borderRadius: 99, background: '#1C1C1C', color: '#fff', border: '1px solid #1C1C1C', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter' }
        : { flexShrink: 0, padding: '10px 18px', borderRadius: 99, background: 'transparent', color: '#1C1C1C', border: '1px solid rgba(28,28,28,.18)', fontSize: 14, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter' };

    return {
      city: this.city,
      isHome: screen === 'home', isSwipe: screen === 'swipe', isBucket: screen === 'bucket', isItin: screen === 'itinerary',
      vibes: this.vibes.map((label, i) => ({ label, onClick: () => this.setState({ vibe: i }), style: vibePill(i === this.state.vibe) })),
      swipeVibeLabel: this.vibes[this.state.vibe],
      featuredImgStyle: { ...this.stripe('#DCE3D8'), height: 178, position: 'relative', display: 'flex', alignItems: 'flex-end' },
      onStart: () => this.setState({ screen: 'swipe', index: 0 }),
      navHome: { color: navColor('home'), onClick: () => this.go('home') },
      navHit: { color: navColor('bucket'), onClick: () => this.go('bucket') },
      navRoute: { color: navColor('itinerary'), onClick: () => this.go(this.state.matches.length ? 'itinerary' : 'bucket') },
      navProf: { color: navColor('profile'), onClick: () => {} },
      // swipe
      stack, deckActive: index < len, deckDone: index >= len,
      progressStyle: { width: (Math.min(index, len) / len) * 100 + '%', height: '100%', background: ACCENT, borderRadius: 99, transition: 'width .3s ease' },
      progressLabel: Math.min(index + 1, len) + ' / ' + len,
      onLike: () => this.like(), onPass: () => this.pass(),
      matchCount: this.state.matches.length,
      // sheet
      sheetOpen: !!sp, sheetTitle: sp ? sp.title : '', sheetArea: sp ? sp.area : '',
      sheetCollapsed: !this.state.sheetExpanded, sheetExpanded: this.state.sheetExpanded,
      sheetActs, onSightsee: () => this.sightsee(), onExplore: () => this.explore(), onConfirm: () => this.confirmExplore(),
      confirmLabel: 'Add ' + (this.state.selectedActs.length + 1) + ' & continue',
      // bucket
      groups, emptyBucket: this.state.matches.length === 0,
      onGenerate: () => this.generate(),
      generateStyle: this.state.matches.length
        ? { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '17px 0', borderRadius: 16, border: 'none', background: '#1C1C1C', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', boxShadow: '0 10px 26px rgba(28,28,28,.2)', fontFamily: 'Inter' }
        : { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '17px 0', borderRadius: 16, border: 'none', background: '#DCD8D0', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'not-allowed', fontFamily: 'Inter' },
      // itinerary
      timeline: itin,
      mapPins: pos.slice(0, cnt).map((p, i) => ({ x: p[0], y: p[1], ty: p[1] + 4, n: i + 1 })),
      routePoints: pos.slice(0, cnt).map((p) => p.join(',')).join(' '),
      timelineSummary: cnt + ' stops · starts ' + (itin[0] ? itin[0].time : '9:00 AM') + ' · walking-optimised',
    };
  }

  render() {
    const v = this.renderVals();
    return (
      <div
        style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#E8E6E1', padding: '36px 20px', fontFamily: 'Inter, system-ui',
        }}
      >
        <IOSDevice width={402} height={874}>
          <div
            ref={this.rootRef}
            style={{
              position: 'relative', height: '100%', width: '100%', background: '#F9F8F6',
              overflow: 'hidden', fontFamily: 'Inter, -apple-system, system-ui', color: '#1C1C1C',
            }}
          >
            {v.isHome && this.renderHome(v)}
            {v.isSwipe && this.renderSwipe(v)}
            {v.isBucket && this.renderBucket(v)}
            {v.isItin && this.renderItinerary(v)}
            {v.sheetOpen && this.renderSheet(v)}
          </div>
        </IOSDevice>
      </div>
    );
  }

  // ════════════ SCREEN 1 · HOME ════════════
  renderHome(v) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', animation: 'scrIn .4s ease both' }}>
        <div style={{ padding: '60px 22px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, letterSpacing: '.2px' }}>Whim</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', width: 26, height: 26 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1C1C1C" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              <div style={{ position: 'absolute', top: -1, right: -1, width: 9, height: 9, borderRadius: '50%', background: 'var(--accent, #D97757)', border: '2px solid #F9F8F6' }} />
            </div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#DCE3D8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#5b6b5b' }}>JL</div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '0 22px 130px' }}>
          <div style={{ padding: '20px 0 2px' }}>
            <div style={{ fontFamily: SERIF, fontSize: 33, lineHeight: 1.22, fontWeight: 600 }}>
              I’m going to{' '}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', border: '1px solid rgba(28,28,28,.1)', borderRadius: 12, padding: '1px 11px 3px', boxShadow: '0 2px 8px rgba(28,28,28,.05)', verticalAlign: 2 }}>
                {v.city}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
              </span>
            </div>
            <div style={{ marginTop: 14, color: '#8E8E93', fontSize: 15 }}>Select a vibe to start discovering.</div>
          </div>

          <div style={{ display: 'flex', gap: 9, overflowX: 'auto', margin: '18px -22px 0', padding: '2px 22px 8px' }}>
            {v.vibes.map((vibe, i) => (
              <button key={i} onClick={vibe.onClick} style={vibe.style}>{vibe.label}</button>
            ))}
          </div>

          <div style={{ marginTop: 24, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 18, right: 18, top: -11, height: 30, background: '#fff', borderRadius: 22, boxShadow: '0 6px 18px rgba(28,28,28,.06)', opacity: 0.7 }} />
            <div style={{ position: 'absolute', left: 9, right: 9, top: -5, height: 30, background: '#fff', borderRadius: 24, boxShadow: '0 8px 22px rgba(28,28,28,.07)', opacity: 0.85 }} />
            <div style={{ position: 'relative', background: '#fff', borderRadius: 26, overflow: 'hidden', boxShadow: '0 20px 44px rgba(28,28,28,.13), 0 2px 8px rgba(28,28,28,.05)' }}>
              <div style={v.featuredImgStyle}>
                <span style={{ position: 'absolute', top: 14, left: 14, padding: '5px 12px', borderRadius: 99, background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(4px)', fontSize: 11.5, fontWeight: 600, color: '#5b6b5b' }}>{v.swipeVibeLabel}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(28,28,28,.42)', padding: '12px 14px', letterSpacing: '.2px' }}>photo · quiet café interior</span>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ fontFamily: SERIF, fontSize: 25, fontWeight: 600 }}>Matcha &amp; Minimalism</div>
                <div style={{ color: '#8E8E93', fontSize: 14.5, marginTop: 9, lineHeight: 1.55 }}>A hand-picked loop of slow mornings, design shops and the city’s most photogenic cafés.</div>
                <button onClick={v.onStart} style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1C1C1C', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 22px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>
                  Start Swiping
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {this.renderNav(v)}
      </div>
    );
  }

  renderNav(v) {
    const item = (nav, label, icon) => (
      <button onClick={nav.onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 64, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', color: nav.color, fontSize: 10, fontWeight: 600, fontFamily: 'Inter' }}>
        {icon}
        {label}
      </button>
    );
    return (
      <div
        style={{
          position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, padding: 7,
          borderRadius: 99, background: 'rgba(255,255,255,.72)', backdropFilter: 'blur(18px) saturate(180%)',
          WebkitBackdropFilter: 'blur(18px) saturate(180%)', boxShadow: '0 8px 30px rgba(28,28,28,.13), inset 0 0 0 1px rgba(255,255,255,.6)',
        }}
      >
        {item(v.navHome, 'Discover',
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2.2 5.3-5.3 2.2 2.2-5.3 5.3-2.2z" fill="currentColor" stroke="none" /></svg>)}
        {item(v.navHit, 'Hitlist',
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.6-9.2-8C1 9.7 2.4 6.2 5.7 6c2-.1 3.4 1.1 3.8 1.9.4-.8 1.8-2 3.8-1.9C16.6 6.2 18 9.7 16.2 13 14 16.4 12 21 12 21z" /></svg>)}
        {item(v.navRoute, 'Route',
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 20l-5.5-2V6L9 8l6-2 5.5 2v12L15 18l-6 2z" /><path d="M9 8v12M15 6v12" /></svg>)}
        {item(v.navProf, 'Profile',
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6.2 8-6.2S20 17 20 21" /></svg>)}
      </div>
    );
  }

  // ════════════ SCREEN 2 · SWIPE DECK ════════════
  renderSwipe(v) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', animation: 'scrIn .4s ease both' }}>
        <div style={{ padding: '60px 18px 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={v.navHome.onClick} style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', border: '1px solid rgba(28,28,28,.07)', boxShadow: '0 3px 10px rgba(28,28,28,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1C1C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 600 }}>{v.swipeVibeLabel} in {v.city}</div>
          <div style={{ width: 40, flexShrink: 0 }} />
        </div>
        <div style={{ padding: '8px 22px 0', display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ flex: 1, height: 4, background: '#EAE6DE', borderRadius: 99, overflow: 'hidden' }}><div style={v.progressStyle} /></div>
          <div style={{ fontSize: 12, color: '#8E8E93', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{v.progressLabel}</div>
        </div>

        <div style={{ flex: 1, position: 'relative', margin: '16px 18px 0' }}>
          {v.deckActive &&
            v.stack.map((item) => (
              <div key={item.key} onPointerDown={item.onDown} style={item.style}>
                <div style={item.imgStyle}>
                  <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 7 }}>
                    {item.tags.map((tag, ti) => (
                      <span key={ti} style={{ padding: '5px 11px', borderRadius: 99, background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', fontSize: 11.5, fontWeight: 600, color: '#1C1C1C' }}>{tag}</span>
                    ))}
                  </div>
                  <div style={item.likeStamp}>ADD</div>
                  <div style={item.passStamp}>PASS</div>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(28,28,28,.4)', padding: '14px 16px' }}>photo · {item.photo}</span>
                </div>
                <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600, lineHeight: 1.15 }}>{item.title}</div>
                  <div style={{ color: '#8E8E93', fontSize: 13, marginTop: 4, fontWeight: 500 }}>{item.kind} · {item.area}</div>
                  <div style={{ color: '#444', fontSize: 14, marginTop: 12, lineHeight: 1.55 }}>{item.desc}</div>
                  <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99, background: '#F4F1EB', fontSize: 12.5, color: '#6b6b6b', fontWeight: 500 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                      {item.hours}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          {v.deckDone && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 30px' }}>
              <div style={{ fontFamily: SERIF, fontSize: 27, fontWeight: 600 }}>That’s the lot.</div>
              <div style={{ color: '#8E8E93', fontSize: 14.5, marginTop: 10, lineHeight: 1.5 }}>You’ve been through every {v.swipeVibeLabel} spot in {v.city}.</div>
              <button onClick={v.navHit.onClick} style={{ marginTop: 24, background: '#1C1C1C', color: '#fff', border: 'none', borderRadius: 14, padding: '15px 26px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>Review your hitlist ({v.matchCount})</button>
              <button onClick={v.navHome.onClick} style={{ marginTop: 12, background: 'none', border: 'none', color: '#8E8E93', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>Back to vibes</button>
            </div>
          )}
        </div>

        {v.deckActive && (
          <div style={{ padding: '20px 0 32px', display: 'flex', gap: 30, justifyContent: 'center', alignItems: 'center' }}>
            <button onClick={v.onPass} style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff', border: '1px solid rgba(28,28,28,.06)', boxShadow: '0 8px 20px rgba(28,28,28,.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9A9A9A" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <button onClick={v.onLike} style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent, #D97757)', border: 'none', boxShadow: '0 12px 26px rgba(217,119,87,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ════════════ SCREEN 4 · BUCKET LIST ════════════
  renderBucket(v) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', animation: 'scrIn .4s ease both' }}>
        <div style={{ padding: '60px 22px 2px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={v.navHome.onClick} style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', border: '1px solid rgba(28,28,28,.07)', boxShadow: '0 3px 10px rgba(28,28,28,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1C1C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        </div>
        <div style={{ padding: '8px 22px 6px' }}>
          <div style={{ fontFamily: SERIF, fontSize: 31, fontWeight: 600 }}>Your {v.city} Hitlist</div>
          <div style={{ color: '#8E8E93', fontSize: 13.5, marginTop: 5 }}>{v.matchCount} saved · swipe a card left to remove</div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '10px 18px 150px' }}>
          {v.emptyBucket && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '70px 30px' }}>
              <div style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 600 }}>Nothing saved yet</div>
              <div style={{ color: '#8E8E93', fontSize: 14, marginTop: 9, lineHeight: 1.5 }}>Swipe right on spots you love and they’ll land here.</div>
              <button onClick={v.onStart} style={{ marginTop: 22, background: '#1C1C1C', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>Start swiping</button>
            </div>
          )}
          {v.groups.map((g) => (
            <div key={g.key} style={{ marginBottom: 18 }}>
              <div style={{ position: 'relative' }}>
                <div style={g.revealStyle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14" /></svg>
                  Remove
                </div>
                <div onPointerDown={g.onDown} style={g.cardStyle}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 14 }}>
                    <div style={g.imgStyle} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600 }}>{g.title}</div>
                      <div style={{ color: '#8E8E93', fontSize: 12.5, marginTop: 3 }}>{g.kind} · {g.area}</div>
                    </div>
                    <span style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 99, background: '#F4EFE7', color: '#9c7a52', fontSize: 10.5, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase' }}>Anchor</span>
                  </div>
                </div>
              </div>
              {g.acts.map((a) => (
                <div key={a.key} style={{ margin: '8px 0 0 30px', display: 'flex', gap: 12, alignItems: 'center', background: '#fff', borderRadius: 15, padding: '9px 13px', border: '1px solid #F0ECE3' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent, #D97757)', flexShrink: 0 }} />
                  <div style={a.imgStyle} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div>
                    <div style={{ color: '#8E8E93', fontSize: 11.5, marginTop: 2 }}>{a.kind} · {a.mins} min away</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 20px 32px', background: 'linear-gradient(to top, #F9F8F6 62%, rgba(249,248,246,0))' }}>
          <button onClick={v.onGenerate} style={v.generateStyle}>
            Generate Smart Route
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    );
  }

  // ════════════ SCREEN 5 · ITINERARY ════════════
  renderItinerary(v) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', animation: 'scrIn .4s ease both' }}>
        <div style={{ position: 'relative', height: 304, flexShrink: 0, background: '#ECEBE7', overflow: 'hidden' }}>
          <svg viewBox="0 0 360 304" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
            <rect x="0" y="0" width="360" height="304" fill="#ECEBE7" />
            <path d="M-20 70 L380 130 M-20 200 L380 150 M70 -10 L120 320 M260 -10 L230 320" stroke="#E0DED9" strokeWidth="14" fill="none" />
            <path d="M-20 70 L380 130 M-20 200 L380 150 M70 -10 L120 320 M260 -10 L230 320" stroke="#F3F2EF" strokeWidth="2" fill="none" />
            <polyline points={v.routePoints} fill="none" stroke="var(--accent, #D97757)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 8" />
            {v.mapPins.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="14" fill="#fff" />
                <circle cx={p.x} cy={p.y} r="10" fill="var(--accent, #D97757)" />
                <text x={p.x} y={p.ty} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="700" fill="#fff">{p.n}</text>
              </g>
            ))}
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '60px 18px 0', display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={v.navHit.onClick} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(10px)', border: 'none', boxShadow: '0 3px 12px rgba(28,28,28,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1C1C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <span style={{ padding: '9px 15px', borderRadius: 99, background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(10px)', fontSize: 13, fontWeight: 600, boxShadow: '0 3px 12px rgba(28,28,28,.1)' }}>{v.city} · one day, optimised</span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '22px 22px 120px', background: '#F9F8F6', marginTop: -22, borderRadius: '24px 24px 0 0', position: 'relative' }}>
          <div style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 600 }}>Your optimised day</div>
          <div style={{ color: '#8E8E93', fontSize: 13, marginTop: 5, marginBottom: 20 }}>{v.timelineSummary}</div>
          {v.timeline.map((n) => (
            <div key={n.num}>
              {n.hasTransit && (
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 14, padding: '2px 0', borderLeft: '2px dashed #D7D1C6' }}>
                  <span style={{ marginLeft: 16, padding: '4px 11px', borderRadius: 99, background: '#EFEBE3', color: '#8E8E93', fontSize: 11.5, fontWeight: 500 }}>{n.transit}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
                <div style={{ width: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent, #D97757)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{n.num}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0, background: '#fff', borderRadius: 18, padding: 13, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 6px 16px rgba(28,28,28,.05)', marginBottom: 4 }}>
                  <div style={n.imgStyle} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent, #D97757)', letterSpacing: '.3px' }}>{n.time}</div>
                    <div style={{ fontFamily: SERIF, fontSize: 16.5, fontWeight: 600, marginTop: 1 }}>{n.title}</div>
                    <div style={{ color: '#8E8E93', fontSize: 12, marginTop: 2 }}>{n.kind}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '1px solid rgba(28,28,28,.06)', boxShadow: '0 8px 22px rgba(28,28,28,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1C1C1C" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M16 6l-4-4-4 4M12 2v13" /></svg>
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#1C1C1C', color: '#fff', border: 'none', borderRadius: 99, padding: '0 26px', height: 56, fontSize: 15.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 10px 26px rgba(28,28,28,.22)', fontFamily: 'Inter' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
            Export to Maps
          </button>
        </div>
      </div>
    );
  }

  // ════════════ SCREEN 3 · MICRO-DECISION SHEET ════════════
  renderSheet(v) {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 80 }}>
        <div onClick={v.onSightsee} style={{ position: 'absolute', inset: 0, background: 'rgba(28,28,28,.42)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', animation: 'bdIn .25s ease both' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#fff', borderRadius: '28px 28px 0 0', boxShadow: '0 -12px 44px rgba(0,0,0,.2)', animation: 'sheetUp .36s cubic-bezier(.2,.85,.25,1) both', maxHeight: '90%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '11px 0 2px' }}><div style={{ width: 38, height: 5, borderRadius: 99, background: '#E2DDD3' }} /></div>
          <div style={{ padding: '12px 24px 28px', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, animation: 'popIn .35s cubic-bezier(.2,.85,.25,1) both' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent, #D97757)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent, #D97757)', letterSpacing: '.6px', textTransform: 'uppercase' }}>Added to hitlist</span>
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 600, marginTop: 14 }}>{v.sheetTitle}</div>
            <div style={{ color: '#8E8E93', fontSize: 14.5, marginTop: 8, lineHeight: 1.55 }}>Are you just sightseeing, or do you want to explore what’s around {v.sheetArea}?</div>

            {v.sheetCollapsed && (
              <div style={{ display: 'flex', gap: 11, marginTop: 24 }}>
                <button onClick={v.onSightsee} style={{ flex: 1, padding: '16px 0', borderRadius: 15, border: '1.5px solid rgba(28,28,28,.16)', background: '#fff', color: '#1C1C1C', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>Just sightseeing</button>
                <button onClick={v.onExplore} style={{ flex: 1, padding: '16px 0', borderRadius: 15, border: 'none', background: '#1C1C1C', color: '#fff', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>Explore nearby</button>
              </div>
            )}
            {v.sheetExpanded && (
              <div style={{ marginTop: 22 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#8E8E93', letterSpacing: '.5px', textTransform: 'uppercase' }}>Worth a detour, minutes away</div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '13px -24px 0', padding: '4px 24px 8px' }}>
                  {v.sheetActs.map((a) => (
                    <div key={a.id} style={{ width: 164, flexShrink: 0, background: '#fff', border: '1px solid #EFEAE2', borderRadius: 18, overflow: 'hidden' }}>
                      <div style={a.imgStyle}>
                        <span style={{ fontFamily: MONO, fontSize: 9.5, color: 'rgba(28,28,28,.4)', padding: '9px 10px' }}>photo · {a.photo}</span>
                      </div>
                      <div style={{ padding: '11px 12px 13px' }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.25 }}>{a.title}</div>
                        <div style={{ fontSize: 11.5, color: '#8E8E93', marginTop: 3 }}>{a.kind} · {a.mins} min</div>
                        <button onClick={a.onToggle} style={a.btnStyle}>{a.btnLabel}</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={v.onConfirm} style={{ marginTop: 18, width: '100%', padding: '16px 0', borderRadius: 15, border: 'none', background: '#1C1C1C', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>{v.confirmLabel}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
