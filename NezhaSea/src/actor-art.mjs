// Battle artwork is painted once to a shared high-density atlas. No paths are tessellated while actors move.
import { Bitmap } from '@egret/engine';

const ink = '#10202c', pearl = '#fff0cb', ivory = '#f5d99d', gold = '#f4b758', lacquer = '#9e242a';
const jade = '#67d7b0', sea = '#295969', ice = '#bff4ff', violet = '#8980bd';
const tau = Math.PI * 2;

function form(g, path, color, edge = ink, width = 1.4) {
  const outline = new Path2D(path);
  if (color) { g.fillStyle = color; g.fill(outline); }
  if (edge && width) { g.strokeStyle = edge; g.lineWidth = width; g.stroke(outline); }
}
function line(g, path, color, width = 1) { form(g, path, null, color, width); }
function oval(g, x, y, rx, ry, color, edge, width = 1) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, tau);
  if (color) { g.fillStyle = color; g.fill(); }
  if (edge) { g.strokeStyle = edge; g.lineWidth = width; g.stroke(); }
}
function colors(g, top, bottom, from, to) {
  const gradient = g.createLinearGradient(0, from, 0, to);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  return gradient;
}
function smallEye(g, x, y, color = pearl) {
  oval(g, x, y, 2.2, 1.6, color, ink, 0.8);
  oval(g, x + 0.5, y + 0.1, 0.72, 0.85, ink);
}
const shadow = (g, x, y, rx, ry) => oval(g, x, y, rx, ry, '#06152095');

function wheelShape(g, x, y, radius) {
  g.save();
  g.translate(x, y);
  g.scale(radius / 12, radius / 12);
  form(g, 'M-9 6 Q-22 -2 -10 -14 Q-13 -5 -4 -10 Q9 -14 9 -5 Q19 3 6 12 Q4 17 -2 9 Q-5 13 -9 6Z', colors(g,'#ffac54','#ae2c34',-12,12), '#411c31');
  oval(g, 0, 0, 8.2, 8.2, '#a4352c', gold, 2);
  line(g, 'M-5 0H5M0 -5V5M-4 -4L4 4M4 -4L-4 4', ivory, 1);
  oval(g, 0, 0, 2.2, 2.2, pearl);
  g.restore();
}

