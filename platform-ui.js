(function(){
  "use strict";
  const SETTINGS_URL = "/platform/instellingen/";
  function installLinks(){
    document.querySelectorAll(".sidebar-link").forEach(link=>{
      const text=(link.textContent||"").trim().toLowerCase();
      if(text==="instellingen") link.setAttribute("href",SETTINGS_URL);
      if(text==="help"){
        link.setAttribute("href","#help");
        link.addEventListener("click",e=>{e.preventDefault();openHelp();});
      }
    });
  }
  function ensureHelp(){
    if(document.getElementById("rfHelpModal")) return;
    const style=document.createElement("style");
    style.textContent=`
      .rf-help-backdrop{position:fixed;inset:0;background:rgba(17,24,39,.58);display:none;align-items:center;justify-content:center;padding:1rem;z-index:5000}.rf-help-backdrop.open{display:flex}
      .rf-help-modal{width:min(720px,96vw);max-height:88vh;overflow:hidden;background:#fff;border-radius:18px;box-shadow:0 24px 80px rgba(17,24,39,.24);display:flex;flex-direction:column}
      .rf-help-head{padding:1.15rem 1.25rem;border-bottom:1px solid #F3F4F6;display:flex;align-items:center;justify-content:space-between}.rf-help-head h2{font-size:1.05rem;color:#111827}.rf-help-close{width:34px;height:34px;border:1px solid #E5E7EB;border-radius:9px;background:#fff;cursor:pointer;font-size:1.2rem;color:#4B5563}
      .rf-help-body{padding:1.1rem 1.25rem;overflow:auto}.rf-help-intro{font-size:.82rem;color:#6B7280;margin-bottom:1rem}.rf-faq{border:1px solid #E5E7EB;border-radius:12px;margin-bottom:.65rem;overflow:hidden}.rf-faq button{width:100%;border:0;background:#fff;padding:.85rem 1rem;text-align:left;display:flex;justify-content:space-between;gap:1rem;font-weight:800;color:#1F2937;cursor:pointer}.rf-faq button:hover{background:#F9FAFB}.rf-faq-answer{display:none;padding:0 1rem .9rem;font-size:.8rem;line-height:1.55;color:#4B5563}.rf-faq.open .rf-faq-answer{display:block}.rf-faq.open button{color:#5B2E91}
      .rf-help-contact{margin-top:1rem;padding:.9rem 1rem;background:#F5F0FA;border-left:4px solid #5B2E91;border-radius:10px;font-size:.8rem;color:#374151}.rf-help-contact a{color:#5B2E91;font-weight:800}
    `;
    document.head.appendChild(style);
    const modal=document.createElement("div");
    modal.id="rfHelpModal"; modal.className="rf-help-backdrop";
    modal.innerHTML=`<div class="rf-help-modal" role="dialog" aria-modal="true" aria-labelledby="rfHelpTitle">
      <div class="rf-help-head"><h2 id="rfHelpTitle">Veelgestelde vragen</h2><button class="rf-help-close" aria-label="Sluiten">×</button></div>
      <div class="rf-help-body">
        <p class="rf-help-intro">Snelle antwoorden over gesprekken, afspraken en gegevensbeheer in Reactify.</p>
        ${[
          ["Wanneer antwoordt de AI?","De AI antwoordt wanneer de schakelaar op AI aan staat. Bij menselijke overname stopt de AI tot je ze opnieuw inschakelt."],
          ["Wat betekent ‘Overname nodig’?","De klant vraagt om persoonlijke hulp, meldt een klacht of het gesprek loopt vast. Klik op Overnemen om zelf verder te antwoorden."],
          ["Wanneer wordt een gesprek inactief?","Een gesprek wordt na 30 minuten zonder nieuwe activiteit automatisch inactief."],
          ["Hoe worden afspraken verwerkt?","Afspraken worden rechtstreeks uit de agenda geladen. Na een succesvolle boeking wordt het gekoppelde gesprek afgerond."],
          ["Kan ik klantgegevens aanpassen?","Ja. Open het klantprofiel vanuit de inbox of klantenlijst en pas naam, e-mail of andere gegevens aan."],
          ["Hoe lang worden berichten bewaard?","Dit stel je in onder Instellingen. Je kunt automatische verwijdering na 60 of 90 dagen activeren, of alle gesprekken onmiddellijk verwijderen."],
          ["Wat gebeurt er bij het verwijderen van berichten?","De gesprekken en bijbehorende berichten worden definitief verwijderd. Klantprofielen en agenda-afspraken blijven behouden."],
          ["Waarom zie ik een nieuw bericht niet meteen?","De inbox werkt met live updates. Vernieuw de pagina alleen wanneer je internetverbinding tijdelijk onderbroken was."]
        ].map((x,i)=>`<div class="rf-faq"><button type="button">${x[0]}<span>+</span></button><div class="rf-faq-answer">${x[1]}</div></div>`).join("")}
        <div class="rf-help-contact">Nog hulp nodig? Mail naar <a href="mailto:support@reactify.be">support@reactify.be</a>.</div>
      </div></div>`;
    document.body.appendChild(modal);
    modal.querySelector(".rf-help-close").onclick=()=>modal.classList.remove("open");
    modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("open")});
    modal.querySelectorAll(".rf-faq button").forEach(btn=>btn.onclick=()=>{
      const item=btn.closest(".rf-faq"); item.classList.toggle("open"); btn.querySelector("span").textContent=item.classList.contains("open")?"−":"+";
    });
  }
  function openHelp(){ensureHelp();document.getElementById("rfHelpModal").classList.add("open");}
  window.ReactifyHelp={open:openHelp};
  function ensureGlobalNotifications(){
    if(document.getElementById("rfGlobalNotifications") || document.getElementById("notificationBtn")) return;
    const style=document.createElement("style");
    style.textContent=`
      .rf-global-notification{position:fixed;right:1.25rem;top:1.15rem;z-index:2100;display:flex;align-items:center;justify-content:center}
      .rf-global-bell{width:38px;height:38px;border:1px solid #E5E7EB;border-radius:9px;background:#fff;color:#374151;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 22px rgba(17,24,39,.10);position:relative;font-size:16px;line-height:1}
      .rf-global-bell:hover{border-color:#5B2E91;color:#5B2E91}.rf-global-count{position:absolute;right:-7px;top:-7px;min-width:19px;height:19px;border-radius:999px;background:#F5A623;color:#fff;display:none;align-items:center;justify-content:center;font-size:.65rem;font-weight:900;padding:0 .35rem}.rf-global-bell.has-items .rf-global-count{display:inline-flex}
      .rf-global-panel{position:absolute;right:0;top:46px;width:min(390px,92vw);max-height:72vh;overflow:auto;background:#fff;border:1px solid #E5E7EB;border-radius:16px;box-shadow:0 22px 70px rgba(17,24,39,.18);display:none}.rf-global-panel.open{display:block}.rf-global-head{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:1rem 1.05rem;border-bottom:1px solid #F3F4F6}.rf-global-head strong{font-size:.95rem;color:#111827}.rf-global-head button{border:1px solid #E5E7EB;background:#fff;border-radius:8px;padding:.35rem .55rem;font-size:.72rem;font-weight:800;color:#374151;cursor:pointer}.rf-global-list{display:grid;gap:.4rem;padding:.7rem}.rf-global-item{border:0;text-align:left;width:100%;padding:.78rem;border-radius:12px;background:#F9FAFB;border-left:3px solid #5B2E91;cursor:pointer}.rf-global-item.unread{background:#FFF3DC;border-left-color:#F5A623}.rf-global-title{font-size:.82rem;font-weight:900;color:#111827;margin-bottom:.2rem}.rf-global-body{font-size:.76rem;color:#4B5563;line-height:1.45}.rf-global-meta{font-size:.68rem;color:#6B7280;margin-top:.28rem}.rf-global-empty{padding:1.25rem;color:#6B7280;font-size:.82rem;text-align:center}
      @media(max-width:768px){.rf-global-notification{right:.85rem;top:.85rem}}
    `;
    document.head.appendChild(style);
    const KEY="reactify.notifications";
    const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return []}};
    const save=items=>{localStorage.setItem(KEY,JSON.stringify(items.slice(0,120)));renderBadge();};
    const box=document.createElement("div");box.id="rfGlobalNotifications";box.className="rf-global-notification";
    box.innerHTML=`<button class="rf-global-bell" id="rfGlobalBell" type="button" title="Meldingen" aria-label="Meldingen">🔔<span class="rf-global-count" id="rfGlobalCount">0</span></button><div class="rf-global-panel" id="rfGlobalPanel"><div class="rf-global-head"><strong>Meldingen</strong><button type="button" id="rfGlobalReadAll">Alles gelezen</button></div><div class="rf-global-list" id="rfGlobalList"></div></div>`;
    document.body.appendChild(box);
    function renderBadge(){const count=read().filter(n=>!n.read).length;const bell=document.getElementById("rfGlobalBell"),badge=document.getElementById("rfGlobalCount");bell?.classList.toggle("has-items",count>0);if(badge)badge.textContent=count>99?"99+":String(count)}
    function renderPanel(){const list=document.getElementById("rfGlobalList");if(!list)return;const items=read();list.innerHTML=items.length?items.map(n=>`<button class="rf-global-item ${n.read?'':'unread'}" data-id="${String(n.id||'')}"><div class="rf-global-title">${String(n.title||'Reactify melding')}</div><div class="rf-global-body">${String(n.body||n.message||'')}</div><div class="rf-global-meta">${n.createdAt?new Date(n.createdAt).toLocaleString('nl-BE'):''}</div></button>`).join(""):'<div class="rf-global-empty">Nog geen meldingen.</div>';list.querySelectorAll('[data-id]').forEach(el=>el.onclick=()=>{let target='/platform/inbox/';save(read().map(n=>{if(String(n.id)===el.dataset.id){target=n.link||target;return {...n,read:true}}return n}));location.href=target})}
    document.getElementById("rfGlobalBell").onclick=e=>{e.stopPropagation();renderPanel();document.getElementById("rfGlobalPanel").classList.toggle("open")};
    document.getElementById("rfGlobalReadAll").onclick=e=>{e.stopPropagation();save(read().map(n=>({...n,read:true})));renderPanel()};
    document.addEventListener("click",e=>{if(!box.contains(e.target))document.getElementById("rfGlobalPanel")?.classList.remove("open")});
    window.addEventListener("storage",e=>{if(e.key===KEY){renderBadge();renderPanel()}});renderBadge();
  }
  document.addEventListener("DOMContentLoaded",()=>{installLinks();ensureHelp();ensureGlobalNotifications();});
})();
