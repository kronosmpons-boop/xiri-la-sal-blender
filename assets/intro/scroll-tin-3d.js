import * as THREE from 'three';
import { GLTFLoader } from '/assets/intro/vendor/GLTFLoader.js';
import { RoomEnvironment } from '/assets/intro/vendor/RoomEnvironment.js';

const $ = selector => document.querySelector(selector);
const host=$('.tin-object'), intro=$('.tin-intro'), spacer=$('.tin-spacer');
const website=$('.tin-website'), slot=$('.tin-web-slot'), status=$('.tin-status');
const portal=$('.tin-portal-window'),portalFrame=$('.tin-portal-frame');
// The preview iframe only loads on the 3D path (markup carries data-src, so weak devices never fetch it)
if(portalFrame&&!portalFrame.getAttribute('src')&&portalFrame.dataset.src)portalFrame.src=portalFrame.dataset.src;
const title=$('.tin-heading'), hint=$('.tin-hint');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const xiriLoader=$('#xiri-loader');
function dismissLoader(){if(xiriLoader){xiriLoader.classList.add('out');setTimeout(()=>xiriLoader.remove(),500);}}
website.inert=!reduced.matches;
const smooth=(a,b,p)=>THREE.MathUtils.smoothstep(p,a,b);
let renderer,scene,camera,pivot,mixer,clip,action,environment,pmrem;
let ringControl;
let titleRenderer,titleScene,titleCamera,letters,titleWidth=1;
let progress=0,target=0,frame=0,failed=false,width=0,height=0,viewHeight=8.8;
let finished=false,travel=1,siteHeight=1000;
let siteStarted=false;
const startPosition=new THREE.Vector3(7,10,9),endPosition=new THREE.Vector3(0,14,.001);
const startLook=new THREE.Vector3(0,1.45,0),endLook=new THREE.Vector3(0,.8,0);
const interior=[[-1.29,.79,-1.74],[1.29,.79,-1.74],[1.29,.79,2.01],[-1.29,.79,2.01]].map(p=>new THREE.Vector3(...p));

function startWebsite(){
  const ready=()=>{
    requestAnimationFrame(()=>{
      if(!siteStarted){siteStarted=true;dispatchEvent(new CustomEvent('xiri:intro-ready'));}
      else window.ScrollTrigger?.refresh();
    });
  };
  if(document.readyState==='complete')ready();
  else addEventListener('load',ready,{once:true});
}

function restoreSite(){
  finished=true;intro.classList.add('tin-finished');website.classList.add('tin-live');
  portal.style.visibility='hidden';
  website.inert=false;website.removeAttribute('aria-hidden');
  slot.style.minHeight='';
  startWebsite();
}
function fallback(error){
  console.error('Xiri La Sal:',error);failed=true;
  spacer.style.height='0px';dismissLoader();restoreSite();
  if(frame)cancelAnimationFrame(frame);
}
function measureSite(){
  siteHeight=Math.max(innerHeight,website.scrollHeight);
  if(!finished)slot.style.minHeight=`${siteHeight}px`;
}
function measureScroll(){
  travel=Math.max(1,spacer.offsetHeight);
  target=reduced.matches?1:THREE.MathUtils.clamp(scrollY/travel,0,1);
  if(reduced.matches){progress=1;restoreSite();return;}
  schedule();
}
function resize(){
  width=innerWidth;height=innerHeight;
  if(renderer){
    const aspect=width/height;viewHeight=Math.max(8.8,(width<600?7.2:6.3)/aspect);
    camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;
    camera.top=viewHeight/2;camera.bottom=-viewHeight/2;
    camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setSize(width,height);
  }
  if(titleRenderer){
    const tw=title.clientWidth,th=title.clientHeight;
    const a=tw/th;const h=Math.max(1.9,(titleWidth+.45)/a);
    titleCamera.left=-h*a/2;titleCamera.right=h*a/2;titleCamera.top=h/2;titleCamera.bottom=-h/2;
    titleCamera.updateProjectionMatrix();titleRenderer.setPixelRatio(Math.min(devicePixelRatio,2));titleRenderer.setSize(tw,th,false);
  }
  measureSite();measureScroll();
}
function schedule(){if(!frame&&!failed&&renderer&&!document.hidden)frame=requestAnimationFrame(render);}