function hero(g, wiggle, variant) {
  const lotus = variant === 'lotus';
  const arms = variant === 'sixArms';
  const coat = lotus ? colors(g, '#b8f2c9', '#348584', -8, 19) : arms ? colors(g, '#cc6040', '#65274e', -10, 21) : colors(g, '#ee5547', lacquer, -10, 22);
  shadow(g, 0, 23, 21, 5);
  g.save(); g.translate(0, wiggle * 1.4);
  line(g, 'M-4 -6 Q-18 -5 -28 -12 Q-39 -21 -37 -8 Q-35 10 -30 9', '#842337', 7);
  line(g, 'M-3 -8 Q-19 -8 -29 -15 Q-39 -23 -37 -8', '#ed6052', 3.2);
  line(g, 'M-24 -12 Q-35 -15 -38 -10 Q-35 -3 -30 2', '#ffc286', 1);
  g.restore();
  if (arms) {
    oval(g, 0, -4, 25, 24, null, '#e9a45b97', 1.25);
    const fan = ['M-5 -5 Q-21 -20 -28 -17', 'M-6 0 Q-24 1 -32 -7', 'M-7 5 Q-19 15 -28 13',
      'M7 -5 Q20 -21 25 -20', 'M7 0 Q22 -3 32 -6', 'M7 4 Q20 13 28 11'];
    g.save(); g.rotate(wiggle * 0.055);
    for (const path of fan) { line(g, path, '#45263b', 6.5); line(g, path, '#e5b187', 3.6); }
    for (const [x,y] of [[-28,-17],[-32,-7],[-28,13],[25,-20],[32,-6],[28,11]]) oval(g,x,y,3,3,gold,'#562b3e');
    line(g, 'M24 -20 L30 -30', gold, 1.4);
    form(g, 'M28 -31L34 -37L34 -29L30 -26Z', '#ffe5a6', '#88393b');
    g.restore();
  }
  if (lotus) {
    for (let i = -2; i <= 2; i++) {
      g.save(); g.translate(i * 8, 19); g.rotate(i * 0.53);
      form(g, 'M-6 8 Q-11 -3 0 -18 Q10 -3 6 8 Q0 13 -6 8Z', colors(g,'#fff6d7','#d5778a',-18,9), '#783d57', 1.15);
      line(g, 'M0 -12Q-1 -1 0 5', '#fff2c99f'); g.restore();
    }
  } else {
    wheelShape(g, -9 - wiggle * 2, 20 + wiggle * 1.2, 8);
    wheelShape(g, 10 + wiggle * 1.5, 20 - wiggle * 1.4, 8.7);
  }
  g.save(); g.rotate(wiggle * 0.085);
  form(g, 'M-9 7 Q-13 18 -8 21 L0 16 L6 21 L11 17 L8 4Z', '#653141');
  g.restore();
  form(g, 'M-13 -7 Q-12 -10 -6 -10 L9 -8 Q16 -4 16 3 L10 6 L12 13 Q2 19 -12 12 L-10 3 L-17 0Z', coat);
  g.save(); g.translate(0, wiggle * 1.5);
  form(g, 'M7 -6 Q17 -8 20 -2 Q22 3 17 6 Q13 6 11 3Z', '#edbd94', '#6f3644', 1.1);
  g.restore();
  line(g, 'M-11 8 Q-1 13 10 8 M-12 -6L-7 -1L-7 4 M11 -2L8 3', '#e8ad63', 1.35);
  oval(g, 3, 9, 3, 2.6, gold, '#683742');
  form(g, 'M-11 -21 Q-11 -34 0 -34 Q12 -32 12 -22 L17 -17 L12 -12 Q5 -7 -3 -11 Q-9 -13 -11 -21Z', colors(g,'#ffdcb7','#d89576',-33,-9), '#503140', 1.3);
  oval(g, -8, -31, 7.6, 7.6, '#171e30', '#72424b', 1.1);
  oval(g, 8, -33, 6.1, 6.1, '#171e30', '#72424b', 1.1);
  form(g, 'M-12 -23Q-15 -31 -6 -34Q6 -38 12 -28L11 -23L7 -28L3 -21L1 -26L-5 -20L-7 -23L-11 -19Z', '#232132', '#342434', 1);
  line(g, 'M-12 -32Q-9 -38 -5 -35 M5 -36Q8 -39 11 -35', '#97576c', 1.45);
  line(g, 'M5 -24 L10 -26', '#622f38', 1.25);
  smallEye(g, 7, -21);
  line(g, 'M9 -15L12 -15', '#994750', 1.1);
  oval(g, -4, -7, 7.1, 3.1, null, gold, 1.65);
  if (lotus) form(g, 'M-2 -33 Q0 -42 3 -36 Q9 -38 8 -34 L4 -30Z', '#ffe6aa', '#87465b', 1);
}

function shrimp(g, pose) {
  form(g, pose > 0 ? 'M-22 -5Q-19 -8 -12 -2L-15 7L-24 10L-21 3L-26 1Z' : 'M-23 -8L-15 -4L-13 3L-21 9L-22 2L-27 -4Z', '#3a8990', '#143746');
  form(g, 'M-15 -4Q-13 -14 -1 -13Q11 -13 17 -6L22 -3L16 3Q8 10 -2 8Q-14 9 -16 3Z', colors(g,'#90e5b8','#397f87',-12,9));
  line(g, 'M-11 -8Q-14 -1 -10 5M-5 -11Q-8 -2 -4 6M1 -12Q-2 -4 2 7', '#235865', 1.3);
  line(g, 'M5 -10Q11 -10 15 -5M-13 -3L-9 -4', '#d8f3c7', 1.4);
  line(g, pose > 0 ? 'M1 7Q-3 10 -4 13M7 6L5 12M12 3L13 8' : 'M0 7L-4 11M6 6Q3 10 2 13M12 4L10 10', '#9ad2a8', 1.25);
  line(g, pose > 0 ? 'M16 -5Q20 -16 29 -14M17 -3Q26 -7 30 -5' : 'M15 -5Q20 -14 29 -17M16 -2Q22 -7 29 -5', '#e9e3a6', 1.0);
  smallEye(g, 13, -5);
}

