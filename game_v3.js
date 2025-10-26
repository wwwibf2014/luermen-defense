(() => {
const cvs=document.getElementById('game'),ctx=cvs.getContext('2d');
const startBtn=document.getElementById('startBtn'),resetBtn=document.getElementById('resetBtn'),mute=document.getElementById('mute');
let actx=null;function sound(freq=500,dur=0.05){if(mute.checked)return;if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();const o=actx.createOscillator(),g=actx.createGain();o.connect(g);g.connect(actx.destination);o.type='square';o.frequency.value=freq;g.gain.value=0.02;o.start();setTimeout(()=>{o.stop();},dur*1000);}
let gold=50,score=0,wave=0,lives=10,enemies=[],towers=[];const path=[{x:20,y:280},{x:200,y:280},{x:200,y:150},{x:400,y:150},{x:400,y:400},{x:800,y:400},{x:900,y:400}];
const waves=[];for(let i=1;i<=10;i++)waves.push({count:6+i,hp:5+i*2,speed:1+0.1*i});
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
class Enemy{constructor(w){this.x=path[0].x;this.y=path[0].y;this.i=0;this.hp=w.hp;this.speed=w.speed;}
update(){const p=path[this.i+1];if(!p){lives--;this.dead=true;sound(200,0.1);return;}let dx=p.x-this.x,dy=p.y-this.y,d=Math.hypot(dx,dy);if(d<this.speed)this.i++;this.x+=dx/d*this.speed;this.y+=dy/d*this.speed;}
draw(){ctx.fillStyle='red';ctx.beginPath();ctx.arc(this.x,this.y,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='green';ctx.fillRect(this.x-10,this.y-14,20*(this.hp/(waves[wave]?.hp||10)),3);}}
class Tower{constructor(x,y){this.x=x;this.y=y;this.rate=30;this.cool=0;this.atk=3;}
update(){if(this.cool>0)this.cool--;else{let e=enemies.find(e=>!e.dead&&dist(e,this)<120);if(e){e.hp-=this.atk;if(e.hp<=0){e.dead=true;score+=1;gold+=5;sound(800,0.1);}this.cool=this.rate;sound(400,0.03);}}}
draw(){ctx.fillStyle='blue';ctx.beginPath();ctx.arc(this.x,this.y,10,0,Math.PI*2);ctx.fill();}}
function drawPath(){ctx.strokeStyle='#d9c9a1';ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(let i=1;i<path.length;i++)ctx.lineTo(path[i].x,path[i].y);ctx.stroke();}
let spawnTimer=0,spawnLeft=0,running=false;
function startGame(){running=true;gold=50;score=0;wave=0;lives=10;enemies=[];towers=[];loop();}
function nextWave(){if(wave>=10){running=false;alert('守護成功！得分：'+score);return;}wave++;spawnLeft=waves[wave-1].count;spawnTimer=0;}
function loop(){ctx.clearRect(0,0,960,560);drawPath();
if(running){spawnTimer--;if(spawnTimer<=0&&spawnLeft>0){enemies.push(new Enemy(waves[wave-1]));spawnLeft--;spawnTimer=50;}
if(enemies.length==0&&spawnLeft==0)nextWave();
enemies.forEach(e=>e.update());towers.forEach(t=>t.update());
enemies=enemies.filter(e=>!e.dead);if(lives<=0){running=false;alert('守護失敗，請重來');return;}}
enemies.forEach(e=>e.draw());towers.forEach(t=>t.draw());
ctx.fillStyle='#000';ctx.fillText('金幣:'+gold+' 生命:'+lives+' 波:'+wave+'/10 分數:'+score,20,20);
requestAnimationFrame(loop);}
cvs.onclick=e=>{if(!running)return;const r=cvs.getBoundingClientRect();towers.push(new Tower(e.clientX-r.left,e.clientY-r.top));sound(600,0.05);};
startBtn.onclick=()=>{if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();startGame();nextWave();};
resetBtn.onclick=()=>{running=false;startGame();nextWave();};
})();