function matrixForQuad(p,w,h){
  const [p0,p1,p2,p3]=p;
  const dx1=p1.x-p2.x,dx2=p3.x-p2.x,dx3=p0.x-p1.x+p2.x-p3.x;
  const dy1=p1.y-p2.y,dy2=p3.y-p2.y,dy3=p0.y-p1.y+p2.y-p3.y;
  const den=dx1*dy2-dx2*dy1;
  const g=Math.abs(den)<1e-8?0:(dx3*dy2-dx2*dy3)/den;
  const hh=Math.abs(den)<1e-8?0:(dx1*dy3-dx3*dy1)/den;
  const a=p1.x-p0.x+g*p1.x,b=p3.x-p0.x+hh*p3.x;
  const d=p1.y-p0.y+g*p1.y,e=p3.y-p0.y+hh*p3.y;
  return `matrix3d(${a/w},${d/w},0,${g/w},${b/h},${e/h},0,${hh/h},0,0,1,0,${p0.x},${p0.y},0,1)`;
}
function render(time){
  frame=0;if(!mixer||failed||document.hidden)return;
  progress=THREE.MathUtils.lerp(progress,target,.18);
  if(Math.abs(progress-target)<.00015)progress=target;
  const done=progress===1;
  if(done!==finished){
    finished=done;
    intro.classList.toggle('tin-finished',done);website.classList.toggle('tin-live',done);
    portal.style.visibility=done?'hidden':'visible';
    website.inert=!done;website.setAttribute('aria-hidden',String(!done));
    slot.style.minHeight=done?'':`${siteHeight}px`;
    if(done)startWebsite();
  }
  if(done){return;}
  const opening=THREE.MathUtils.clamp(progress/.58,0,1);
  action.paused=false;action.enabled=true;mixer.setTime(opening*(clip.duration-.00001));
  // Once the lid starts rolling, the ring is occluded. Hide its entire group
  // before its baked path intersects the sheet; reverse scroll restores it.
  if(ringControl)ringControl.visible=opening<=.10;
  host.dataset.ring=ringControl?.visible?'visible':'hidden';
  const zoom=smooth(.57,.98,progress);
  camera.position.lerpVectors(startPosition,endPosition,zoom);
  camera.up.set(0,1-zoom,-zoom).normalize();
  camera.lookAt(new THREE.Vector3().lerpVectors(startLook,endLook,zoom));
  camera.zoom=THREE.MathUtils.lerp(1,width<600?2.35:2.9,zoom*zoom);
  camera.updateProjectionMatrix();camera.updateMatrixWorld();
  pivot.rotation.y=THREE.MathUtils.lerp(-.07,0,zoom);
  pivot.position.y=.25+(1-zoom)*Math.sin(time*.0006)*.025;
  pivot.updateMatrixWorld(true);
  renderer.render(scene,camera);
  const titleFade=1-smooth(.35,.60,progress);
  title.style.opacity=titleFade;title.style.transform=`translateY(${-70*smooth(.35,.62,progress)}px)`;
  hint.style.opacity=1-smooth(0,.1,progress);
  host.dataset.progress=String(Math.round(progress*100));
  // Reveal the page immediately behind the moving peel front, instead of
  // waiting until the lid is almost fully rolled up.
  const reveal=smooth(.025,.075,progress);
  const exposed=THREE.MathUtils.clamp((4.51*opening-.30)/3.75,0,1);
  const handoff=smooth(.94,.995,progress);
  website.style.clipPath='none';
  website.style.transform='none';
  website.style.opacity=handoff;
  portal.style.opacity=reveal*(1-handoff);
  website.dataset.phase=exposed===0?'opening':progress<.75?'inside':'entering';
  website.style.borderRadius='0px';
  const morph=smooth(.78,1,progress);
  const fullscreen=[{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}];
  const points=interior.map((v,i)=>{
    const p=v.clone().applyMatrix4(pivot.matrixWorld).project(camera);
    const x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height;
    return {x:THREE.MathUtils.lerp(x,fullscreen[i].x,morph),y:THREE.MathUtils.lerp(y,fullscreen[i].y,morph)};
  });
  const previewWidth=Math.min(width,480);
  const previewHeight=previewWidth*3.75/2.58;
  const layout=smooth(.78,.97,progress);
  const pw=Math.round(THREE.MathUtils.lerp(previewWidth,width,layout));
  const ph=Math.round(THREE.MathUtils.lerp(previewHeight,height,layout));
  portal.style.width=`${pw}px`;portal.style.height=`${ph}px`;
  // Show the start of the page as soon as a strip of the tin is exposed.
  // Translate the content with the reveal boundary rather than showing the
  // bottom of a clipped desktop screenshot.
  const concealed=(1-exposed)*ph;
  portal.style.clipPath=`inset(${concealed}px 0 0 0 round ${12*(1-exposed)}px)`;
  portalFrame.style.transform=`translateY(${concealed}px)`;
  portal.style.transform=matrixForQuad(points,pw,ph);
  host.style.opacity=1-smooth(.85,1,progress);
  if(letters&&titleFade>.001){
    letters.rotation.y=-.11+Math.sin(time*.0004)*.015;
    letters.rotation.x=.085;titleRenderer.render(titleScene,titleCamera);
  }
  if(target<1||Math.abs(progress-target)>.00001)schedule();
}