function crab(g, pose) {
  for(const side of [-1,1]){
    const step = pose * side * 2;
    line(g,'M-12 '+(side*8)+' Q-22 '+(side*(9+step))+' -24 '+(side*15)+' M-8 '+(side*9)+' Q-13 '+(side*18)+' -18 '+(side*17),'#a65b51',3.3);
    g.save();g.translate(12, side * (10 + pose));g.scale(1,side);
    line(g, 'M-5 -3L5 1', '#a7584b',5.5);
    form(g,'M2 -3Q10 -11 16 -5L13 -1L18 3Q16 9 7 8Q0 6 2 -3Z',colors(g,'#f1af82','#943e59',-7,8));
    line(g,'M11 -1L15 2','#ffd0a1',1.25);g.restore();
  }
  form(g, 'M-15 -10Q-4 -18 10 -12L17 -6L16 8Q2 17 -11 10L-17 2Z', colors(g,'#e49677','#7f3f5d',-12,11));
  line(g,'M-11 -9Q0 -13 10 -7 M-12 5Q0 10 12 5 M-7 2L-2 5L2 2','#f4bc92',1.1);
  smallEye(g, 10, -5); smallEye(g, 11, 3);
}

function jelly(g, pose) {
  for (let i = 0; i < 5; i++) {
    const x = -14 + i * 7;
    const flare = pose * (i % 2 === 0 ? 4 : -3);
    line(g, 'M'+x+' 0Q'+(x+flare)+' 9 '+(x-1)+' 14T'+(x+flare)+' '+(24-(i%2)*4),i%2 ? '#dbc9ffb1' : '#80cfffbd',i === 2 ? 2 : 1.5);
  }
  form(g,'M-22 -1Q-21 -14 -12 -19Q-2 -25 11 -18Q20 -13 22 1Q17 10 11 6Q6 10 0 6Q-7 11 -13 5Q-19 8 -22 -1Z',colors(g,'#e9e6ff','#7688c9c9',-18,8),'#275478',1.5);
  line(g,'M-15 -5Q-12 -16 2 -17M10 -15L14 -10','#fcf5ffdc',1.25);
  line(g,'M-14 1Q0 5 16 1','#8deafa',1.45);
  oval(g,-6,-4,2.6,2.9,'#cbe9ff');oval(g,7,-6,1.7,1.9,'#e6d7ff');
}

function shark(g, pose) {
  form(g,pose > 0 ? 'M-15 0L-30 -13L-26 -3L-31 10L-16 6Z' : 'M-15 1L-28 -10L-24 1L-30 13L-16 4Z','#416d95');
  form(g,'M-8 -7L-5 -19L7 -9Q18 -9 25 -4L28 1Q20 11 5 12Q-11 11 -20 4L-19 -4Z',colors(g,'#81a7c9','#293d66',-15,12));
  form(g,'M-8 4 Q6 6 24 1L26 2Q15 13 0 10Z','#b0e0ed',null);
  line(g,'M-13 -5Q0 -6 10 -5 M5 -4l-3 7 M9 -3l-2 6','#8acddc',1.1);
  line(g,'M16 1Q21 4 25 1','#572b44',1.65);
  form(g,'M19 2L21 2L20 5Z M22 2L24 1L23 4Z',pearl,null);
  smallEye(g, 17, -4, '#ffc49d');
}

