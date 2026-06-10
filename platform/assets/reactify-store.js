(function(){
  const STORE_VERSION = 'reactify-circle-v1';
  const KEYS = { contacts:'reactify.contacts', conversations:'reactify.conversations', localAppointments:'reactify.localAppointments', eventTypes:'reactify.eventTypesCache', schedules:'reactify.schedulesCache' };
  const API = { bookings:'/.netlify/functions/cal-bookings', cancelBooking:'/.netlify/functions/cal-cancel-booking', eventTypes:'/.netlify/functions/cal-event-types', schedules:'/.netlify/functions/cal-schedules' };
  const CAL_USERNAME = 'christian-damian-62o7zs';
  const COLORS = ['var(--purple)','var(--orange)','var(--green)','var(--blue)','var(--purple-medium)'];
  const uid = (prefix='id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const nowIso = () => new Date().toISOString();
  const read = (key, fallback=[]) => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch(e){ return fallback; } };
  const write = (key, value) => { localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new CustomEvent('reactify:datachange', { detail:{ key } })); };
  const escapeHTML = (value) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const initials = (name='') => name.split(' ').filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase() || 'KL';
  const normalizePhone = (phone='') => String(phone).replace(/\s+/g,'').trim();
  const normalizeEmail = (email='') => String(email).trim().toLowerCase();
  const formatDateTime = (date) => new Date(date).toLocaleString('nl-BE',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Brussels'});
  const formatDate = (date) => new Date(date).toLocaleDateString('nl-BE',{weekday:'short',day:'numeric',month:'short',timeZone:'Europe/Brussels'});
  const formatTime = (date) => new Date(date).toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Brussels'});
  const pad = n => String(n).padStart(2,'0');
  const dateKey = d => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`; };
  const toInputDateTime = (d) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`; };
  const addMinutes = (date, min) => new Date(new Date(date).getTime() + (Number(min)||30)*60000);

  async function apiFetch(url, options={}){
    const res = await fetch(url, { headers:{'Content-Type':'application/json'}, ...options });
    const data = await res.json().catch(()=>({status:'error', error:'Kon response niet lezen.'}));
    if(!res.ok || data.status === 'error') throw new Error(data.error || data.message || (typeof data.details==='string' ? data.details : JSON.stringify(data.details||'')) || 'API request mislukt.');
    return data;
  }

  function getContacts(){ return read(KEYS.contacts, []); }
  function saveContacts(items){ write(KEYS.contacts, items); }
  function findContactMatch(contact, contacts=getContacts()){
    const email = normalizeEmail(contact.email); const phone = normalizePhone(contact.phone);
    return contacts.find(c => (email && normalizeEmail(c.email)===email) || (phone && normalizePhone(c.phone)===phone));
  }
  function upsertContact(data){
    const contacts = getContacts();
    const existing = data.id ? contacts.find(c=>c.id===data.id) : findContactMatch(data, contacts);
    if(existing){
      Object.assign(existing, { ...data, id: existing.id, name: data.name || existing.name, email: data.email || existing.email, phone: data.phone || existing.phone, updatedAt: nowIso(), lastActivity: data.lastActivity || existing.lastActivity || nowIso() });
      saveContacts(contacts); return existing;
    }
    const newContact = { id: uid('contact'), name: data.name || 'Nieuwe klant', email: data.email || '', phone: data.phone || '', status: data.status || 'active', source: data.source || 'Reactify', createdAt: nowIso(), updatedAt: nowIso(), lastActivity: data.lastActivity || nowIso(), notes: data.notes || '' };
    contacts.unshift(newContact); saveContacts(contacts); return newContact;
  }
  function deleteContact(id){
    saveContacts(getContacts().filter(c=>c.id!==id));
    write(KEYS.conversations, getConversations().filter(c=>c.contactId!==id));
    write(KEYS.localAppointments, getLocalAppointments().filter(a=>a.contactId!==id));
  }

  function getConversations(){ return read(KEYS.conversations, []); }
  function saveConversations(items){ write(KEYS.conversations, items); }
  function getOrCreateConversation(contact){
    let convs = getConversations();
    let conv = convs.find(c=>c.contactId===contact.id);
    if(conv) return conv;
    conv = { id: uid('conv'), contactId: contact.id, channel:'SMS', status:'ai-active', createdAt: nowIso(), updatedAt: nowIso(), messages:[] };
    convs.unshift(conv); saveConversations(convs); return conv;
  }
  function addMessage(contactId, text, direction='outgoing'){
    const contact = getContacts().find(c=>c.id===contactId); if(!contact) return null;
    const conv = getOrCreateConversation(contact); conv.messages.push({ id:uid('msg'), text, direction, time:nowIso() }); conv.updatedAt=nowIso();
    const convs = getConversations().filter(c=>c.id!==conv.id); convs.unshift(conv); saveConversations(convs);
    upsertContact({ ...contact, lastActivity:nowIso() });
    return conv;
  }

  function getLocalAppointments(){ return read(KEYS.localAppointments, []); }
  function saveLocalAppointments(items){ write(KEYS.localAppointments, items); }
  function addLocalAppointment(appt){ const items = getLocalAppointments(); const item = { id: appt.id || uid('appt'), ...appt, createdAt: appt.createdAt || nowIso(), updatedAt: nowIso() }; items.unshift(item); saveLocalAppointments(items); return item; }
  function updateLocalAppointment(id, patch){ const items=getLocalAppointments(); const item=items.find(a=>a.id===id); if(item) Object.assign(item, patch, {updatedAt:nowIso()}); saveLocalAppointments(items); return item; }
  function removeLocalAppointment(id){ saveLocalAppointments(getLocalAppointments().filter(a=>a.id!==id)); }

  function normalizeBookings(payload){
    const raw = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.bookings) ? payload.bookings : [];
    return raw.filter(b => b.status === 'accepted' || b.status === 'pending').map((b,i) => {
      const attendee = Array.isArray(b.attendees) ? b.attendees[0] : {};
      const name = attendee?.name || b.bookingFieldsResponses?.name || 'Klant';
      const email = attendee?.email || b.bookingFieldsResponses?.email || '';
      const phone = attendee?.phoneNumber || b.bookingFieldsResponses?.phone || b.bookingFieldsResponses?.phoneNumber || '';
      const contact = getContacts().find(c => (email && normalizeEmail(c.email)===normalizeEmail(email)) || (phone && normalizePhone(c.phone)===normalizePhone(phone))) || null;
      return { id:`cal_${b.uid || b.id || i}`, calUid:b.uid || b.id, contactId:contact?.id || null, title:b.bookingFieldsResponses?.title || b.title || b.eventType?.title || b.eventType?.slug || 'Afspraak', customer:contact?.name || name || 'Lead', customerType:contact ? 'Klant' : 'Lead', email:contact?.email || email, phone:contact?.phone || phone, start:b.start, end:b.end, status:b.status || 'accepted', meetingUrl:b.meetingUrl || b.location || 'https://app.cal.com/bookings', location:b.bookingFieldsResponses?.location || b.metadata?.locationLabel || b.location || b.meetingUrl || '', type:b.eventType?.title || b.eventType?.slug || 'Cal.com', source:'Cal.com', external:true, raw:b };
    }).sort((a,b)=>new Date(a.start)-new Date(b.start));
  }

  async function fetchCalBookings(){ const data = await apiFetch(API.bookings); return normalizeBookings(data); }
  async function fetchEventTypes(){ const data = await apiFetch(API.eventTypes); const items = Array.isArray(data.data) ? data.data : []; write(KEYS.eventTypes, items); return items; }
  async function fetchSchedules(){ const data = await apiFetch(API.schedules); const items = Array.isArray(data.data) ? data.data : []; write(KEYS.schedules, items); return items; }
  function getEventTypesCache(){ return read(KEYS.eventTypes, []); }
  function getSchedulesCache(){ return read(KEYS.schedules, []); }

  async function getAllAppointments(){
    let cal = [];
    try { cal = await fetchCalBookings(); } catch(e) { console.warn('Cal.com bookings niet geladen:', e.message); }
    const local = getLocalAppointments().filter(a=>a.status !== 'cancelled');
    const calIds = new Set(cal.map(a=>String(a.calUid || a.id)));
    const localOnly = local.filter(a => !a.calUid || !calIds.has(String(a.calUid)));
    return [...cal, ...localOnly].sort((a,b)=>new Date(a.start)-new Date(b.start));
  }

  async function createAppointment(data){
    let contact = data.contactId && data.contactId !== '__new__' ? getContacts().find(c=>c.id===data.contactId) : null;
    if(!contact){ contact = upsertContact({ name:data.name, email:data.email, phone:data.phone, source:'Manuele afspraak', lastActivity:data.start }); }
    const payload = {
      start: new Date(data.start).toISOString(),
      eventTypeId: data.eventTypeId ? Number(data.eventTypeId) : undefined,
      eventTypeSlug: data.eventTypeSlug || undefined,
      attendee:{ name: contact.name, email: contact.email || data.email, phoneNumber: contact.phone || data.phone, timeZone:'Europe/Brussels', language:'nl' },
      bookingFieldsResponses:{ title:data.title || 'Klantafspraak', notes:data.notes || '', location:data.locationLabel || '' },
      metadata:{ source:'reactify-platform', contactId:contact?.id || null, manualFollowUp:data.manualFollowUp ? 'true':'false' },
      locationType:data.locationType || 'cal_video', locationValue:data.locationValue || '',
      allowConflicts: !!data.allowConflicts, allowBookingOutOfBounds: !!data.allowBookingOutOfBounds,
    };
    let calUid = null, meetingUrl = '';
    try {
      const response = await apiFetch(API.bookings, { method:'POST', body: JSON.stringify(payload) });
      const booking = response?.data || response?.booking || response;
      calUid = booking?.uid || booking?.id || response?.uid || response?.id || null;
      meetingUrl = booking?.meetingUrl || response?.meetingUrl || '';
    } catch(error){
      // Save locally as concept so pages stay in sync, but show warning to the user.
      const local = addLocalAppointment({ contactId:contact?.id || null, title:data.title || 'Klantafspraak', customer:contact.name, start:data.start, end:addMinutes(data.start, data.length || 30).toISOString(), status:'pending', type:data.type || 'Reactify', source:'Reactify lokaal', location:data.locationLabel || data.locationValue || '', error:error.message });
      addMessage(contact.id, `Afspraak lokaal toegevoegd, maar Cal.com gaf een fout: ${error.message}`, 'outgoing');
      throw Object.assign(error, { localAppointment: local, contact });
    }
    const local = addLocalAppointment({ contactId:contact?.id || null, title:data.title || 'Klantafspraak', customer:contact.name, start:data.start, end:addMinutes(data.start, data.length || 30).toISOString(), status:'accepted', type:data.type || 'Cal.com', source:'Reactify', location:data.locationLabel || data.locationValue || '', calUid, meetingUrl });
    addMessage(contact.id, `Afspraak ingepland op ${formatDateTime(data.start)}.`, 'outgoing');
    return { appointment: local, contact };
  }

  async function cancelAppointment(appt){
    if(appt.calUid || (appt.external && appt.id)){
      try { await apiFetch(API.cancelBooking, { method:'POST', body: JSON.stringify({ uid: appt.calUid || String(appt.id).replace(/^cal_/,''), reason:'Geannuleerd via Reactify' }) }); } catch(e){ console.warn(e); }
    }
    if(appt.id && String(appt.id).startsWith('appt_')) updateLocalAppointment(appt.id, {status:'cancelled'});
    const contactId = appt.contactId;
    if(contactId) addMessage(contactId, `Afspraak van ${formatDateTime(appt.start)} werd geannuleerd.`, 'outgoing');
  }

  async function createSchedule(data){ return apiFetch(API.schedules, { method:'POST', body:JSON.stringify(data) }); }
  async function createEventType(data){ return apiFetch(API.eventTypes, { method:'POST', body:JSON.stringify(data) }); }

  function setSelectedContact(contactId){ sessionStorage.setItem('reactify.selectedContactId', contactId || ''); }
  function getSelectedContact(){ return sessionStorage.getItem('reactify.selectedContactId') || ''; }
  function goToAgendaForContact(contactId){ setSelectedContact(contactId); window.location.href = '/platform/agenda/?contact=' + encodeURIComponent(contactId); }
  function goToInboxForContact(contactId){ setSelectedContact(contactId); window.location.href = '/platform/inbox/?contact=' + encodeURIComponent(contactId); }

  function buildSidebar(active){
    return `<aside class="sidebar" id="sidebar"><div class="sidebar-logo"><img src="/logo.png" alt="Reactify"></div><nav class="sidebar-nav">
      <a href="/platform/" class="sidebar-link ${active==='dashboard'?'active':''}">🏠 Dashboard</a>
      <a href="/platform/klantenlijst/" class="sidebar-link ${active==='clients'?'active':''}">👥 Klanten</a>
      <a href="/platform/inbox/" class="sidebar-link ${active==='inbox'?'active':''}">💬 Inbox</a>
      <a href="/platform/agenda/" class="sidebar-link ${active==='agenda'?'active':''}">📅 Agenda</a>
      <div class="sidebar-spacer"></div><a href="#" class="sidebar-link">⚙️ Instellingen</a><a href="#" class="sidebar-link">❔ Help</a></nav>
      <div class="sidebar-user"><div class="user-avatar">BD</div><div><div class="user-name">Bob Demo</div><div class="user-role">Beheerder</div></div></div></aside>`;
  }

  window.ReactifyStore = { STORE_VERSION, KEYS, API, CAL_USERNAME, COLORS, uid, escapeHTML, initials, formatDateTime, formatDate, formatTime, dateKey, toInputDateTime, addMinutes, getContacts, saveContacts, upsertContact, deleteContact, getConversations, saveConversations, getOrCreateConversation, addMessage, getLocalAppointments, addLocalAppointment, updateLocalAppointment, removeLocalAppointment, normalizeBookings, fetchCalBookings, fetchEventTypes, fetchSchedules, getEventTypesCache, getSchedulesCache, getAllAppointments, createAppointment, cancelAppointment, createSchedule, createEventType, setSelectedContact, getSelectedContact, goToAgendaForContact, goToInboxForContact, buildSidebar };
})();
