
// Browser-only contour layout. Generated markers contain no article text.
/** @param {HTMLElement} root */
export function clearBookContours(root){root.querySelectorAll('[data-book-contour]').forEach(n=>n.remove());root.normalize();}
/** @param {HTMLElement} root @param {{width:number,pitch:number,height:number,geometryRoot?:HTMLElement,maxPages?:number}} options */
export function applyBookContours(root,options){
  const {width,pitch,height,geometryRoot=root,maxPages=100}=options;
  clearBookContours(root);
  if(!width||!pitch||height<50||!CSS.supports('shape-outside','polygon(0 0,100% 0,0 100%)')||root.querySelector('table'))return false;
  const viewport=geometryRoot.parentElement||geometryRoot;
  const oldScroll=viewport.scrollLeft;viewport.scrollLeft=0;
  const origin=geometryRoot.getBoundingClientRect().right,top=geometryRoot.getBoundingClientRect().top;
  const colOf=r=>Math.max(0,Math.floor((origin-(r.left+r.right)/2)/pitch+.0001));
  // Match the floral corners in book.webp; the middle of each outer edge is plain paper.
  const profile=[[0,100],[6,80],[12,64],[18,51],[25,36],[33,23],[41,13],[48,4],[52,0],[69,0],[75,7],[81,15],[87,26],[94,41],[100,56]];
  const polygon=odd=>'polygon('+[odd?'0 0':'100% 0',...profile.map(([y,x])=>(odd?x:100-x)+'% '+y+'%'),odd?'0 100%':'100% 100%'].join(',')+')';
  const floatWidth=width*13.5/36.8, floatHeight=height-5;
  function reserveAt(y){
    y=Math.min(100,Math.max(0,y));
    for(let i=1;i<profile.length;i++){
      const [a,x]=profile[i-1],[b,z]=profile[i];
      if(y<=b)return (x+(z-x)*(y-a)/(b-a))*floatWidth/100;
    }
    return 0;
  }
  // Floats wrap native text, but a manually positioned image can ignore the contour.
  // Never publish that layout if its image or rule crosses into the floral artwork.
  function mediaSafe(){
    for(const item of root.querySelectorAll('img,hr')){
      for(const r of item.getClientRects()){
        if(!r.width||!r.height)continue;
        const col=colOf(r),right=origin-col*pitch,left=right-width;
        const a=(r.top-top)/floatHeight*100,b=(r.bottom-top)/floatHeight*100;
        if(r.top<top-1||r.bottom>top+height+1||r.left<left-1||r.right>right+1)return false;
        const reserve=Math.max(reserveAt(a),reserveAt(b),...profile.filter(([y])=>y>=a&&y<=b).map(([,x])=>x*floatWidth/100));
        if(col%2?r.left<left+reserve+3:r.right>right-reserve-3)return false;
      }
    }
    return true;
  }
  const make=kind=>{const el=document.createElement('span');el.setAttribute('data-book-contour',kind);el.setAttribute('aria-hidden','true');el.contentEditable='false';return el;};
  function floatFor(col){
    const el=make('float');
    Object.assign(el.style,{display:'block',float:col%2?'left':'right',width:floatWidth+'px',height:floatHeight+'px',shapeOutside:polygon(col%2),shapeMargin:'3px',pointerEvents:'none',userSelect:'none',padding:'0',margin:'0',border:'0',fontSize:'0',lineHeight:'0'});
    return el;
  }
  function firstAfter(col,back=1){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode(n){
      if(n.nodeType===1){if(n.hasAttribute('data-book-contour')||n.matches('[data-ms-object="text"],script,style,[hidden]'))return NodeFilter.FILTER_REJECT;
        return n.matches('h2,h3,h4,img,hr')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;}
      return n.length?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
    }});
    for(let n=walker.nextNode();n;n=walker.nextNode()){
      if(n.nodeType===1){if([...n.getClientRects()].some(r=>r.width>0&&r.height>0&&colOf(r)>=col)){const r=document.createRange();r.setStartBefore(n);r.collapse(true);return r;}continue;}
      if(!n.textContent.trim())continue;
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
  const fail=()=>{clearBookContours(root);viewport.scrollLeft=oldScroll;return false;};
  try{
    const first=floatFor(0);root.prepend(first);
    const firstRect=first.getBoundingClientRect();
    if(colOf(firstRect)!==0||Math.abs(firstRect.top-top)>3)return fail();
    for(let col=1;col<maxPages;col++){
      let placed=false;
      for(let attempt=1;attempt<=8;attempt++){
        const range=firstAfter(col,attempt);
        if(!range){if(!mediaSafe())return fail();viewport.scrollLeft=oldScroll;return true;}
        const n=range.startContainer,block=n.nodeType===1?n:n.parentElement,manual=block?.closest('[data-ms-break="1"]');
        const f=floatFor(col);let br=null;
        if(manual&&root.contains(manual)&&!manual.querySelector('[data-book-contour]')&&colOf(manual.getBoundingClientRect())===col)manual.prepend(f);
        else{br=make('break');Object.assign(br.style,{display:'block',breakBefore:'column',height:'0',fontSize:'0',lineHeight:'0',padding:'0',border:'0',margin:'0',pointerEvents:'none'});range.insertNode(br);br.after(f);}
        const rect=f.getBoundingClientRect();
        if(colOf(rect)===col&&Math.abs(rect.top-top)<=3){placed=true;break;}
        f.remove();br?.remove();root.normalize();
      }
      if(!placed)return fail();
    }
    return fail();
  }catch{return fail();}
}