function puffer(g, pose) {
  for(let i=0;i<12;i++){
    g.save();g.rotate((i+0.1+pose*0.08)*tau/12);
    form(g,'M-3 -12L1 -23L4 -14Z',i%2? '#d0cd6a':'#96aa64', '#425b44', 1);g.restore();
  }
  oval(g,0,0,17,16.5,colors(g,'#deda85','#768f63',-16,17),ink,1.5);
  oval(g,2,7,12,8.4,'#e4dca6');
  for(const [x,y] of [[-8,-4],[-10,0],[-4,-10],[0,-6],[3,-10],[-6,9]]) oval(g,x,y,1.4,1.2,'#7c975f');
  line(g,'M-11 -6Q-4 -15 5 -12','#faf2b5',1.25);smallEye(g,8,-5);
  oval(g,12,4,2.8,2.2,'#d49e7f','#55584b');
}

function conch(g, pose) {
  form(g,'M-19 7Q-14 0 -3 2L6 5Q16 '+(2+pose)+' 23 1L24 8Q17 13 -3 14L-15 12Z',colors(g,'#84ccb5','#376c7d',0,14));
  form(g,'M-15 6Q-19 -6 -12 -14 Q-7 -16 -7 -21L3 -18L10 -11Q22 -9 20 -1Q19 10 7 11L-5 10Z',colors(g,'#fff2bc','#b48d86',-20,12),'#654b5d');
  line(g,'M-6 -17Q-10 -4 -2 1Q6 10 13 3Q18 -5 8 -7Q1 -9 0 -3Q-1 0 3 0 M-13 -8L-9 -1 M4 -15L8 -11','#966c6c',1.3);
  line(g,'M-8 -15Q-5 -17 -1 -15M9 -5Q13 -3 12 0','#fff0d0',1.6);
  smallEye(g,19,5);
}

function yaksha(g, pose) {
  shadow(g,0,37,31,7);
  line(g,'M30 '+(-37+pose*4)+'L28 32', '#462e41',5);
  line(g,'M30 '+(-37+pose*4)+'L28 31', '#dfb271',2.75);
  g.save();g.translate(29, -40+pose*4);
  form(g,'M0 12L-4 2Q-17 -3 -14 -20L-7 -10L-6 0L-1 0L-4 -12L0 -24L5 -12L2 0L8 -2L9 -12L14 -21Q18 -3 4 2Z','#ffdaa0','#704454',1.4);
  line(g,'M0 -18V8M-11 -12L-5 1M12 -13L7 0','#fff4b7',1); g.restore();
  form(g,'M-20 13Q-13 12 -6 19L-9 37L-24 37L-24 27Z M4 18L17 10L20 25L17 37H5Z','#2c304c','#151b2b',2);
  form(g,'M-20 -15Q-14 -22 13 -20L27 -8L24 14L15 22L-14 24L-29 4Z',colors(g,'#b97391','#563354',-16,24),ink,2);
  form(g,'M-30 -9Q-23 -23 -10 -21L-5 -10L-11 2L-28 0Z M10 -19L25 -17L32 -5L21 4L10 -1Z',colors(g,'#c39d6b','#5e5262',-20,4),ink,1.8);
  line(g,'M-26 -9L-13 -16L-10 -9M16 -14L25 -11L27 -5 M-18 12Q1 20 18 9',gold,1.8);
  form(g,'M-15 -26Q-24 -36 -18 -48L-10 -37L1 -40L10 -36L16 -47Q23 -37 17 -22L14 -14L1 -8L-13 -14Z',colors(g,'#87c4b0','#3b647e',-44,-12),ink,1.7);
  form(g,'M-16 -37Q-12 -49 0 -45Q13 -49 16 -37L9 -33L3 -36L-2 -31Z','#754263','#31293e');
  line(g,'M-11 -28L-3 -25M9 -28L4 -25','#2f2a3d',2.7);
  smallEye(g,-6,-24,'#ffcb83');smallEye(g,8,-24,'#ffcb83');
  form(g,'M-8 -15L-5 -22L-1 -14M4 -14L9 -21L10 -16',pearl,'#61404b',0.9);
  line(g,'M-3 -13L4 -13','#f4bba8',1.3);
}

