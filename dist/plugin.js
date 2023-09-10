W.loadPlugin({name:"windy-plugin-pg-mapa",version:"2.1.19",author:"Jakub Vrana",repository:{type:"git",url:"git+https://github.com/vrana/windy-plugin-pg-mapa"},description:"Windy plugin for paragliding takeoffs.",displayName:"Paragliding Mapa"},["broadcast","interpolator","map","store","utils","urls","http"],(function(t,e,n,i,o,a,r,s){var l=i.map;function c(){const t=o.get("product");return-1!=["gfs","icon","iconD2","iconEu"].indexOf(t)?t:"ecmwf"}const d={},p={};let u=null;const h={},g={},m={ecmwf:{}};let f=!1;function w(t){const e=L.marker(A(t),{icon:D(S(d[t],null),d[t]),riseOnHover:!0,title:d[t].map((t=>t.name+(t.superelevation?" ("+t.superelevation+" m)":""))).join("\n")});return e.bindPopup(_(t),{minWidth:200,maxWidth:400,autoPan:!1}),e.on("popupopen",(()=>{u=e,y(t),m.ecmwf[t]||s.get(r.getMeteogramForecast("ecmwf",Object.assign({step:1},A(t)))).then((e=>{m.ecmwf[t]=e.data,p[t].setPopupContent(_(t))}))})),e}function v(){n((t=>{const e=l.getBounds();for(const n in d){const i=d[n].reduce(((t,e)=>Math.max(t,e.flights)),0);if(l.getZoom()>(i>100?4:i>10?7:8)&&e.contains(A(n))){if(p[n]||(p[n]=w(n)),!h[F(n)])if("wind"==o.get("overlay")){const e=t(A(n));h[F(n)]=e&&a.wind2obj(e)}else if(!y(n)&&p[n]._icon){const t=p[n]._icon.src;p[n].setIcon(D(t,d[n]));continue}x(n),p[n].addTo(l)}else p[n]&&p[n].remove()}u&&u.fire("popupopen")}))}function y(t){const e=c();return g[e]=g[e]||{},!!g[e][t]||(s.get(r.getPointForecast(e,Object.assign({step:1},A(t)),"detail")).then((n=>{g[e][t]=n.data,x(t)})),!1)}function b(t){if(h[F(t)])return h[F(t)];const e=g[c()]&&g[c()][t]&&M(g[c()][t]);return e&&{wind:e.wind,dir:e.windDir}}function x(t){const e=b(t),n=C(d[t],e);p[t].setIcon(D(S(d[t],e),d[t])),p[t].setOpacity("red"!=n&&"silver"!=n?1:.6),p[t].setPopupContent(_(t))}function k(t){return/paragliding-mapa\.cz/.test(t)?' <a href="'+t+'" target="_blank"><img src="https://www.paragliding-mapa.cz/favicon/favicon-32x32.png" width="12" height="12" alt="" title="Paragliding Mapa"></a>':/dhv\.de/.test(t)?' <a href="'+t+'" target="_blank"><img src="https://www.dhv.de/fileadmin/templates/dhv2011/img/favicon/dhv.ico" width="12" height="12" alt="" title="DHV"></a>':/paraglidingearth\.com/.test(t)?' <a href="'+t+'" target="_blank"><img src="https://www.paraglidingearth.com/assets/img/favicon.ico" width="12" height="12" alt="" title="Paragliding Earth"></a>':""}function _(t){const e=d[t],n=c(),i=b(t),a=g[n]&&g[n][t],r=m.ecmwf[t],s=["green","orange","gray","red"],l=e.map((t=>'<b style="font-size: 1.25em;'+(t.name.length>=20?'text-overflow: ellipsis; max-width: 180px; display: inline-block; overflow: hidden; vertical-align: text-bottom;" title="'+Z(t.name):"")+'"><a'+function(t){return' href="'+t.url+'" target="_blank"'}(t)+(j(t)?' style="color: red;"'+(4==t.flying_status?' title="'+H("flying forbidden","létání zakázáno")+'"':""):"")+">"+Z(t.name)+"</a></b>"+(e.length>1?' <img src="'+S([t],i,s)+'" width="12" height="12" alt="">':"")+[t.url].concat(t.urls||[]).map(k).join("")+(t.altitude?' <span title="'+H("elevation","nadmořská výška")+'">'+t.altitude+" "+H("masl","mnm")+"</span>":"")+(t.superelevation?' (<span title="'+H("vertical metre","převýšení")+'">'+t.superelevation+" m</span>)":"")+(t.parkings&&t.parkings.length?t.parkings.map((e=>' <a href="https://www.google.com/maps/dir/?api=1&destination='+e.latitude+","+e.longitude+'" target="_blank"><img src="https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico" width="12" height="12" alt="" title="'+H("parking","parkoviště")+Z(e.name==t.name&&1==t.parkings.length?"":" "+e.name)+'" style="vertical-align: middle;"></a>')).join(""):' <a href="https://www.google.com/maps/dir/?api=1&destination='+t.latitude+","+t.longitude+'" target="_blank"><img src="https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico" width="12" height="12" alt="" title="'+H("takeoff","startovačka")+'" style="vertical-align: middle;"></a>')+' <a href="https://mapy.cz/turisticka?source=coor&id='+t.longitude+","+t.latitude+'" target="_blank"><img src="https://mapy.cz/img/favicon/favicon.ico" width="12" height="12" alt="" title="'+H("takeoff","startovačka")+'" style="vertical-align: middle;"></a>')),u=a&&!/FAKE/.test(a.header.note)&&M(a);let h,w=[];if(i){const n=" "+("surface"==o.get("level")||"wind"!=o.get("overlay")?H("on surface","na zemi"):H("at","v")+" "+o.get("level"));w.push("<a"+function(t){return' href=\'javascript:W.store.set("detailDisplay", "wind"); W.broadcast.fire("rqstOpen", "detail", '+JSON.stringify(A(t))+");'"}(t)+'><span style="color: '+s[q(e,i.dir)]+';" title="'+H("wind direction","směr větru")+n+'"><span style="display: inline-block; transform: rotate('+i.dir+'deg)">↓</span> '+i.dir+'°</span> <span style="color: '+s[P(i.wind)]+';" title="'+H("wind speed","rychlost větru")+n+'">'+i.wind.toFixed(1)+" m/s"+(u&&null!=u.gust?',</span> <span style="color: '+s[P(u.gust-4)]+';" title="'+H("gusts on surface","nárazy na zemi")+'">G: '+u.gust.toFixed(1)+" m/s":"")+"</span></a>")}if(u){const e=new Date(a.header.sunrise).getHours(),i=new Date(a.header.sunset).getHours(),o=u.icon2+(u.hour>e&&u.hour<=i?"":"_night_"+u.moonPhase);w.push("<a"+function(t){return' href=\'javascript:W.store.set("detailDisplay", "meteogram"); W.broadcast.fire("rqstOpen", "detail", '+JSON.stringify(A(t))+");'"}(t)+'><img src="https://www.windy.com/img/icons4/png_25px/'+o+'.png" style="height: 1.3em; vertical-align: middle;" title="'+H("weather","počasí")+" "+n+'"></a>'+(u.mm?' <span title="'+H("precipitation","srážky")+'">'+u.mm+" mm</span>":""))}function v(t,e,n){const i=(t||"").matchAll(/(https?:\/\/[^\s,;]+\w)( \([^()]+\))?/g);Array.from(i).forEach((t=>w.push('<a href="'+Z(t[1])+'" class="iconfont" style="vertical-align: middle;" title="'+e+Z(t[2]||"")+'" target="_blank">'+n+"</a>")))}l.push(w.join(" ")),w=[],v(e[0].link_meteo,H("weather station","meteostanice"),""),v(e[0].link_webcam,H("webcam","webkamera"),"l"),e.some((t=>h=[t.url].concat(t.urls||[]).find((t=>/xcontest\.org/.test(t))))),w.push('<a href="'+(h||"https://www.xcontest.org/world/en/flights-search/?list[sort]=pts&filter[point]="+t.replace(/(.+) (.+)/,"$2+$1")+"&filter[radius]=2000&filter[date_mode]=period#filter-mode")+'" target="_blank"><img src="https://s.xcontest.org/img/xcontest.gif" width="25" height="12" alt="XContest" style="vertical-align: middle;"></a>'+(null!=e[0].flights?' <span title="'+H("per year","za rok")+'">('+e[0].flights+" "+H("flights","letů")+")</span>,":""));let y=e[0].name;if(e.length>1){const t={};for(const n of e)n.name.split(/[- ,.]+/).forEach((e=>t[e]=(t[e]||0)+1));const n=Object.keys(t).filter((n=>t[n]==e.length));y=n.length?n.join(" "):y}const x=o.get("path").replace(/(\d{4})\/?(\d{2})\/?(\d{2})\/?(\d+)/,((t,e,n,i,o)=>e+"-"+n+"-"+i+"T"+String(3*Math.round(o/3)).padStart(2,0)+":00:00Z")),[C,z]=r?function(t){const{header:e,data:n}=t,i=W(t),o=e.modelElevation;let a=n["temp-surface"][i];const r=o+122*(a-n["dewpoint-surface"][i]),s={temp:{},gh:{}};for(const t in n){const e=/^(temp|gh)-(\d+)h$/.exec(t);e&&(s[e[1]][e[2]]=n[t][i])}let l=o,c=a;return Object.keys(s.temp).sort(((t,e)=>e-t)).some((t=>{const e=s.gh[t];if(e>l){const n=s.temp[t],i=e-l;if(n>a-.01*i)return l+=(a-c)/((n-c)/i+.01),!0;a-=.01*i,l=e,c=n}})),[Math.min(l,r),l>r]}(r):[0,!1];w.push((z?H("Cloud base","Základny"):H("Cloudless","Bezoblačná"))+': <a class="climb" href="http://www.xcmeteo.net/?p='+t.replace(/(.+) (.+)/,"$2x$1")+",t="+x+",s="+encodeURIComponent(y)+'" target="_blank" title="'+(r?H("source","zdroj")+": Windy "+r.header.model:"")+'">'+(r?10*Math.round(C/10)+" m":"-")+"</a>"+(f?' <a href="https://pg.vrana.cz/gfs/#explain" target="_blank"><sup>?</sup></a>':"")),l.push(w.join(" "),"");const D=document.createElement("div");D.style.whiteSpace="nowrap",D.innerHTML=l.join("<br>"),r&&(f&&D.appendChild(function(t){const e=document.createElementNS("http://www.w3.org/2000/svg","svg");e.style.width="435px",e.style.height="420px",e.style.zoom="75%";for(let t=0;t<=400;t+=50)I(e,[[20,t],[420,t]],"#bbb",.5),I(e,[[20+t,0],[20+t,400]],"#bbb",.5);const{header:n,data:i}=t,o=W(t),a={temp:[],dewpoint:[],wind_u:[],wind_v:[]};let r=-1/0;const s=-273.15,l=n.modelElevation,c=4e3+500*Math.floor(l/500);for(const t in i){const e=/^(temp|dewpoint|wind_u|wind_v)-(.+)/.exec(t);if(e){const n="surface"==e[2]?l:i["gh-"+e[2]][o];n>=l&&(a[e[1]].push([i[t][o],(c-n)/10]),"temp"!=e[1]&&"dewpoint"!=e[1]||(r=Math.max(5*Math.ceil((i[t][o]+s)/5),r)))}}for(const t in a)a[t].sort(((t,e)=>e[1]-t[1]));const d=a.temp[0][0],p=l+122*(d-a.dewpoint[0][0]);a.temp=a.temp.map((t=>[420+10*(t[0]+s-r),t[1]])),a.dewpoint=a.dewpoint.map((t=>[420+10*(t[0]+s-r),t[1]]));const u=e.appendChild(document.createElementNS("http://www.w3.org/2000/svg","clipPath"));u.id="clip";u.appendChild(document.createElementNS("http://www.w3.org/2000/svg","polygon")).setAttribute("points","20,0 420,0 420,400 20,400 20,0");const h=e.appendChild(document.createElementNS("http://www.w3.org/2000/svg","g"));h.setAttribute("clip-path","url(#clip)");const g=[0,a.temp[0][1]-(a.temp[0][0]-a.dewpoint[0][0])/.784];g[0]=a.temp[0][0]-.98*(a.temp[0][1]-g[1]),I(h,[a.temp[0],g],"#db5",1),I(h,[g,[g[0]-.98*g[1]*.6,0]],"#db5",1),I(h,[a.dewpoint[0],g],"#db5",1),I(h,a.temp,"#a22",2),I(h,a.dewpoint,"#23a",2),I(h,a.wind_u.map(((t,e)=>[20+25*Math.sqrt(Math.pow(t[0],2)+Math.pow(a.wind_v[e][0],2)),t[1]])),"#293",1.5);for(const t of function(t){let e;const n=[];for(const i of t.wind_u.map(((e,n)=>[(180*Math.atan2(-t.wind_v[n][0],e[0])/Math.PI-90+360)%360,e[1]])))e&&(Math.abs(e[0]-i[0])<=180?n.push([e,i]):(n.push([e,[i[0]+(e[0]<i[0]?-360:360),i[1]]]),n.push([[e[0]+(e[0]<i[0]?360:-360),e[1]],i]))),e=i;return n}(a))I(h,t.map((t=>[20+t[0]/360*400,t[1]])),"#52bea8",1.5,{"stroke-dasharray":"5 5"});I(e,[[20,0],[420,0]],"#555",.5,{"stroke-dasharray":"5 1.5",class:"guideline"}).style.visibility="hidden";for(let t=Math.ceil(l/1e3);t<=c/1e3;t++)O(e,t+"km",15,10+c/10-100*t,"#555");const m={};for(let t=r;t>=r-20;t-=5)m[420-10*(r-t)]={text:t+"°C",color:"#a22"};for(let t=0;t<=6;t+=2)m[20+25*t]={text:t+"m/s",color:"#293"};const f=(180*Math.atan2(-a.wind_v[0][0],a.wind_u[0][0])/Math.PI-90+360)%360;function w(t){const n=20+400*t/360;delete m[n],O(e,"↓",n,415,"#52bea8",{transform:"rotate("+t+","+n+",410)"})}w(45*Math.floor(f/45)),w(45*Math.ceil(f/45));for(const t in m)O(e,m[t].text,t,415,m[t].color);return O(e,t.header.model,395,22,"#999"),O(e,new Date(i.hours[o]).getHours()+":00",395,37,"#999"),O(e,"",395,64,"#555",{class:"height"}),O(e,"",378,79,"#52bea8",{class:"windDir"}),O(e,"",385,79,"#293",{class:"windSpeed","text-anchor":"start"}),O(e,"",395,94,"#a22",{class:"tempDiff"}),e.onmousemove=n=>{const i=parseInt(e.style.zoom)/100,r=n.offsetX/i,s=n.offsetY/i;if(r>=20&&r<=420&&s<=a.temp[0][1]){const n=c-10*s;e.querySelector(".height").textContent=10*Math.round(n/10)+"m",e.querySelector(".windDir").textContent="↓";const i=N(t,"wind_u",o,n),a=N(t,"wind_v",o,n);e.querySelector(".windDir").setAttribute("transform","rotate("+(180*Math.atan2(-a,i)/Math.PI-90+360)%360+",378,74)"),e.querySelector(".windSpeed").textContent=Math.sqrt(Math.pow(i,2)+Math.pow(a,2)).toFixed(1)+"m/s",e.querySelector(".tempDiff").textContent="Δ "+(d-.98*(Math.min(p,n)-l+.6*Math.max(n-p,0))/100-N(t,"temp",o,n)).toFixed(1)+"°C",e.querySelector(".guideline").style.visibility="visible",e.querySelector(".guideline").setAttribute("d","M20 "+s+"L420 "+s)}else e.querySelector(".height").textContent="",e.querySelector(".windDir").textContent="",e.querySelector(".windSpeed").textContent="",e.querySelector(".tempDiff").textContent="",e.querySelector(".guideline").style.visibility="hidden"},e}(r)),D.querySelector(".climb").onclick=()=>(f=!f,p[t].setPopupContent(_(t)),!1));let E=Date.now();return D.onwheel=t=>{Date.now()>E&&(o.set("timestamp",o.get("timestamp")+60*Math.sign(t.deltaY)*60*1e3),E=Date.now()+100)},D}function M(t){let e=0;for(;e<t.data.day.length&&!(t.data.ts[e]>o.get("timestamp"));e++);const n={};for(let i in t.data)n[i]=t.data[i][e-1];return e?n:null}function S(t,e){let n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:["lime","yellow","silver","red"];const i=[],o={0:5,1:4,2:1,3:3,"-1":2};for(const a of t)for(const[t,r]of a.wind_usable||[[0,360]]){const s=C([a],e,n),l=(r-t>=359?'<circle cx="19" cy="19" r="18" fill="'+s+'"/>':E(t-90,r-90,38,s))+"\n";i.push([o[n.indexOf(s)],l])}return i.sort(),"data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38">\n'+i.map((t=>t[1])).join("")+'<circle cx="19" cy="19" r="18" stroke="#333" stroke-width="2" fill-opacity="0"/>\n</svg>')}function C(t,e){let n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:["lime","yellow","silver","red"];return t.every(j)?"black":e?n[Math.max(P(e.wind),q(t,e.dir))]:"white"}function j(t){return 4==t.flying_status||0==t.active}function P(t){return t.toFixed(1)>=8?3:t.toFixed(1)>=4?1:0}function q(t,e){let n=2;for(const i of t)if(i.wind_usable&&(2==n&&(n=3),!j(i)))for(const[t,o]of i.wind_usable){if(z(e,t,o))return 0;z(e,t,o,10)&&(n=1)}return n}function z(t,e,n){let i=arguments.length>3&&void 0!==arguments[3]?arguments[3]:0;return n+=n<e?360:0,t>=e-i&&t<=n+i||t<=n+i-360||t>=e-i+360}function D(t,e){const n=l.getZoom();let i=n>9?38:n>6?19:n>5?9:5;const o=e[0].flights??(e[0].superelevation||0);return o<10?i/=2:o<100&&(i*=3/4),L.icon({iconUrl:t,iconSize:[i,i],iconAnchor:[(i-1)/2,(i-1)/2]})}function E(t,e,n,i){const o=n/2;return'<path d="M'+o+","+o+" L"+(o+o*Math.cos(Math.PI*t/180))+","+(o+o*Math.sin(Math.PI*t/180))+" A"+o+","+o+" 0 "+((e-t+360)%360>180?1:0)+" 1 "+(o+o*Math.cos(Math.PI*e/180))+","+(o+o*Math.sin(Math.PI*e/180))+' Z" fill="'+i+'"/>'}function A(t){const e=/(.+) (.+)/.exec(t);return{lat:+e[1],lon:+e[2]}}function F(t){return("wind"==o.get("overlay")?o.get("product")+":"+o.get("level"):c()+":surface")+":"+o.get("path")+":"+t}function I(t,e,n,i){let o=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{};const a=document.createElementNS("http://www.w3.org/2000/svg","path");a.setAttribute("d","M"+e.map((t=>t.join(" "))).join("L"));for(const t in o)a.setAttribute(t,o[t]);return a.style.stroke=n,a.style.strokeWidth=i,a.style.fill="none",t.appendChild(a)}function O(t,e,n,i,o){let a=arguments.length>5&&void 0!==arguments[5]?arguments[5]:{};const r=document.createElementNS("http://www.w3.org/2000/svg","text");r.textContent=e,r.setAttribute("x",n),r.setAttribute("y",i),r.setAttribute("text-anchor","middle");for(const t in a)r.setAttribute(t,a[t]);return r.style.fill=o,t.appendChild(r)}function N(t,e,n,i){const{header:o,data:a}=t;let r={value:1/0},s={key:"surface",value:o.modelElevation};for(const t in a){const e=/^gh-(.+)/.exec(t),o=a[t][n];e&&o&&(o<r.value&&o>i&&(r={key:e[1],value:o}),o>s.value&&o<=i&&(s={key:e[1],value:o}))}const l=a[e+"-"+r.key][n],c=a[e+"-"+s.key][n];return c+(l-c)/(r.value-s.value)*(i-s.value)}function W(t){const{data:e}=t,n=o.get("timestamp");let i=0;for(const t in e.hours){if(e.hours[t]>n)break;i=t}return i}function H(t,e){const n=o.get("lang");return"cs"==("auto"==n?o.get("usedLang"):n)?e:t}function Z(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;")}t.onopen=function(){const t=document.getElementById("open-in-app");t&&(t.style.display="none"),function(){if(Object.keys(d).length)return;fetch("https://pg.vrana.cz/xcontest/pgmapa.php?locale="+H("en","cs")).then((t=>t.json())).then((t=>{const n={};t:for(const e of t.data){e.wind_usable=null!=e.wind_usable_from?[[e.wind_usable_from,e.wind_usable_to]]:e.wind_usable;for(let t=-1;t<=1;t+=2)for(let i=-1;i<=1;i+=2){const o=(e.latitude+t/20).toFixed(1),r=(e.longitude+i/20).toFixed(1);if(n[o+" "+r])for(const t of n[o+" "+r])if(a.isNear(A(t),{lat:e.latitude,lon:e.longitude})){d[t].push(e);continue t}}d[e.latitude+" "+e.longitude]=[e];const t=e.latitude.toFixed(1)+" "+e.longitude.toFixed(1);n[t]=n[t]||[],n[t].push(e.latitude+" "+e.longitude)}l.on("popupclose",(()=>u=null)),v(),e.on("redrawFinished",v)}))}()}}));
