(function(){
"use strict";
var menuPromise=null;
var pendingOpen=false;
function getTrigger(){return document.getElementById("ng-hamburger");}
function loadMenu(){
  if(document.getElementById("ng-menu-drawer"))return Promise.resolve();
  if(menuPromise)return menuPromise;
  var url=new URL("./hamburger-menu.html?v=20261120-v4",document.baseURI).href;
  menuPromise=fetch(url,{cache:"no-store",credentials:"same-origin"})
    .then(function(response){
      if(!response.ok)throw new Error("Navigation menu HTTP "+response.status);
      return response.text();
    })
    .then(function(markup){
      var holder=document.createElement("div");
      holder.id="ng-shared-hamburger-root";
      holder.innerHTML=markup;
      document.body.appendChild(holder);
      bindMenu();
    })
    .catch(function(error){
      menuPromise=null;
      console.error("NextGen navigation menu could not load:",error);
      var trigger=getTrigger();
      if(trigger){
        trigger.setAttribute("aria-label","Navigation menu could not load");
        trigger.setAttribute("aria-expanded","false");
      }
      throw error;
    });
  return menuPromise;
}
function bindMenu(){
  var trigger=getTrigger();
  var drawer=document.getElementById("ng-menu-drawer");
  var backdrop=document.getElementById("ng-menu-backdrop");
  var close=document.getElementById("ng-menu-close");
  if(!trigger||!drawer||!backdrop)return;
  function closeMenu(){
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden","true");
    backdrop.hidden=true;
    trigger.setAttribute("aria-expanded","false");
    trigger.setAttribute("aria-label","Open navigation menu");
    document.body.classList.remove("ng-menu-open");
  }
  function openMenu(){
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden","false");
    backdrop.hidden=false;
    trigger.setAttribute("aria-expanded","true");
    trigger.setAttribute("aria-label","Close navigation menu");
    document.body.classList.add("ng-menu-open");
  }
  if(trigger.dataset.menuBound!=="1"){
    trigger.dataset.menuBound="1";
    trigger.addEventListener("click",function(event){
      event.preventDefault();
      event.stopPropagation();
      if(!document.getElementById("ng-menu-drawer")){
        pendingOpen=true;
        loadMenu().then(function(){if(pendingOpen){pendingOpen=false;bindMenu();var d=document.getElementById("ng-menu-drawer");if(d&&!d.classList.contains("is-open"))d.classList.add("is-open");var b=document.getElementById("ng-menu-backdrop");if(b)b.hidden=false;trigger.setAttribute("aria-expanded","true");trigger.setAttribute("aria-label","Close navigation menu");document.body.classList.add("ng-menu-open");}}).catch(function(){pendingOpen=false;});
        return;
      }
      drawer.classList.contains("is-open")?closeMenu():openMenu();
    });
  }
  if(close&&!close.dataset.bound){close.dataset.bound="1";close.addEventListener("click",closeMenu);}
  if(!backdrop.dataset.bound){backdrop.dataset.bound="1";backdrop.addEventListener("click",closeMenu);}
  if(!drawer.dataset.bound){
    drawer.dataset.bound="1";
    drawer.querySelectorAll("a[href]").forEach(function(link){link.addEventListener("click",function(){if(link.getAttribute("href")!=="#")closeMenu();});});
    drawer.querySelectorAll(".ng-menu-accordion-trigger").forEach(function(button){
      button.addEventListener("click",function(){
        var panel=button.nextElementSibling;if(!panel)return;
        var expanded=button.getAttribute("aria-expanded")==="true";
        button.setAttribute("aria-expanded",String(!expanded));panel.hidden=expanded;
        var icon=button.querySelector("i");if(icon)icon.textContent=expanded?"⌄":"⌃";
      });
    });
    var seeLess=document.getElementById("ng-menu-see-less");
    var main=drawer.querySelector(".ng-menu-main-links");
    if(seeLess&&main)seeLess.addEventListener("click",function(){var collapsed=main.classList.toggle("is-collapsed");seeLess.textContent=collapsed?"See more":"See less";});
  }
  document.addEventListener("keydown",function(event){if(event.key==="Escape"&&drawer.classList.contains("is-open"))closeMenu();},{once:false});
}
function init(){
  var trigger=getTrigger();if(!trigger)return;
  // Attach the click handler before the menu fragment finishes loading.
  if(trigger.dataset.menuBound!=="1"){
    trigger.dataset.menuBound="1";
    trigger.addEventListener("click",function(event){
      event.preventDefault();event.stopPropagation();
      if(!document.getElementById("ng-menu-drawer")){
        pendingOpen=true;
        loadMenu().then(function(){
          pendingOpen=false;bindMenu();
          var drawer=document.getElementById("ng-menu-drawer"),backdrop=document.getElementById("ng-menu-backdrop");
          if(drawer&&backdrop){drawer.classList.add("is-open");drawer.setAttribute("aria-hidden","false");backdrop.hidden=false;trigger.setAttribute("aria-expanded","true");trigger.setAttribute("aria-label","Close navigation menu");document.body.classList.add("ng-menu-open");}
        }).catch(function(){pendingOpen=false;});
      }
    });
  }
  loadMenu().then(function(){bindMenu();}).catch(function(){});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();