function aoBing(g, pose) {
  shadow(g,-5,22,37,11);
  form(g,'M-27 -16Q-37 -23 -45 -39L-23 -28L-10 -39L-1 -28L15 -39L21 -23L10 -10L-24 -2Z',colors(g,'#c1d9ff','#446d9b',-37,-5));
  form(g,'M-22 -23Q-27 -37 -33 -47L-25 -46L-16 -36L-14 -24M4 -25Q13 -42 23 -47L20 -36L15 -27L14 -22',ivory,'#5b585e',1.4);
  line(g,'M-27 -40L-36 -43M17 -38L27 -41',gold,2);
  form(g,'M-39 -7Q-29 -23 -12 -23Q6 -29 20 -14L38 -9L45 0L40 9L23 11L17 18Q-1 27 -16 19L-26 8L-39 7Z',colors(g,'#dafff0','#4b85ae',-26,26), '#21334e',1.9);
  form(g,'M0 5L16 2L38 5L37 10L21 14L14 19L3 15Z','#e3f4e7','#567586',1);
  line(g,'M21 10L38 7M7 -13L20 -10 L23 -5M-32 -7Q-26 -12 -16 -9','#335a79',2);
  smallEye(g,14,-8,'#ffd58b');oval(g,36,-2,2.5,1.6,'#3f6780');
  line(g,'M-11 -19Q-5 -24 6 -21M-11 0Q-7 2 -7 8M-23 -11L-19 -4M-20 4L-13 10','#bcf6ef',1.5);
  line(g, pose > 0 ? 'M33 2Q45 2 51 -11Q59 -18 61 -15M34 6Q49 7 55 17' : 'M33 2Q47 -1 51 -9Q55 -14 59 -8M34 6Q48 8 58 20', '#efc778',1.55);
  form(g,'M13 12L15 18L18 13 M27 9L30 13L31 9',pearl,'#60808b',0.65);
}

function segment(g) {
  form(g,'M-14 -10L-5 -18L4 -12L16 -9L19 4L9 17L-6 16L-19 8L-21 -5Z',colors(g,'#c6ece9','#6190af',-15,18),'#2b4d70',1.45);
  form(g,'M-11 -8L1 -14L11 -6L7 1L-3 5L-12 1Z','#a9e1df','#7c9fb7');
  line(g,'M-12 7L-4 12L5 9M4 3L12 7M-10 -4L0 -10', '#edf9ee',1.25);
}

function ring(g, divine) {
  oval(g,0,0,14,12.5,'#a2493324',divine ? '#f9be74' : '#b45a43',3.2);
  oval(g,0,0,12.6,11.4,null,'#ffcb75',2.4);
  line(g,'M-11 3Q-14 -7 -3 -11L6 -10','#fff6bc',1.6);
  for (const x of [-13,13]) oval(g,x,0,2.1,2.1,divine?'#b4f5ca':gold,'#7d3d43');
  if(divine)line(g,'M-13 2Q-24 1 -25 12M-12 5Q-18 11 -22 8','#f98761',2.5);
}

function brick(g, divine) {
  form(g,'M-16 -4L-10 -12H10L18 -5L17 7L10 11H-12L-17 5Z',colors(g,'#eec06e','#9d5439',-12,10),'#5d3237',1.45);
  form(g,'M-15 -4L-9 -10L10 -10L15 -5L9 0H-11Z',divine?'#ffe6a5':'#e8a95a','#b2774a');
  line(g,'M-12 2H14 M-8 6H10 M-3 -7L2 -9L7 -6L1 -4L-5 -6','#ffe0a1',1.2);
  if(divine)line(g,'M-18 0Q-26 -9 -21 -14M16 0Q24 -4 22 -11','#ee8554',2.4);
}

