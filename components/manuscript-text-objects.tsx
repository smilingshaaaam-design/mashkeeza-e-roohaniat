'use client'
import React, { useId, useMemo } from 'react'
import { manuscriptFontLinks } from './manuscript-fonts'
const limits = {"x":[0,100,50],"y":[0,100,20],"page":[0,499,0],"size":[50,350,100],"sx":[30,250,100],"sy":[30,250,100],"rotate":[-180,180,0],"skew":[-45,45,0],"curve":[-100,100,0],"weight":[300,900,400],"opacity":[20,100,100],"spacing":[-5,15,0],"stroke":[0,3,0],"glow":[0,12,0],"z":[1,20,5]} as const
type NumberKey = keyof typeof limits
const fonts = new Set(['nastaliq','gulzar','naskh','system','amiri','aref-ruqaa','aref-ruqaa-ink','scheherazade','lateef','harmattan','noto-sans-arabic','noto-kufi-arabic','markazi','mirza','katibeh','rakkas','lalezar','reem-kufi','reem-kufi-ink','reem-kufi-fun','cairo','tajawal','ibm-plex-arabic','vazirmatn'])
export type ManuscriptText = Record<NumberKey,number> & { text:string; font:string; color:string; shape:string; effect:string; mode:string; italic:boolean; underline:boolean; strike:boolean; highlight:string }
export function readManuscriptText(body?:string|null): ManuscriptText[] {
  if (!body || typeof window==='undefined' || !body.includes('data-ms-object')) return []
  const doc=new DOMParser().parseFromString(body,'text/html')
  return Array.from(doc.querySelectorAll('span[data-ms-object="text"]')).slice(0,200).map(el=>{
    const numbers={} as Record<NumberKey,number>
    for(const key of Object.keys(limits) as NumberKey[]){const [min,max,fallback]=limits[key];const raw=el.getAttribute('data-to-'+key);const n=raw===null?fallback:Number(raw);numbers[key]=Number.isFinite(n)&&(key==='x'||key==='y'||Number.isInteger(n))&&n>=min&&n<=max?n:fallback}
    const color=el.getAttribute('data-to-color')||'#4d2b13',font=el.getAttribute('data-ms-font')||'nastaliq',shape=el.getAttribute('data-to-shape')||'plain',effect=el.getAttribute('data-ms-ink')||'normal',mode=el.getAttribute('data-to-mode')||'book'
    return {...numbers,italic:el.getAttribute('data-ms-italic')==='1',underline:el.getAttribute('data-ms-underline')==='1',strike:el.getAttribute('data-ms-strike')==='1',highlight:/^#[0-9a-f]{6}$/i.test(el.getAttribute('data-ms-highlight')||'')?el.getAttribute('data-ms-highlight')!:'transparent',text:(el.textContent||'').slice(0,1200),font:fonts.has(font)?font:'nastaliq',color:/^#[0-9a-f]{6}$/i.test(color)?color:'#4d2b13',shape:['plain','oval','circle','ribbon','arch'].includes(shape)?shape:'plain',effect:['normal','ancient','faded','gold','maroon'].includes(effect)?effect:'normal',mode:['book','roller','simple'].includes(mode)?mode:'book'}
  }).filter(o=>o.text.trim())
}

// Independently positioned, page-relative image objects use the existing media store.
// Other reading modes continue showing these images inline rather than losing them.
const bookImageMask = {"right":"polygon(5% 7.5%,52% 7.5%,60% 10%,64% 13%,69% 18%,76% 23%,79% 30%,82% 37%,84% 44%,84% 55%,83% 60%,80% 65%,76% 70%,73% 74%,68% 77%,60% 78%,46% 77.5%,34% 78%,25% 80%,23% 83.5%,5% 84%)","left":"polygon(47% 7.5%,91% 7.5%,91% 39%,94% 44%,95% 58%,95% 84%,47% 84%,39% 81%,32% 77%,26% 73%,23% 68%,20% 62%,18% 56%,17.5% 45%,18% 37%,21% 30%,25% 24%,31% 18%,38% 13%,43% 10%)"} as const
type ManuscriptImage={src:string;alt:string;page:number;x:number;y:number;w:number;h:number;effect:string;opacity:number}
export function readManuscriptImages(body?:string|null):ManuscriptImage[]{
  if(!body||typeof window==='undefined'||!body.includes('data-ms-object'))return []
  const doc=new DOMParser().parseFromString(body,'text/html')
  return Array.from(doc.querySelectorAll('img[data-ms-object="image"]')).slice(0,200).flatMap(el=>{
    const src=el.getAttribute('src')||''
    if(!/^https:\/\/mashkeeza-cms-api\.smilingshaaaam\.workers\.dev\/media\/[0-9a-f-]{36}$/.test(src))return []
    const n=(key:string,min:number,max:number,fallback:number)=>{const a=el.getAttribute(key),v=a===null?fallback:Number(a);return Number.isFinite(v)&&v>=min&&v<=max?v:fallback}
    const effect=el.getAttribute('data-effect')||'original'
    return [{src,alt:(el.getAttribute('alt')||'').slice(0,200),page:Math.floor(n('data-to-page',0,499,0)),x:n('data-to-x',0,100,50),y:n('data-to-y',0,100,50),w:n('data-to-w',2,100,30),h:n('data-to-h',2,100,25),effect:['original','ink','antique','faded','impose'].includes(effect)?effect:'original',opacity:n('data-opacity',30,100,100)}]
  })
}
const imageFilter=(effect:string)=>effect==='impose'?'grayscale(1) sepia(.85) contrast(1.25) brightness(1.14)':effect==='ink'?'grayscale(1) contrast(1.25) sepia(.55)':effect==='antique'?'sepia(.72) saturate(.72) contrast(1.04)':effect==='faded'?'sepia(.8) saturate(.55) contrast(.85)':undefined

// Render a real SVG text path, not an image or glyph-by-glyph outlines.
function CurvedUnicode({text,curve}:{text:string;curve:number}){
  const id=useId().replace(/:/g,'-')
  const count=Array.from(text.replace(/[\u064b-\u065f\u0670\u200c\u200d]/g,'')).length
  const width=Math.max(450,count*85+240),bend=curve*2.5
  const height=380+Math.abs(bend),mid=height/2
  const path='M 100 '+mid+' Q '+width/2+' '+(mid-bend)+' '+(width-100)+' '+mid
  return <svg className="ms-curve-svg" viewBox={'0 0 '+width+' '+height} style={{width:width/100+'em',maxWidth:'100%',height:'auto'}} xmlns="http://www.w3.org/2000/svg">
    <defs><path id={id} d={path}/></defs>
    <text fontSize={100} fill="currentColor" textAnchor="middle" direction="rtl" lang="ur"><textPath href={'#'+id} startOffset="50%">{text}</textPath></text>
  </svg>
}
export function ManuscriptTextLayer({body,mode,page=0,side}:{body?:string|null;mode:'book'|'roller'|'simple';page?:number;side?:'left'|'right'}) {
  const objects=useMemo(()=>readManuscriptText(body),[body])
  const images=useMemo(()=>readManuscriptImages(body),[body])
  const visibleImages=mode==='book'?images.filter(o=>o.page===page):[]
  const links=useMemo(()=>manuscriptFontLinks(body||''),[body])
  const visible=objects.filter(o=>mode==='book'?o.page===page:true)
  if(!visible.length&&!visibleImages.length)return null
  return <>{links.map(href=><link key={href} rel="stylesheet" href={href} precedence="manuscript-fonts"/>)}<div className={'ms-text-layer ms-text-layer-'+mode+(side?' ms-text-layer-'+side:'')} style={mode==='book'?{clipPath:bookImageMask[side||'right']}:undefined}>
    {visibleImages.length>0&&<div className="ms-book-image-mask" style={{clipPath:bookImageMask[side||'right']}}>{visibleImages.map((o,i)=><img key={i} src={o.src} alt={o.alt} decoding="async" style={{left:o.x+'%',top:o.y+'%',width:o.w+'%',height:o.h+'%',opacity:o.opacity/100,filter:imageFilter(o.effect),mixBlendMode:o.effect==='original'?'normal':'multiply'}}/>)}</div>}
    {visible.map((o,i)=><span key={i} className="ms-free-text" dir="rtl" lang="ur" data-ms-font={o.font} data-ms-ink={o.effect} data-to-shape={o.shape} style={{left:o.x+'%',top:o.y+'%',fontSize:o.size+'%',fontWeight:o.weight,fontStyle:o.italic?'italic':'normal',textDecoration:[o.underline?'underline':'',o.strike?'line-through':''].filter(Boolean).join(' ')||'none',backgroundColor:o.highlight,color:o.color,opacity:o.opacity/100,letterSpacing:o.spacing/100+'em',WebkitTextStroke:o.stroke/10+'px currentColor',textShadow:o.glow?'0 0 '+o.glow+'px currentColor':undefined,transform:'translate(-50%,-50%) rotate('+o.rotate+'deg) skewX('+o.skew+'deg) scale('+o.sx/100+','+o.sy/100+')',zIndex:o.z}}>{o.curve ? <CurvedUnicode text={o.text} curve={o.curve}/> : o.text}</span>)}
  </div></>
}
