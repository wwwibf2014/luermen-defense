// 守護鹿耳門聖母廟 Tower Defense v2
(() => {
  const cvs = document.getElementById('game');
  const ctx = cvs.getContext('2d');
  const goldEl = document.getElementById('gold');
  const livesEl = document.getElementById('lives');
  const waveEl = document.getElementById('wave');
  const scoreEl = document.getElementById('score');
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const banner = document.getElementById('banner');
  const muteCb = document.getElementById('mute');

  // 升級面板 UI
  const panel = document.getElementById('panel');
  const panelTitle = document.getElementById('panelTitle');
  const upAtkBtn = document.getElementById('upAtk');
  const upSpdBtn = document.getElementById('upSpd');
  const sellBtn = document.getElementById('sell');
  const atkCostEl = document.getElementById('atkCost');
  const spdCostEl = document.getElementById('spdCost');
  const atkValEl = document.getElementById('atkVal');
  const spdValEl = document.getElementById('spdVal');
  const lvlValEl = document.getElementById('lvlVal');

  // 選單
  const picks = document.querySelectorAll('.pick');
  const pickedEl = document.getElementById('picked');
  let pickType = null;

  // 資源
  let gold = 60;
  let lives = 10;
  let score = 0;

  // 波數設定
  let currentWave = 0;
  const waves = [
    { count: 8, hp: 8, speed: 1.4, type:'小鬼' },
    { count: 10, hp: 12, speed: 1.3, type:'火球鬼' },
    { count: 10, hp: 20, speed: 1.0, type:'盔甲鬼' },
    { count: 12, hp: 14, speed: 1.6, type:'分裂鬼' },
    { count: 1, hp: 85, speed: 0.8, type:'頭目' },
  ];

  // 路線（手繪折線）
  const path = [
    {x: 40, y: 280}, {x: 180, y: 280}, {x: 180, y: 120},
    {x: 420, y: 120}, {x: 420, y: 420}, {x: 760, y: 420},
    {x: 880, y: 420} // 聖母廟前
  ];

  // 圖示顏色 / 造型
  const towerDefs = {
    bajia:     { name:'八家將', cost:20, range:120, rate:60, atk:7, color:'#1f6feb', pierce:0, bonusGhost:1, shield:0 },
    wugong:    { name:'蜈蚣陣', cost:30, range:160, rate:90, atk:5, color:'#8b5cf6', pierce:2, bonusGhost:0, shield:0 },
    baihe:     { name:'白鶴陣', cost:15, range:90,  rate:30, atk:3, color:'#10b981', pierce:0, bonusGhost:0, shield:0 },
    songjiang: { name:'宋江陣', cost:25, range:140, rate:60, atk:9, color:'#ef4444', pierce:0, bonusGhost:0, shield:1 },
  };

  const towers = [];
  const bullets = [];
  const enemies = [];

  // 簡易聲音
  function beep(freq=600, dur=0.05, type='square', vol=0.02){
    if (muteCb.checked) return;
    const actx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.value = vol;
    osc.connect(gain); gain.connect(actx.destination);
    osc.start();
    setTimeout(()=>{osc.stop(); actx.close();}, dur*1000);
  }

  function dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }

  function drawPath(){
    ctx.save();
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#d9c9a1';
    ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for(let i=1;i<path.length;i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function drawTemple(){
    // 鹿耳門聖母廟簡化圖
    const x=840,y=360,w=90,h=120;
    ctx.save();
    ctx.fillStyle='#b22222'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle='#ffd166'; ctx.fillRect(x-10, y-20, w+20, 20);
    ctx.fillStyle='#fff'; ctx.font='14px sans-serif';
    ctx.fillText('鹿耳門聖母廟', x-6, y-26);
    ctx.restore();
  }

  // 物件
  class Enemy {
    constructor(def){
      this.x = path[0].x;
      this.y = path[0].y;
      this.hp = def.hp;
      this.maxHp = def.hp;
      this.speed = def.speed;
      this.type = def.type;
      this.pathIndex = 0;
      this.dead = false;
      this.splitDone = false;
    }
    update(){
      const target = path[this.pathIndex+1];
      if(!target){ // 到達終點
        this.dead = true;
        lives -= 1;
        beep(200, 0.08, 'sawtooth', 0.03);
        return;
      }
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < this.speed){
        this.x = target.x; this.y = target.y; this.pathIndex++;
      } else {
        this.x += this.speed * dx / d;
        this.y += this.speed * dy / d;
      }
    }
    hit(dmg){
      this.hp -= dmg;
      beep(880, 0.03, 'triangle', 0.02);
      if (this.hp <= 0){
        this.dead = true;
        score += 1; gold += 1;
        // 分裂鬼
        if (!this.splitDone && this.type==='分裂鬼'){
          this.splitDone = true;
          for (let i=0;i<2;i++){
            const child = new Enemy({hp:6, speed:1.6, type:'小鬼'});
            child.x = this.x; child.y = this.y; child.pathIndex=this.pathIndex;
            enemies.push(child);
          }
        }
      }
    }
    draw(){
      ctx.save();
      // 敵人體型顏色依型態
      const colorMap = {'小鬼':'#333','火球鬼':'#f97316','盔甲鬼':'#64748b','分裂鬼':'#6b7280','頭目':'#7c3aed'};
      ctx.fillStyle = colorMap[this.type] || '#333';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.type==='頭目'?16:10, 0, Math.PI*2); ctx.fill();
      // 血條
      const bw = this.type==='頭目'?40:26, bh=5;
      ctx.fillStyle='#900';
      ctx.fillRect(this.x - bw/2, this.y-18, bw, bh);
      ctx.fillStyle='#0a0';
      ctx.fillRect(this.x - bw/2, this.y-18, bw*(this.hp/this.maxHp), bh);
      ctx.restore();
    }
  }

  class Bullet {
    constructor(x,y,vx,vy, dmg, pierce=0){
      this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.dmg=dmg; this.pierce=pierce;
      this.dead=false;
    }
    update(){
      this.x+=this.vx; this.y+=this.vy;
      // 碰撞
      for(const e of enemies){
        if(e.dead) continue;
        if (dist(this, e) < 12){
          let extra = 0;
          if (this.ghostBonus && (e.type.includes('鬼')||true)) extra = this.ghostBonus;
          e.hit(this.dmg + extra);
          if (this.pierce>0){ this.pierce--; }
          else { this.dead = true; break; }
        }
      }
      // 出界
      if (this.x<0||this.y<0||this.x>cvs.width||this.y>cvs.height) this.dead=true;
    }
    draw(){
      ctx.save();
      ctx.fillStyle='#111';
      ctx.beginPath(); ctx.arc(this.x, this.y, 4, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  class Tower {
    constructor(x,y,key){
      this.x=x; this.y=y; this.key=key;
      const d = towerDefs[key];
      this.name=d.name; this.range=d.range; this.rate=d.rate; this.atk=d.atk; this.color=d.color;
      this.pierce=d.pierce; this.ghostBonus=d.bonusGhost; this.shield=d.shield; // shield: 1 次免傷
      // 升級
      this.lvAtk=0; this.lvSpd=0; this.baseAtkCost=5; this.baseSpdCost=5;
      this.cool=0;
    }
    update(){
      if (this.cool>0){ this.cool--; return; }
      // 射擊最近的敵人
      let target=null, best=1e9;
      for(const e of enemies){
        if(e.dead) continue;
        const d = dist(this, e);
        if (d< this.range && d<best){ best=d; target=e; }
      }
      if (target){
        const ang = Math.atan2(target.y-this.y, target.x-this.x);
        const spd=6;
        const b = new Bullet(this.x, this.y, Math.cos(ang)*spd, Math.sin(ang)*spd, this.atk, this.pierce);
        b.ghostBonus = this.ghostBonus;
        bullets.push(b);
        this.cool = this.rate - this.lvSpd*6; // 每級縮短冷卻
        beep(420, 0.02, 'square', 0.02);
      }
    }
    draw(){
      ctx.save();
      ctx.fillStyle=this.color;
      ctx.beginPath(); ctx.arc(this.x, this.y, 12, 0, Math.PI*2); ctx.fill();
      // range 圈（淡）
      ctx.strokeStyle=this.color+'55'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.range, 0, Math.PI*2); ctx.stroke();
      // 名稱
      ctx.fillStyle='#000'; ctx.font='12px sans-serif'; ctx.fillText(this.name, this.x-18, this.y-16);
      ctx.restore();
    }
    getAtkCost(){ return this.baseAtkCost + this.lvAtk*5; }
    getSpdCost(){ return this.baseSpdCost + this.lvSpd*5; }
    upgradeAtk(){
      const cost=this.getAtkCost(); if (gold<cost) return false;
      gold-=cost; this.lvAtk++; this.atk += 2; beep(900,0.05,'sine',0.03); return true;
    }
    upgradeSpd(){
      const cost=this.getSpdCost(); if (gold<cost) return false;
      gold-=cost; this.lvSpd++; this.rate = Math.max(18, this.rate-6); beep(700,0.05,'sine',0.03); return true;
    }
  }

  // 放置邏輯
  picks.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      picks.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      pickType = btn.dataset.type;
      pickedEl.textContent = '目前：' + towerDefs[pickType].name;
    });
  });

  cvs.addEventListener('click', (ev)=>{
    const rect = cvs.getBoundingClientRect();
    const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    // 點中塔 -> 打開升級面板
    for(const t of towers){
      if (dist({x,y}, t) < 14){ openPanel(t); return; }
    }
    // 放塔
    if (!pickType) return;
    const def = towerDefs[pickType];
    if (gold < def.cost) return;
    // 不允許放在路徑太近處
    if (nearestPathDist({x,y}) < 24) return;
    gold -= def.cost;
    towers.push( new Tower(x,y,pickType) );
    beep(300,0.05,'sawtooth',0.02);
    updateHUD();
  });

  function openPanel(t){
    panel.classList.remove('hidden');
    panel.dataset.idx = towers.indexOf(t);
    panelTitle.textContent = t.name + '（選取中）';
    atkCostEl.textContent = t.getAtkCost();
    spdCostEl.textContent = t.getSpdCost();
    atkValEl.textContent = t.atk;
    spdValEl.textContent = Math.max(1, Math.round(60/t.rate*10)/10) + '/秒';
    lvlValEl.textContent = (t.lvAtk + t.lvSpd);
  }

  function refreshPanel(){
    const i = +panel.dataset.idx;
    if (Number.isNaN(i) || !towers[i]) { panel.classList.add('hidden'); return; }
    openPanel(towers[i]);
  }

  upAtkBtn.onclick = ()=>{ const i=+panel.dataset.idx; const t=towers[i]; if (t && t.upgradeAtk()) updateHUD(); refreshPanel(); };
  upSpdBtn.onclick = ()=>{ const i=+panel.dataset.idx; const t=towers[i]; if (t && t.upgradeSpd()) updateHUD(); refreshPanel(); };
  sellBtn.onclick = ()=>{
    const i=+panel.dataset.idx; const t=towers[i];
    if (!t) return;
    const def = towerDefs[t.key];
    const spent = def.cost + t.lvAtk*t.getAtkCost() + t.lvSpd*t.getSpdCost(); // 粗略估
    gold += Math.floor(def.cost * 0.7);
    towers.splice(i,1);
    panel.classList.add('hidden');
    updateHUD();
  };

  function nearestPathDist(p){
    // 取折線最近距離（簡化用取各節點最短）
    let best=1e9;
    for(const a of path){
      best = Math.min(best, dist(p,a));
    }
    return best;
  }

  function drawBackground(){
    // 草地
    ctx.fillStyle='#f7f4ea'; ctx.fillRect(0,0,cvs.width,cvs.height);
    drawPath();
    drawTemple();
  }

  let spawnTimer = 0, spawnIndex = 0, waveBreak=0, running=false;

  function startGame(){
    running=true; currentWave=0; gold=60; lives=10; score=0;
    towers.length=0; bullets.length=0; enemies.length=0;
    pickType=null; picks.forEach(b=>b.classList.remove('active')); pickedEl.textContent='目前：—';
    banner.classList.add('hidden');
    spawnTimer=0; spawnIndex=0; waveBreak=0;
    updateHUD();
  }

  function resetGame(){ startGame(); }

  function updateHUD(){
    goldEl.textContent = gold;
    livesEl.textContent = lives;
    waveEl.textContent = Math.min(currentWave, 5);
    scoreEl.textContent = score;
  }

  function step(){
    drawBackground();

    // 波管理
    if (running){
      if (currentWave>=1 && enemies.length===0 && spawnIndex===0 && waveBreak>0){
        waveBreak--;
        if (waveBreak % 60 === 0){
          ctx.save(); ctx.fillStyle='#000';
          ctx.font='18px sans-serif'; ctx.fillText('下一波倒數：'+Math.ceil(waveBreak/60), 20, 28); ctx.restore();
        }
      }

      if (currentWave === 0 || (enemies.length===0 && spawnIndex===0 && waveBreak===0)){
        if (currentWave >= 5){
          running=false;
          banner.textContent='守護成功！🏆';
          banner.classList.remove('hidden');
          beep(1000,0.2,'sine',0.05);
        } else {
          currentWave++;
          waveEl.textContent = currentWave;
          spawnIndex = waves[currentWave-1].count;
          waveBreak = 5*60; // 5 秒倒數顯示（與同時入場）
        }
      }

      // 生成敵人
      if (spawnIndex>0){
        spawnTimer--;
        if (spawnTimer<=0){
          spawnTimer = 50; // 出怪間隔
          const def = waves[currentWave-1];
          const e = new Enemy(def);
          enemies.push(e);
          spawnIndex--;
        }
      }

      // 更新敵人
      for(const e of enemies) e.update();
      // 更新塔
      for(const t of towers) t.update();
      // 更新子彈
      for(const b of bullets) b.update();

      // 清理
      for(const e of enemies){
        if (!e.dead && e.hp<=0) e.dead = true;
      }
      // 頭目護盾與宋江陣格擋（示意：若敵子彈未做，略）
      // 移除死亡敵人
      for(let i=enemies.length-1;i>=0;i--) if (enemies[i].dead) enemies.splice(i,1);
      // 移除消失子彈
      for(let i=bullets.length-1;i>=0;i--) if (bullets[i].dead) bullets.splice(i,1);

      if (lives<=0){
        running=false;
        banner.textContent='守護失敗…再試一次！';
        banner.classList.remove('hidden');
        beep(180,0.2,'sawtooth',0.05);
      }
    }

    // 繪製所有物件
    for(const t of towers) t.draw();
    for(const e of enemies) e.draw();
    for(const b of bullets) b.draw();

    // 顯示資訊
    ctx.save(); ctx.fillStyle='#333'; ctx.font='14px sans-serif';
    ctx.fillText('提示：選取陣頭→點地圖放置；點塔可升級。', 16, cvs.height-12);
    ctx.restore();

    requestAnimationFrame(step);
  }

  startBtn.onclick = startGame;
  resetBtn.onclick = resetGame;

  updateHUD();
  step();
})();