function pearlDrop(g, large) {
  const light = large ? '#ffdd8e' : '#ceeaff';
  oval(g,0,0,7.9,7.3,'#9dcddd29');
  oval(g,0,0,5.3,5.4,colors(g,'#fff9de',light,-5,4),'#51819c',0.9);
  oval(g,-1.6,-1.7,1.6,1.4,'#ffffff');
  line(g,'M-8 0H-5 M5 0H8 M0 -8V-5 M0 5V8',light,0.8);
}

function bubble(g, frozen) {
  const body = frozen ? 'M-14 1L-5 -5L9 -1L14 1L1 5L-10 6Z' : 'M-10 3Q-11 -4 -4 -3L3 -5Q11 -4 12 1Q12 6 2 7Z';
  form(g, body, colors(g,frozen?'#e3f8ff':'#9df7e8',frozen?'#659ecf':'#4593af',-6,7),'#28455f',1.2);
  line(g,frozen?'M-8 1L10 1M0 -3L3 1L-2 4':'M0 -3Q8 -4 9 1M-8 3L-4 4',ice,1.1);
}

function arcSlash(g, angle, divine) {
  const sweep = angle * Math.PI / 360;
  g.beginPath();g.arc(0,0,56,-sweep,sweep);g.arc(0,0,44,sweep,-sweep,true);
  g.closePath();g.fillStyle=divine?'#ffa45878':'#fb5f696f';g.fill();
  g.beginPath();g.arc(0,0,54,-sweep,sweep);g.strokeStyle=divine?'#ffdda1':'#ffac87';g.lineWidth=2.4;g.stroke();
  g.beginPath();g.arc(0,0,49,-sweep+0.12,sweep-0.12);g.strokeStyle=divine?'#a1e6af':'#ed705c';g.lineWidth=1.5;g.stroke();
}

function spearSlash(g, divine) {
  form(g,'M1 0L45 -5 L81 -8L92 0L81 8L45 5Z',divine?'#5ec4a94f':'#fba25c58',null);
  form(g,'M5 0L68 -2L76 -5L91 0L76 5L68 2Z',divine?'#f6efbf':'#ffe6aa',null);
  line(g,'M18 -2L68 -4M24 3L61 5',divine?jade:'#fc8461',1.5);
}

function circled(g, color, dim, radius, fire = false) {
  oval(g,0,0,radius-8,radius-8,null,dim,3);
  oval(g,0,0,radius,radius,null,color,2.5);
  for(let i=0;i<8;i++){
    g.save();g.rotate(i*tau/8);
    if(fire) form(g,'M-7 -48Q-8 -53 0 -60Q-3 -52 7 -48Q1 -45 -7 -48Z',dim,null);
    else line(g,'M-4 '+(-radius+1)+'H4 M0 '+(-radius+3)+'V'+(-radius+7),color,1.4);
    g.restore();
  }
}

function aim(g, water = false) {
  form(g,'M8 -8L70 -9L84 0L70 9L8 8Z',water ? '#5dcae03e' : '#ff755c2d',null);
  line(g,'M8 -8L70 -9L84 0L70 9L8 8',water ? '#9ceee6' : '#ff987d',1.6);
  for (const x of [23,44,65]) line(g,'M'+x+' -5L'+(x+6)+' 0L'+x+' 5',water ? ice : '#ffd49b',1.2);
}

function impact(g, divine) {
  oval(g, 0, 0, 45, 45, null, divine ? '#96dccda0' : '#f3a756b4', 3.3);
  for (let i = 0; i < 8; i++) {
    g.save();
    g.rotate(i * tau / 8);
    form(g, 'M-8 -37L-16 -42L0 -56L6 -49L3 -43L13 -36L-2 -40Z',
      divine ? '#ffe8a19c' : '#ffb1619a', null);
    line(g, 'M-7 -36L-4 -47L0 -54', divine ? '#fff3c1' : '#f6d092', 1.25);
    g.restore();
  }
}

