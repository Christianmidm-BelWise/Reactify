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
  document.addEventListener("DOMContentLoaded",()=>{installLinks();ensureHelp();});
})();
