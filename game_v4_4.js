// v4.4：五單位特色化＋升級系統＋雙關卡（承接 v4.3 基礎）
(() => {
  const cvs = document.getElementById('game');
  const ctx = cvs.getContext('2d');
  const goldEl = document.getElementById('gold');
  const livesEl = document.getElementById('lives');
  const waveEl = document.getElementById('wave');
  const waveMaxEl = document.getElementById('waveMax');
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const banner = document.getElementById('banner');
  const cover = document.getElementById('cover');
  const startBtn = document.getElementById('startBtn');
  const muteCb = document.getElementById('mute');
  const picks = document.querySelectorAll('.pick');
  const pickedEl = document.getElementById('picked');
  const help = document.getElementById('help');
  const helpBtn = document.getElementById('helpBtn');
  const helpClose = document.getElementById('helpClose');

  const upgCard = document.getElementById('upgradeCard');
  const upgName = document.getElementById('upgName');
  const upgLevel = document.getElementById('upgLevel');
  const statAtk = document.getElementById('statAtk');
  const statRate = document.getElementById('statRate');
  const statRange = document.getElementById('statRange');
  const btnAtk = document.getElementById('btnAtk');
  const btnRate = document.getElementById('btnRate');
  const btnSkill = document.getElementById('btnSkill');
  const btnSell = document.getElementById('btnSell');
  const btnClose = document.getElementById('btnClose');
  const upgHint = document.getElementById('upgHint');

  let actx = null;
  function ensureAudio(){ if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)(); }
  function beep(freq=600, dur=0.05, type='square', vol=0.02){
    if(muteCb.checked || !actx) return;
    const o=actx.createOscillator(), g=actx.createGain();
    o.type=type; o.frequency.value=freq; g.gain.value=vol;
    o.connect(g); g.connect(actx.destination);
    o.start(); setTimeout(()=>o.stop(), dur*1000);
  }

  let gold=60, lives=10, score=0, currentWave=0, running=false, paused=false;
  let level=1, waveMax=10;
  let level1Time=0, level2Time=0, levelStart=0;

  const pathLevel1 = [
    {x: 40, y: 280}, {x: 180, y: 280}, {x: 180, y: 140},
    {x: 420, y: 140}, {x: 420, y: 420}, {x: 760, y: 420},
    {x: 900, y: 420}
  ];
  const pathLevel2 = [
    {x: 30, y: 260}, {x: 220, y: 260}, {x: 220, y: 120},
    {x: 420, y: 120}, {x: 420, y: 340}, {x: 640, y: 340},
    {x: 640, y: 200}, {x: 820, y: 200}, {x: 900, y: 200}
  ];
  function getPath(){ return level===1 ? pathLevel1 : pathLevel2; }

  function drawTemple(){
    const x=840,y=level===1?360:300,w=90,h=120;
    ctx.save();
    ctx.fillStyle='#b22222'; ctx.fillRect(x,y,w,h);
    ctx.fillStyle='#ffd166'; ctx.fillRect(x-10,y-20,w+20,20);
    ctx.fillStyle='#222'; ctx.font='14px sans-serif'; ctx.fillText('鹿耳門聖母廟', x-6, y-26);
    ctx.restore();
  }
  function drawPath(){
    const path = getPath();
    ctx.save(); ctx.lineWidth=20; ctx.strokeStyle='#d9c9a1'; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
    for(let i=1;i<path.length;i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke(); ctx.restore();
  }
  function drawBackground(){
    ctx.clearRect(0,0,cvs.width,cvs.height);
    drawPath(); drawTemple();
  }

  const wavesLv1 = [
    { c:8,  hp:8,  sp:1.4, t:'小鬼' },
    { c:10, hp:12, sp:1.3, t:'火球鬼' },
    { c:10, hp:20, sp:1.0, t:'盔甲鬼' },
    { c:12, hp:16, sp:1.5, t:'分裂鬼' },
    { c:1,  hp:45, sp:0.9, t:'頭目' },
    { c:10, hp:22, sp:1.3, t:'小鬼' },
    { c:12, hp:28, sp:1.2, t:'盔甲鬼' },
    { c:14, hp:26, sp:1.4, t:'火球鬼' },
    { c:14, hp:30, sp:1.5, t:'分裂鬼' },
    { c:1,  hp:90, sp:1.0, t:'頭目' },
  ];
  const wavesLv2Base = [
    { c:10, hp:18, sp:1.6, t:'小鬼' },
    { c:12, hp:20, sp:1.7, t:'火球鬼' },
    { c:10, hp:38, sp:1.2, t:'盔甲鬼' },
    { c:12, hp:30, sp:1.8, t:'分裂鬼' },
    { c:1,  hp:120, sp:1.2, t:'頭目' },
  ];
  function getWaves(){
    if(level===1) return wavesLv1;
    return wavesLv2Base.map(w => ({c:w.c, hp:Math.round(w.hp*1.4), sp:w.sp*1.2, t:w.t}));
  }

  const unitImgs = {
    bajia: load('assets/units/八.png'),
    wugong: load('assets/units/蜈.png'),
    baihe: load('assets/units/鶴.png'),
    songjiang: load('assets/units/宋.png'),
    jinshi: load('assets/units/金.png'),
  };
  function load(src){ const img=new Image(); img.src=src; return img; }

  const towerDefs = {
    bajia: { name:'八家將',  cost:20, range:120, rate:60, atk:7, sprite:'bajia',
      traits:{ aoe:40, stun:{chance:0.10, dur:90}, slow:{chance:0.20, pct:0.35, dur:180} },
      upgrades:{ l2:{atkMul:1.2, aoeMul:1.1, stunUp:0.05}, l3:{skill:'seal'} }
    },
    wugong: { name:'蜈蚣陣',  cost:30, range:160, rate:90, atk:5, sprite:'wugong',
      traits:{ chain:3, chainFall:0.8 },
      upgrades:{ l2:{chain:+1, atkMul:1.15}, l3:{skill:'poison'} }
    },
    baihe: { name:'白鶴陣',  cost:15, range:100, rate:30, atk:3, sprite:'baihe',
      traits:{ evade:0.20, vsSplit:1.25 },
      upgrades:{ l2:{rateMul:0.8, evadeUp:0.05}, l3:{skill:'guard'} }
    },
    songjiang: { name:'宋江陣',  cost:25, range:140, rate:60, atk:9, sprite:'songjiang',
      traits:{ pierce:2, vsArmor:1.15, powerShotEvery:5, powerShotBoost:1.5, powerShotLen:1.3 },
      upgrades:{ l2:{pierce:+1, atkMul:1.1}, l3:{skill:'bagua'} }
    },
    jinshi: { name:'金獅陣',  cost:28, range:100, rate:40, atk:8, sprite:'jinshi',
      traits:{ aoe:40, knock:12, vsBoss:1.1 },
      upgrades:{ l2:{aoeMul:1.2, knockUp:8}, l3:{skill:'burn'} }
    },
  };

  const towers=[], enemies=[], bullets=[], popups=[];

  function dist(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.hypot(dx,dy);}
  function nearestPathDist(p){let best=Infinity; for(const n of getPath()) best=Math.min(best,dist(p,n)); return best;}
  function updateHUD(){goldEl.textContent=gold;livesEl.textContent=lives;waveEl.textContent=currentWave;waveMaxEl.textContent=waveMax;scoreEl.textContent=score;levelEl.textContent=level;}

  class Enemy{
    constructor(def){ const path=getPath(); this.x=path[0].x; this.y=path[0].y; this.hp=def.hp; this.maxHp=def.hp; this.sp=def.sp; this.t=def.t; this.i=0; this.dead=false; this.split=false; this.status={stun:0, slow:0, slowPct:0, burn:0, burnDps:0, poison:0, poisonDps:0}; this.poisonStacks=0; this.resist={ cc: (this.t==='頭目')?0.5:0 }; }
    speedEff(){ if(this.status.stun>0) return 0; let v=this.sp; if(this.status.slow>0) v*= (1-(this.status.slowPct||0)); return v; }
    tickStatus(){ if(this.status.stun>0) this.status.stun--; if(this.status.slow>0) this.status.slow--; if(this.status.burn>0){ this.hit(this.status.burnDps/60); this.status.burn--; } if(this.status.poison>0){ this.hit(this.status.poisonDps/120); this.status.poison--; if(this.status.poison===0){ this.poisonStacks=0; this.status.poisonDps=0; } } }
    update(){ const path=getPath(); const t=path[this.i+1]; if(!t){ this.dead=true; lives--; updateHUD(); beep(200,0.08,'sawtooth',0.03); return; } const sp=this.speedEff(); const dx=t.x-this.x, dy=t.y-this.y, d=Math.hypot(dx,dy); if(d<sp){ this.x=t.x; this.y=t.y; this.i++; } else { this.x+=dx/d*sp; this.y+=dy/d*sp; } this.tickStatus(); }
    hit(dmg){ this.hp-=dmg; if(this.hp<=0){ this.dead=true; score+=1; gold+=5; popups.push(new Popup(this.x,this.y-10,'+5金幣')); updateHUD(); if(!this.split && this.t==='分裂鬼'){ this.split=true; for(let i=0;i<2;i++){ const c=new Enemy({hp:8,sp:1.6,t:'小鬼'}); c.x=this.x; c.y=this.y; c.i=this.i; enemies.push(c);} } } }
    draw(){ const colorMap={'小鬼':'#333','火球鬼':'#f97316','盔甲鬼':'#64748b','分裂鬼':'#6b7280','頭目':'#7c3aed'}; ctx.save(); ctx.fillStyle=colorMap[this.t]||'#333'; ctx.beginPath(); ctx.arc(this.x,this.y,this.t==='頭目'?16:10,0,Math.PI*2); ctx.fill(); const bw=this.t==='頭目'?40:26,bh=5; ctx.fillStyle='#900'; ctx.fillRect(this.x-bw/2,this.y-18,bw,bh); ctx.fillStyle='#0a0'; ctx.fillRect(this.x-bw/2,this.y-18,bw*(this.hp/this.maxHp),bh); let icons=''; if(this.status.stun>0) icons+='💫'; if(this.status.slow>0) icons+='🌀'; if(this.status.burn>0) icons+='🔥'; if(this.status.poison>0) icons+='☠'; if(icons){ ctx.fillStyle='#111'; ctx.font='12px sans-serif'; ctx.fillText(icons,this.x-10,this.y-24); } ctx.restore(); }
  }

  class Bullet{
    constructor(x,y,vx,vy,dmg,opts={}){ this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.dmg=dmg; this.dead=false; this.opts=opts; this.lifespan=600; }
    update(){ this.x+=this.vx; this.y+=this.vy; this.lifespan--; if(this.lifespan<=0) this.dead=true;
      for(const e of enemies){ if(e.dead) continue; if(dist(this,e)<12){ applyOnHit(this.opts, e); e.hit(this.dmg * (this.opts.vsType? this.opts.vsType(e):1)); if(this.opts.aoe){ for(const ee of enemies){ if(!ee.dead && ee!==e && dist(ee,e)<=this.opts.aoe){ ee.hit(this.dmg*0.5); } } } if(!this.opts.pierce || --this.opts.pierce<0){ this.dead=true; break; } } }
      if(this.x<0||this.y<0||this.x>cvs.width||this.y>cvs.height) this.dead=true; }
    draw(){ ctx.save(); ctx.fillStyle=this.opts.color||'#111'; ctx.beginPath(); ctx.arc(this.x,this.y,4,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  }

  class Tower{
    constructor(x,y,key){ this.x=x; this.y=y; this.key=key; const d=towerDefs[key]; this.name=d.name; this.base=JSON.parse(JSON.stringify(d)); this.range=d.range; this.rate=d.rate; this.atk=d.atk; this.sprite=unitImgs[d.sprite]; this.cool=0; this.level=1; this.cost=d.cost; this.traits=JSON.parse(JSON.stringify(d.traits||{})); this.shieldCD=0; this.shield=0; this.shots=0; }
    getAtk(){ return this.atk; } getRate(){ return this.rate; } getRange(){ return this.range; }
    update(){ if(this.cool>0){ this.cool--; return; } if(this.key==='baihe'){ if(this.shieldCD>0) this.shieldCD--; }
      let tgt=null,best=1e9; for(const e of enemies){ if(e.dead) continue; const dd=dist(this,e); if(dd<this.getRange() && dd<best){ best=dd; tgt=e; } }
      if(tgt){ const ang=Math.atan2(tgt.y-this.y,tgt.x-this.x), spd=6; let opts={ color:'#111' };
        if(this.key==='bajia'){ opts.color='#eab308'; opts.aoe=this.traits.aoe; opts.stun=this.traits.stun; if(this.level>=3) opts.slow=this.traits.slow; }
        if(this.key==='wugong'){ opts.color='#8b5cf6'; opts.chain=this.traits.chain; opts.chainFall=this.traits.chainFall; opts.sourceDmg=this.getAtk(); }
        if(this.key==='baihe'){ opts.color='#10b981'; opts.vsType=(e)=> e.t==='分裂鬼'?1.25:1; }
        if(this.key==='songjiang'){ opts.color='#ef4444'; opts.pierce=this.traits.pierce; this.shots++; if(this.shots%this.traits.powerShotEvery===0){ opts.pierce+=1; opts.color='#dc2626'; this.atkBoostOnce= (this.base.traits.powerShotBoost||1.5); } }
        if(this.key==='jinshi'){ opts.color='#f97316'; opts.aoe=this.traits.aoe; opts.knock=this.traits.knock; if(this.level>=3) opts.burn=true; opts.vsType=(e)=> e.t==='頭目'?1.1:1; }
        const vx=Math.cos(ang)*spd, vy=Math.sin(ang)*spd;
        const dmg = this.getAtk() * (this.atkBoostOnce||1); this.atkBoostOnce=1;
        bullets.push(new Bullet(this.x,this.y,vx,vy,dmg,opts));
        this.cool=this.getRate(); beep(420,0.03,'square',0.02);
      } }
    draw(){ ctx.save(); if(this.sprite && this.sprite.complete) ctx.drawImage(this.sprite,this.x-16,this.y-28,32,32); else { ctx.fillStyle='#555'; ctx.beginPath(); ctx.arc(this.x,this.y,12,0,Math.PI*2); ctx.fill(); } ctx.strokeStyle='#00000022'; ctx.beginPath(); ctx.arc(this.x,this.y,this.getRange(),0,Math.PI*2); ctx.stroke(); ctx.fillStyle='#000'; ctx.font='12px sans-serif'; ctx.fillText(this.name+' Lv.'+this.level,this.x-22,this.y-16); ctx.restore(); }
    canUpgradeAtk(){ return this.level<3; } canUpgradeRate(){ return this.level<3; } canUpgradeSkill(){ return this.level>=2 && this.level<3; }
    upgradeAtk(){ if(this.level>=3) return false; const mul=(this.level===1? (this.base.upgrades.l2.atkMul||1):1); this.atk = Math.round(this.atk*mul); if(this.base.upgrades.l2.aoeMul && this.traits.aoe){ this.traits.aoe = Math.round(this.traits.aoe*this.base.upgrades.l2.aoeMul); } if(this.base.upgrades.l2.stunUp && this.traits.stun){ this.traits.stun.chance += this.base.upgrades.l2.stunUp; } this.level++; return true; }
    upgradeRate(){ if(this.level>=3) return false; if(this.base.upgrades.l2.rateMul){ this.rate = Math.max(10, Math.round(this.rate*this.base.upgrades.l2.rateMul)); } else { this.rate = Math.max(10, Math.round(this.rate*0.9)); } if(this.base.upgrades.l2.chain && this.traits.chain){ this.traits.chain += this.base.upgrades.l2.chain; } if(this.base.upgrades.l2.evadeUp && this.traits.evade!=null){ this.traits.evade += this.base.upgrades.l2.evadeUp; } this.level++; return true; }
    upgradeSkill(){ if(this.level<2 || this.level>=3) return false; this.level=3; return true; }
  }

  function applyOnHit(opts,e){
    if(opts.stun && Math.random()<opts.stun.chance*(1 - (e.resist.cc||0))){ e.status.stun = Math.max(e.status.stun, opts.stun.dur); }
    if(opts.slow){ e.status.slow = Math.max(e.status.slow, opts.slow.dur); e.status.slowPct = opts.slow.pct; }
    if(opts.burn){ e.status.burn = 180; e.status.burnDps = 3; }
    if(opts.chain && opts.chain>0){
      let jumps=opts.chain-1, current=e, dmg=opts.sourceDmg||5;
      while(jumps>0){
        let target=null, best=1e9;
        for(const ee of enemies){
          if(ee.dead || ee===current) continue;
          const dd = dist(current, ee);
          if(dd<90 && dd<best){ best=dd; target=ee; }
        }
        if(!target) break;
        dmg *= (opts.chainFall||0.8);
        target.hit(dmg);
        applyOnHit({...opts, chain:0}, target);
        current = target; jumps--;
      }
    }
    if(opts.knock){ const ang = Math.atan2(e.y - (e.y-0), e.x - (e.x-0)); e.x += Math.cos(ang)*opts.knock; e.y += Math.sin(ang)*opts.knock; }
  }

  let pickType = null;
  picks.forEach(btn=>btn.addEventListener('click',()=>{ picks.forEach(b=>b.classList.remove('active')); btn.classList.add('active'); pickType=btn.dataset.type; pickedEl.textContent='目前：'+towerDefs[pickType].name; beep(600,0.04,'sine',0.02);}));

  let selected = null;
  cvs.addEventListener('click',ev=>{
    const r=cvs.getBoundingClientRect(); const x=ev.clientX-r.left, y=ev.clientY-r.top;
    for(const t of towers){ if(dist(t,{x,y})<16){ selected=t; openUpgrade(t); return; } }
    if(!running||paused||!pickType) return;
    if(nearestPathDist({x,y})<24) return;
    const def=towerDefs[pickType]; if(gold<def.cost) return;
    gold-=def.cost; updateHUD();
    const t=new Tower(x,y,pickType); towers.push(t);
    beep(300,0.05,'sawtooth',0.02);
  });

  function openUpgrade(t){
    upgName.textContent = t.name;
    upgLevel.textContent = 'Lv.'+t.level;
    statAtk.textContent = t.getAtk();
    statRate.textContent = (t.getRate()/60).toFixed(2)+'s';
    statRange.textContent = t.getRange();
    upgHint.textContent = '花費：攻擊/攻速 約為基礎成本×1.2；特技約×1.6；售出退回70%';
    upgCard.classList.remove('hidden');
  }
  function closeUpgrade(){ upgCard.classList.add('hidden'); selected=null; }
  btnClose.onclick = closeUpgrade;

  btnAtk.onclick = ()=>{
    if(!selected) return;
    const cost = Math.round(towerDefs[selected.key].cost*1.2 + selected.level*5);
    if(gold<cost){ upgHint.textContent='金幣不足（需要 $'+cost+'）'; beep(200,0.05,'sawtooth',0.03); return; }
    if(selected.upgradeAtk()){ gold-=cost; updateHUD(); beep(700,0.04,'sine',0.02); openUpgrade(selected); }
  };
  btnRate.onclick = ()=>{
    if(!selected) return;
    const cost = Math.round(towerDefs[selected.key].cost*1.2 + selected.level*5);
    if(gold<cost){ upgHint.textContent='金幣不足（需要 $'+cost+'）'; beep(200,0.05,'sawtooth',0.03); return; }
    if(selected.upgradeRate()){ gold-=cost; updateHUD(); beep(740,0.04,'sine',0.02); openUpgrade(selected); }
  };
  btnSkill.onclick = ()=>{
    if(!selected) return;
    const cost = Math.round(towerDefs[selected.key].cost*1.6 + selected.level*8);
    if(gold<cost){ upgHint.textContent='金幣不足（需要 $'+cost+'）'; beep(200,0.05,'sawtooth',0.03); return; }
    if(selected.upgradeSkill()){ gold-=cost; updateHUD(); beep(820,0.06,'triangle',0.02); openUpgrade(selected); }
  };
  btnSell.onclick = ()=>{
    if(!selected) return;
    const invested = towerDefs[selected.key].cost * (selected.level===1?1: (selected.level===2? (1+1.2): (1+1.2+1.6)));
    const refund = Math.round(invested * 0.7);
    gold += refund; updateHUD();
    const idx = towers.indexOf(selected); if(idx>=0) towers.splice(idx,1);
    closeUpgrade(); popups.push(new Popup(selected.x, selected.y-10, '+$'+refund));
    beep(300,0.06,'triangle',0.02);
  };

  helpBtn.onclick=()=>help.classList.add('show');
  helpClose.onclick=()=>help.classList.remove('show');

  pauseBtn.onclick=()=>{ if(!running) return; paused=!paused; pauseBtn.textContent=paused?'▶ 繼續':'⏸ 暫停'; };
  resetBtn.onclick=()=>{ banner.classList.remove('show'); banner.innerHTML=''; showCover(); };
  startBtn.onclick=()=>{ ensureAudio(); cover.classList.remove('show'); startLevel(1); };
  function showCover(){ cover.classList.add('show'); running=false; }

  let spawnTimer=0, spawnLeft=0;
  function startLevel(lv){
    level = lv; levelEl.textContent = level;
    const waves = getWaves(); waveMax = waves.length; currentWave = 0;
    gold=60; lives=10; towers.length=0; enemies.length=0; bullets.length=0; popups.length=0; pickType=null; picks.forEach(b=>b.classList.remove('active')); pickedEl.textContent='目前：—';
    levelStart = performance.now();
    running=true; paused=false; pauseBtn.textContent='⏸ 暫停'; updateHUD(); nextWave(); requestAnimationFrame(loop);
  }
  function nextWave(){
    const waves = getWaves();
    currentWave++;
    if(currentWave>waves.length){
      const elapsed = Math.round((performance.now()-levelStart)/1000);
      if(level===1) level1Time = elapsed; else level2Time = elapsed;
      running=false;
      if(level===1){
        banner.innerHTML = '<div class="panel"><div class="big">第一關完成！</div><p>用時：'+formatTime(elapsed)+'</p><button id="goLv2">前往第二關 ▶</button></div>';
        banner.classList.add('show');
        document.getElementById('goLv2').onclick = ()=>{ banner.classList.remove('show'); startLevel(2); };
      }else{
        const total = level1Time + level2Time;
        banner.innerHTML = '<div class="panel"><div class="big">🏆 守護成功！</div><p>第一關：'+formatTime(level1Time)+'</p><p>第二關：'+formatTime(level2Time)+'</p><p><b>通關總時間：'+formatTime(total)+'</b></p><button id="retry">🔁 重新挑戰</button></div>';
        banner.classList.add('show');
        document.getElementById('retry').onclick = ()=>{ banner.classList.remove('show'); showCover(); };
      }
      return;
    }
    updateHUD();
    spawnLeft = waves[currentWave-1].c;
    spawnTimer = 0;
  }
  function formatTime(sec){ const m=Math.floor(sec/60), s=sec%60; return m+' 分 '+s+' 秒'; }

  class Popup{ constructor(x,y,text){ this.x=x; this.y=y; this.text=text; this.life=60; } update(){ this.y-=0.4; this.life--; } draw(){ ctx.save(); ctx.fillStyle='rgba(255,215,0,'+(this.life/60)+')'; ctx.font='14px sans-serif'; ctx.fillText(this.text,this.x,this.y); ctx.restore(); } }

  function loop(){
    drawBackground();
    if(running && !paused){
      const waves = getWaves();
      if(spawnLeft>0){
        if(--spawnTimer<=0){
          const w = waves[currentWave-1];
          enemies.push(new Enemy({hp:w.hp, sp:w.sp, t:w.t}));
          spawnLeft--; spawnTimer=50;
        }
      }
      if(spawnLeft===0 && enemies.length===0){ nextWave(); }
      enemies.forEach(e=>e.update()); towers.forEach(t=>t.update()); bullets.forEach(b=>b.update()); popups.forEach(p=>p.update());
      for(let i=enemies.length-1;i>=0;i--) if(enemies[i].dead) enemies.splice(i,1);
      for(let i=bullets.length-1;i>=0;i--) if(bullets[i].dead) bullets.splice(i,1);
      for(let i=popups.length-1;i>=0;i--) if(popups[i].life<=0) popups.splice(i,1);
      if(lives<=0){
        running=false;
        banner.innerHTML = '<div class="panel"><div class="big">守護失敗…</div><button id="retry">🔁 重新挑戰</button></div>';
        banner.classList.add('show');
        document.getElementById('retry').onclick = ()=>{ banner.classList.remove('show'); showCover(); };
      }
    }
    towers.forEach(t=>t.draw()); enemies.forEach(e=>e.draw()); bullets.forEach(b=>b.draw()); popups.forEach(p=>p.draw());
    requestAnimationFrame(loop);
  }

})();