function spark(g) {
  form(g,'M0 -16Q2 -4 5 -4L14 -1L5 2Q2 4 0 15L-2 4L-13 2Q-4 0 -4 -3Z','#fbe5b4',null);
  line(g,'M10 -9L12 -13M-11 9L-14 12','#f29e73',1.3);
}

const actors = { shrimp, crab, jelly, shark, puffer, conch, yaksha, aoBing };
const smallSprites = new Set([
  'shrimp', 'crab', 'jelly', 'shark', 'puffer', 'conch',
  'pearl', 'largePearl', 'wheel', 'heavenWheel', 'ring', 'dragonRing', 'brick', 'dragonBrick', 'spit', 'ice'
]);
const sprites = [
  ...['boy','lotus','sixArms'].map((key)=>[key,88,90,(g,pose)=>hero(g,pose,key),2]),
  ...Object.entries(actors).map(([key,draw])=>[key,key==='aoBing'?134:key==='yaksha'?105:68,key==='yaksha'?142:key==='aoBing'?118:60,draw,2]),
  ['dragonSegment',46,44,segment], ['wheel',40,40,(g)=>wheelShape(g,0,0,12)],
  ['heavenWheel',44,44,(g)=>{wheelShape(g,0,0,14); oval(g,0,0,13,13,null,jade,1.0);}],
  ['pearl',22,22,(g)=>pearlDrop(g,false)], ['largePearl',22,22,(g)=>pearlDrop(g,true)],
  ['ring',42,36,(g)=>ring(g,false)], ['dragonRing',56,42,(g)=>ring(g,true)],
  ['brick',48,36,(g)=>brick(g,false)], ['dragonBrick',58,46,(g)=>brick(g,true)],
  ['spit',34,24,(g)=>bubble(g,false)], ['ice',36,24,(g)=>bubble(g,true)],
  ['sweep',128,128,(g)=>arcSlash(g,120,false)], ['dragonSweep',128,128,(g)=>arcSlash(g,160,true)],
  ['thrust',102,28,(g)=>spearSlash(g,false),1,5], ['fireThrust',102,28,(g)=>spearSlash(g,true),1,5],
  ['nova',128,128,(g)=>circled(g,'#ffbc75','#f16f526f',55,true)],
  ['dragonNova',128,128,(g)=>circled(g,'#fff0b0','#73cfad87',55,true)],
  ['impact',120,120,(g)=>impact(g,false)], ['dragonImpact',120,120,(g)=>impact(g,true)],
  ['waterWake',128,128,(g)=>circled(g,'#97eae2b8','#51bec651',53)],
  ['iceWake',128,128,(g)=>circled(g,'#d2f5ff','#678bcc94',54)],
  ['warning',128,128,(g)=>circled(g,'#ff8d72','#e460594e',55)],
  ['aim',92,28,(g)=>aim(g),1,3], ['spitAim',92,28,(g)=>aim(g,true),1,3], ['spark',38,38,spark]
];

function usesSoftwareWebGL(game) {
  if (game.browser.backend !== 'webgl2') return false;
  const gl = game.canvas.getContext('webgl2');
  if (!gl) return false;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = gl.getParameter(info?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER);
  return /swiftshader|llvmpipe|softpipe|lavapipe|software rasterizer|microsoft basic render/i.test(renderer);
}

