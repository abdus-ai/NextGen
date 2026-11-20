(function(){
"use strict";
function init(){
  var trigger=document.getElementById("ng-hamburger");
  if(!trigger)return;
  var existing=document.getElementById("ng-menu-drawer");
  if(existing){bind();return;}
  fetch(new URL("./hamburger-menu.html?v=20261120-v2",document.baseURI).href,{cache:"no-store"})
    .then(function(r){if(!r.ok)throw new Error("Navigation menu HTTP "+r.status);return r.text();})
    .then(function(html){
      var holder=document.createElement("div");holder.id="ng-shared-hamburger-root";holder.innerHTML=html;document.body.appendChild(holder);
      bind();
    })
    .catch(function(err){console.error("NextGen hamburger menu failed to load:",err);trigger.setAttribute("aria-label","Navigation menu unavailable");});
}
function bind(){
  var trigger=document.getElementById("ng-hamburger"),drawer=document.getElementById("ng-menu-drawer"),backdrop=document.getElementById("ng-menu-backdrop"),close=document.getElementById("ng-menu-close");
  if(!trigger||!drawer||!backdrop||trigger.dataset.menuBound==="1")return;
  trigger.dataset.menuBound="1";
  function openMenu(){drawer.classList.add("is-open");drawer.setAttribute("aria-hidden","false");backdrop.hidden=false;trigger.setAttribute("aria-expanded","true");trigger.setAttribute("aria-label","Close navigation menu");document.body.classList.add("ng-menu-open");}
  function closeMenu(){drawer.classList.remove("is-open");drawer.setAttribute("aria-hidden","true");backdrop.hidden=true;trigger.setAttribute("aria-expanded","false");trigger.setAttribute("aria-label","Open navigation menu");document.body.classList.remove("ng-menu-open");}
  trigger.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();drawer.classList.contains("is-open")?closeMenu():openMenu();});
  if(close)close.addEventListener("click",closeMenu);
  backdrop.addEventListener("click",closeMenu);
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&drawer.classList.contains("is-open"))closeMenu();});
  drawer.querySelectorAll("a[href]").forEach(function(link){link.addEventListener("click",function(){if(link.getAttribute("href")!=="#")closeMenu();});});
  drawer.querySelectorAll(".ng-menu-accordion-trigger").forEach(function(btn){btn.addEventListener("click",function(){var panel=btn.nextElementSibling;if(!panel)return;var expanded=btn.getAttribute("aria-expanded")==="true";btn.setAttribute("aria-expanded",String(!expanded));panel.hidden=expanded;var icon=btn.querySelector("i");if(icon)icon.textContent=expanded?"⌄":"⌃";});});
  var seeLess=document.getElementById("ng-menu-see-less"),main=drawer.querySelector(".ng-menu-main-links");
  if(seeLess&&main)seeLess.addEventListener("click",function(){var collapsed=main.classList.toggle("is-collapsed");seeLess.textContent=collapsed?"See more":"See less";});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();