async function setupLettering(){
  const response=await fetch('/assets/intro/menu-lettering.json');
  if(!response.ok)throw new Error('No s’han pogut carregar les lletres');
  const data=await response.json();
  titleRenderer=new THREE.WebGLRenderer({canvas:$('.tin-lettering'),alpha:true,antialias:true});
  titleRenderer.outputColorSpace=THREE.SRGBColorSpace;titleRenderer.toneMapping=THREE.NoToneMapping;
  titleScene=new THREE.Scene();titleCamera=new THREE.OrthographicCamera(-6,6,1,-1,.1,50);titleCamera.position.set(0,0,12);
  letters=new THREE.Group();titleScene.add(letters);
  const face=new THREE.MeshStandardMaterial({color:0xff3000,roughness:.4,metalness:.05});
  const side=new THREE.MeshStandardMaterial({color:0xa92005,roughness:.34,metalness:.16});
  const all=data.glyphs;let cursor=0;
  all.forEach((glyph,index)=>{
    if(index===4||index===6)cursor+=.32;
    const shapes=glyph.shapes.map(rings=>{
      const shape=new THREE.Shape(rings[0].map(([x,y])=>new THREE.Vector2(x,y)));
      for(const ring of rings.slice(1))shape.holes.push(new THREE.Path(ring.map(([x,y])=>new THREE.Vector2(x,y))));
      return shape;
    });
    const geometry=new THREE.ExtrudeGeometry(shapes,{depth:.24,bevelEnabled:true,bevelThickness:.018,bevelSize:.005,bevelSegments:3,curveSegments:6,steps:1});
    const letter=new THREE.Mesh(geometry,[face,side]);letter.position.set(cursor,-.5,0);letters.add(letter);
    cursor+=glyph.width+.075;
  });
  titleWidth=cursor-.075;letters.position.x=-titleWidth/2;
  titleScene.add(new THREE.HemisphereLight(0xffffff,0xc77e59,2.2));
  const light=new THREE.DirectionalLight(0xffffff,2.3);light.position.set(-5,5,8);titleScene.add(light);
}