/** Reduce the same atlas to compact rectangle stamps on known software WebGL renderers. */
function makeStamp(canvas, { bounds, originX, originY }, density, sample) {
  const cols = 11;
  const rows = Math.max(5, Math.round(cols * bounds.height / bounds.width));
  sample.width = cols;
  sample.height = rows;
  const ctx = sample.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, cols, rows);
  const data = ctx.getImageData(0, 0, cols, rows).data;
  const sx = bounds.width / cols, sy = bounds.height / rows;
  const rects = [];
  let previous = new Map();
  const tone = value => Math.min(255, Math.round(value / 38) * 38);
  for (let y = 0; y < rows; y++) {
    const row = new Map();
    for (let x = 0; x < cols;) {
      const start = x, offset = (y * cols + x) * 4;
      const alpha = data[offset + 3] >= 168 ? 1 : data[offset + 3] >= 70 ? 0.62 : 0;
      x++;
      if (!alpha) continue;
      const color = (tone(data[offset]) << 16) | (tone(data[offset + 1]) << 8) | tone(data[offset + 2]);
      for (; x < cols; x++) {
        const next = (y * cols + x) * 4;
        const a = data[next + 3] >= 168 ? 1 : data[next + 3] >= 70 ? 0.62 : 0;
        const c = (tone(data[next]) << 16) | (tone(data[next + 1]) << 8) | tone(data[next + 2]);
        if (a !== alpha || c !== color) break;
      }
      const key = start + ':' + x + ':' + color + ':' + alpha;
      const rect = previous.get(key) ?? { x: start * sx - originX * density, y: y * sy - originY * density, width: (x - start) * sx, height: 0, color, alpha };
      if (!rect.height) rects.push(rect);
      rect.height += sy;
      row.set(key, rect);
    }
    previous = row;
  }
  return rects;
}

export async function createBattleAtlas(game) {
  const density = 2, width = 1024;
  const regions = new Map();
  let x = 0, y = 0, row = 0;
  for (const [key, w, h, draw, count = 1, originX = w / 2] of sprites) {
    const frames = [];
    for (let i = 0; i < count; i++) {
      const bounds = { x, y, width:w*density, height:h*density };
      if (x + bounds.width > width) { x = 0; y += row; row = 0; bounds.x = x; bounds.y = y; }
      frames.push({bounds,draw,pose:i===0?-1:1,originX,originY:h/2});
      x += bounds.width; row = Math.max(row,bounds.height);
    }
    regions.set(key,frames);
  }
  const canvas = Object.assign(document.createElement('canvas'), {width,height:y+row});
  // Egret reads the finished pixels once for the texture. Keep this staging canvas CPU-backed.
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const frames of regions.values()) for (const frame of frames) {
    const { bounds, draw, pose, originX, originY } = frame;
    ctx.save();
    ctx.beginPath();ctx.rect(bounds.x,bounds.y,bounds.width,bounds.height);ctx.clip();
    ctx.translate(bounds.x+originX*density,bounds.y+originY*density);ctx.scale(density,density);
    draw(ctx,pose);
    ctx.restore();
  }
  const stamps = new Map();
  if (usesSoftwareWebGL(game)) {
    const sample = document.createElement('canvas');
    for (const key of smallSprites) {
      const frames = regions.get(key);
      stamps.set(key, frames.map(frame => makeStamp(canvas, frame, density, sample)));
    }
    sample.width = sample.height = 0;
  }
  const lease = await game.browser.textureFromCanvas(canvas);
  canvas.width = canvas.height = 0;
  return {
    density,
    image(key, layer) {
      if (stamps.has(key)) {
        const node = game.sprite(undefined, layer);
        const children = stamps.get(key).map(rects => game.sprite(g => {
          for (const r of rects) g.beginFill(r.color, r.alpha).drawRect(r.x, r.y, r.width, r.height).endFill();
        }, node));
        let pose = 0;
        for (let i = 1; i < children.length; i++) children[i].visible = false;
        return {
          node,
          frame(index) {
            const next = index % children.length;
            if (next === pose) return;
            children[pose].visible = false;
            pose = next;
            children[pose].visible = true;
          }
        };
      }
      const frames = regions.get(key);
      const bitmap = game.scope.use(new Bitmap(lease));
      bitmap.sourceRect = frames[0].bounds;
      bitmap.anchorOffsetX = frames[0].originX*density;
      bitmap.anchorOffsetY = frames[0].originY*density;
      let pose = 0;
      layer.addChild(bitmap);
      return {
        node:bitmap,
        frame(index) {
          const chosen = index % frames.length;
          if (chosen === pose) return;
          pose = chosen;
          bitmap.sourceRect = frames[chosen].bounds;
        }
      };
    }
  };
}
