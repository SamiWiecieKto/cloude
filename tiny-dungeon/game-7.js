(()=>{
const style=document.createElement('style');
style.textContent=`
.runhud{display:flex;gap:5px;align-self:stretch}
.timerbox,.lootbox{background:linear-gradient(#201a20,#110e13);border:1px solid #6b584c;box-shadow:inset 0 0 12px #0008;border-radius:7px;padding:4px 8px;font-size:10px}
.timerbox{min-width:74px;text-align:center}.timerbox span,.lootbox .ltitle{display:block;color:#a99891;font-size:8px;text-transform:uppercase;letter-spacing:.08em}.timerbox b{font:800 15px ui-monospace,SFMono-Regular,Menlo,monospace;color:#f1d69b}
.lootbox{display:flex;align-items:center;gap:7px;min-width:205px}.lootbox .ltitle{margin-right:2px}.lootcounts{display:flex;gap:8px;align-items:center}.lootcount{display:flex;align-items:center;gap:3px;font-weight:800;white-space:nowrap}.lootgem{width:11px;height:11px;transform:rotate(45deg);border:1px solid #fff5;box-shadow:0 0 7px currentColor}.lootcount b{font-size:11px;color:#eee}.lootcount small{font-size:9px;color:#aaa}
@media(max-width:800px){.runhud{gap:3px}.timerbox,.lootbox{padding:3px 5px}.timerbox{min-width:62px}.timerbox b{font-size:12px}.lootbox{min-width:auto;gap:4px}.lootbox .ltitle{display:none}.lootcounts{gap:5px}.lootgem{width:9px;height:9px}.lootcount b{font-size:9px}.lootcount small{font-size:8px}}
`;
document.head.appendChild(style);

const hud=document.createElement('div');hud.className='runhud';hud.innerHTML=`<div class="timerbox"><span>Czas gry</span><b id="runTimer">00:00</b></div><div class="lootbox"><span class="ltitle">Zebrany loot</span><div class="lootcounts"><span class="lootcount" title="Standardowy"><i class="lootgem" style="background:${RAR.standard.c};color:${RAR.standard.c}"></i><small>x</small><b id="lootStandard">0</b></span><span class="lootcount" title="Rzadki"><i class="lootgem" style="background:${RAR.rare.c};color:${RAR.rare.c}"></i><small>x</small><b id="lootRare">0</b></span><span class="lootcount" title="Epicki"><i class="lootgem" style="background:${RAR.epic.c};color:${RAR.epic.c}"></i><small>x</small><b id="lootEpic">0</b></span><span class="lootcount" title="Legendarny"><i class="lootgem" style="background:${RAR.legendary.c};color:${RAR.legendary.c}"></i><small>x</small><b id="lootLegendary">0</b></span></div></div>`;
const stats=document.querySelector('.stats');if(stats)stats.insertAdjacentElement('afterend',hud);else document.querySelector('.top')?.appendChild(hud);

let runStarted=0,lastElapsed=0,counts={standard:0,rare:0,epic:0,legendary:0};
function fmt(ms){let s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`}
function paint(){document.querySelector('#runTimer').textContent=fmt(p&&runStarted?performance.now()-runStarted:lastElapsed);document.querySelector('#lootStandard').textContent=counts.standard;document.querySelector('#lootRare').textContent=counts.rare;document.querySelector('#lootEpic').textContent=counts.epic;document.querySelector('#lootLegendary').textContent=counts.legendary}
function resetRun(){runStarted=performance.now();lastElapsed=0;counts={standard:0,rare:0,epic:0,legendary:0};paint()}
const startBtn=document.querySelector('#startBtn');startBtn?.addEventListener('click',()=>setTimeout(resetRun,0));
const originalApplyLoot=applyLoot;applyLoot=function(d){originalApplyLoot(d);if(d&&counts[d.rar]!==undefined){counts[d.rar]++;paint()}};
setInterval(()=>{if(p&&runStarted){lastElapsed=performance.now()-runStarted;paint()}},250);
paint();
})();