async function init(){
  if(reduced.matches){dismissLoader();restoreSite();return;}
  try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.80;
    host.append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
    renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback(new Error('Context WebGL perdut'));});
    scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-6,6,5,-5,.1,100);
    pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();
    environment=pmrem.fromScene(room,.025);scene.environment=environment.texture;scene.environmentIntensity=.8;room.dispose();
    scene.add(new THREE.HemisphereLight(0xfff7ea,0x5b6969,.45));
    const key=new THREE.DirectionalLight(0xfff4df,1.2);key.position.set(-5,8,5);scene.add(key);
    const rim=new THREE.DirectionalLight(0xdcecff,.75);rim.position.set(4,4,-5);scene.add(rim);
    const [gltf]=await Promise.all([new GLTFLoader().loadAsync('/assets/intro/xiri-la-sal.glb'),setupLettering()]);
    pivot=new THREE.Group();pivot.add(gltf.scene);scene.add(pivot);
    ringControl=gltf.scene.getObjectByName('Control_anella');
    if(!ringControl)ringControl=gltf.scene.getObjectByName('Control anella');
    mixer=new THREE.AnimationMixer(gltf.scene);clip=gltf.animations[0];if(!clip)throw new Error('Falta l’animació');
    action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
    gltf.scene.traverse(ob=>{
      if(!ob.isMesh)return;ob.frustumCulled=false;
      const materials=Array.isArray(ob.material)?ob.material:[ob.material];
      for(const m of materials){
        if(m.name==='Impressió original XIRI LA SAL'){
          // One continuous animated mesh: printed outside, aluminium inside.
          // A second offset sheet is unnecessary and can read as another lid.
          m.side=THREE.DoubleSide;m.roughness=.42;
          m.onBeforeCompile=shader=>{
            shader.fragmentShader=shader.fragmentShader
              .replace('#include <map_fragment>',`#include <map_fragment>
                if(!gl_FrontFacing) diffuseColor.rgb=vec3(.67,.73,.75);`)
              .replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
                if(!gl_FrontFacing) metalnessFactor=.92;`)
              .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
                if(!gl_FrontFacing) roughnessFactor=.29;`);
          };
        }
        if(m.name==='Alumini raspallat'){
          m.roughness=.29;
          m.onBeforeCompile=shader=>{
            shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\n float grain=fract(sin(dot(vViewPosition.xy*vec2(850.0,42.0),vec2(12.9898,78.233)))*43758.5453);\n roughnessFactor=clamp(roughnessFactor+(grain-.5)*.065,.18,.5);`);
          };
        }
      }
    });
    resize();progress=target;host.classList.add('ready');host.dataset.state='loaded';status.hidden=true;dismissLoader();schedule();
  }catch(error){fallback(error);}
}
const siteObserver=new ResizeObserver(()=>{measureSite();});siteObserver.observe(website);
let resizeTimer=0,lastWidth=innerWidth;
// Mobile URL-bar show/hide fires 'resize' with only the height changing. Coalesce it into one
// re-measure instead of re-allocating both WebGL drawing buffers on every event.
function onResize(){clearTimeout(resizeTimer);if(innerWidth!==lastWidth){lastWidth=innerWidth;resize();return;}resizeTimer=setTimeout(resize,200);}
addEventListener('scroll',measureScroll,{passive:true});addEventListener('resize',onResize,{passive:true});
reduced.addEventListener('change',()=>{if(reduced.matches){progress=1;restoreSite();}else if(!renderer)init();else measureScroll();});
$('.tin-skip').addEventListener('click',event=>{event.preventDefault();window.scrollTo({top:travel,behavior:'instant'});progress=target=1;restoreSite();});
addEventListener('visibilitychange',schedule);
// The module is now imported dynamically, so 'load' may already have fired
const onLoad=()=>{
  measureSite();resize();
  const restore=window.__xiriRestore;
  if(restore){
    delete window.__xiriRestore;
    progress=target=1;restoreSite();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const section=document.getElementById(restore.id);
      if(!section)return;
      const html=document.documentElement,curtain=html.classList.contains('cortina');
      if(curtain)html.classList.remove('cortina');
      const y=section.getBoundingClientRect().top+scrollY+restore.dy;
      if(curtain)html.classList.add('cortina');
      window.scrollTo({top:y,behavior:'instant'});
    }));
    return;
  }
  const anchor=location.hash&&document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if(anchor&&website.contains(anchor)){
    progress=target=1;restoreSite();
    requestAnimationFrame(()=>{anchor.scrollIntoView();window.scrollBy(0,-($('#nav')?.offsetHeight||0));});
  }
};
if(document.readyState==='complete')onLoad();else addEventListener('load',onLoad,{once:true});
addEventListener('pagehide',event=>{if(event.persisted)return;failed=true;cancelAnimationFrame(frame);siteObserver.disconnect();
  for(const sc of [scene,titleScene])sc?.traverse(ob=>{ob.geometry?.dispose();for(const m of ob.material?(Array.isArray(ob.material)?ob.material:[ob.material]):[]){m.map?.dispose();m.dispose();}});
  environment?.dispose();pmrem?.dispose();renderer?.dispose();titleRenderer?.dispose();
});
measureScroll();init();
