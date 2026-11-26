// Shared artwork-aware layout: floats reserve the actual upper and lower
// ornaments, not an entire side gutter. The editor uses the same algorithm.
/** @param {HTMLElement} root */
export function clearBookContours(root){root.querySelectorAll('[data-book-contour]').forEach(n=>n.remove());root.normalize();}
/** @param {HTMLElement} root @param {{width:number,pitch:number,height:number,geometryRoot?:HTMLElement,maxPages?:number}} options */
export function applyBookContours(root,options){
  const {width,pitch,height,geometryRoot=root,maxPages=150}=options;
  clearBookContours(root);
  if(!width||!pitch||height<50||!CSS.supports('shape-outside','polygon(0 0,100% 0,0 100%)')||root.querySelector('table'))return false;
  const viewport=geometryRoot===root?root:geometryRoot.parentElement||geometryRoot;
  const oldScroll=viewport.scrollLeft;viewport.scrollLeft=0;
  const origin=geometryRoot.getBoundingClientRect().right,top=geometryRoot.getBoundingClientRect().top;
  const colOf=r=>Math.max(0,Math.floor((origin-(r.left+r.right)/2)/pitch+.0001));
  // Fractions measured from book.webp. The lower right floral/central
  // ornament is wider than the lower left. Keep their contours independent.
  const topProfile=[[0,100],[8,84],[18,68],[30,54],[45,39],[60,26],[80,10],[100,0]];
  const leftBottom=[[0,0],[15,9],[30,20],[45,35],[60,51],[75,67],[90,88],[100,100]];
  const rightBottom=[[0,0],[12,3],[30,10],[48,19],[65,29],[75,35],[78,70],[86,96],[100,100]];
  const topHeight=height*35.5/77,gap=height*13/77,bottomHeight=Math.max(1,height-topHeight-gap-5);
  const topWidth=width*14.3/36.8,leftWidth=width*14.3/36.8,rightWidth=width*29.2/36.8;
  const polygon=(odd,p)=>'polygon('+[odd?'0 0':'100% 0',...p.map(([y,x])=>(odd?x:100-x)+'% '+y+'%'),odd?'0 100%':'100% 100%'].join(',')+') border-box';
  function reserve(profile,y,w){
    y=Math.min(100,Math.max(0,y));
    for(let i=1;i<profile.length;i++){const [a,x]=profile[i-1],[b,z]=profile[i];if(y<=b)return (x+(z-x)*(y-a)/(b-a))*w/100;}
    return profile[profile.length-1][1]*w/100;
  }
  function reserveAt(odd,y){
    if(y<=topHeight)return reserve(topProfile,100*y/topHeight,topWidth);
    if(y<topHeight+gap)return 0;
    return reserve(odd?leftBottom:rightBottom,100*(y-topHeight-gap)/bottomHeight,odd?leftWidth:rightWidth);
  }
  function mediaSafe(){
    for(const item of root.querySelectorAll('img:not([data-ms-object="image"]),hr')){
      for(const r of item.getClientRects()){
        if(!r.width||!r.height)continue;
        const col=colOf(r),right=origin-col*pitch,left=right-width;
        if(r.top<top-1||r.bottom>top+height+1||r.left<left-1||r.right>right+1)return false;
        const a=r.top-top,b=r.bottom-top,critical=[a,b,topHeight,topHeight+gap,...(col%2?leftBottom:rightBottom).map(([y])=>topHeight+gap+y*bottomHeight/100)].filter(y=>y>=a&&y<=b);
        const reserve=Math.max(0,...critical.map(y=>reserveAt(col%2,y)));
        if(col%2?r.left<left+reserve+3:r.right>right-reserve-3)return false;
      }
    }
    return true;
  }
  const make=kind=>{const el=document.createElement('span');el.setAttribute('data-book-contour',kind);el.setAttribute('aria-hidden','true');el.contentEditable='false';return el;};
  function floatsFor(col){
    const odd=col%2,side=odd?'left':'right';
    const a=make('float'),b=make('float');
    for(const el of [a,b])Object.assign(el.style,{display:'block',float:side,shapeMargin:'3px',pointerEvents:'none',userSelect:'none',padding:'0',margin:'0',border:'0',fontSize:'0',lineHeight:'0'});
    Object.assign(a.style,{width:topWidth+'px',height:topHeight+'px',shapeOutside:polygon(odd,topProfile)});
    Object.assign(b.style,{clear:side,width:(odd?leftWidth:rightWidth)+'px',height:bottomHeight+'px',marginTop:gap+'px',shapeOutside:polygon(odd,odd?leftBottom:rightBottom)});
    return [a,b];
  }
  function validFloats(pair,col){
    const a=pair[0].getBoundingClientRect(),b=pair[1].getBoundingClientRect();
    return colOf(a)===col&&colOf(b)===col&&Math.abs(a.top-top)<4&&Math.abs(b.top-top-topHeight-gap)<5;
  }
  function firstAfter(col,back=1){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode(n){
      if(n.nodeType===1){
        if(n.hasAttribute('data-book-contour')||n.matches('[data-ms-object],script,style,[hidden]'))return NodeFilter.FILTER_REJECT;
        return n.matches('h2,h3,h4,img,hr,[data-ms-gap]')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;
      }
      return n.length?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
    }});
    for(let n=walker.nextNode();n;n=walker.nextNode()){
      if(n.nodeType===1){if([...n.getClientRects()].some(r=>r.width>0&&r.height>0&&colOf(r)>=col)){const r=document.createRange();r.setStartBefore(n);r.collapse(true);return r;}continue;}
      if(n.parentElement?.closest('[data-ms-gap]')||!n.textContent.trim())continue;
      const test=document.createRange();test.selectNodeContents(n);
      const later=()=>[...test.getClientRects()].some(r=>r.width>0&&r.height>0&&colOf(r)>=col);
      if(!later())continue;
      let low=1,high=n.length;
      while(low<high){const mid=(low+high)>>1;test.setStart(n,0);test.setEnd(n,mid);if(later())high=mid;else low=mid+1;}
      let cut=low-1;
      for(let i=0;i<back&&cut>0;i++){while(cut>0&&/\s/.test(n.textContent[cut-1]))cut--;while(cut>0&&!/\s/.test(n.textContent[cut-1]))cut--;}
      const r=document.createRange();r.setStart(n,cut);r.collapse(true);return r;
    }
    return null;
  }
  const finish=ok=>{if(!ok)clearBookContours(root);viewport.scrollLeft=oldScroll;return ok;};
  try{
    const first=floatsFor(0);root.prepend(...first);
    if(!validFloats(first,0))return finish(false);
    for(let col=1;col<maxPages;col++){
      let placed=false;
      for(let attempt=1;attempt<=12;attempt++){
        const range=firstAfter(col,attempt);
        if(!range)return finish(mediaSafe());
        const n=range.startContainer,block=n.nodeType===1?n:n.parentElement,manual=block?.closest('[data-ms-break="1"]');
        const pair=floatsFor(col);let br=null;
        if(manual&&root.contains(manual)&&!manual.querySelector('[data-book-contour]')&&colOf(manual.getBoundingClientRect())===col)manual.prepend(...pair);
        else{br=make('break');Object.assign(br.style,{display:'block',breakBefore:'column',height:'0',fontSize:'0',lineHeight:'0',padding:'0',border:'0',margin:'0',pointerEvents:'none'});range.insertNode(br);br.after(...pair);}
        if(validFloats(pair,col)){placed=true;break;}
        pair.forEach(n=>n.remove());br?.remove();root.normalize();
      }
      if(!placed)return finish(false);
    }
    return finish(false);
  }catch{return finish(false);}
}
