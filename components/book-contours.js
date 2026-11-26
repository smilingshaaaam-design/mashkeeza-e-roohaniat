
// Browser-only contour layout. Generated markers contain no article text.
/** @param {HTMLElement} root */
export function clearBookContours(root){root.querySelectorAll('[data-book-contour]').forEach(n=>n.remove());root.normalize();}
/** @param {HTMLElement} root @param {{width:number,pitch:number,height:number,geometryRoot?:HTMLElement,maxPages?:number}} options */
export function applyBookContours(root,options){
  const {width,pitch,height,geometryRoot=root,maxPages=100}=options;
  clearBookContours(root);
  if(!width||!pitch||height<50||!CSS.supports('shape-outside','polygon(0 0,100% 0,0 100%)')||root.querySelector('img,hr,table,[data-ms-align="justify"]'))return false;
  const oldScroll=geometryRoot.scrollLeft;geometryRoot.scrollLeft=0;
  const origin=geometryRoot.getBoundingClientRect().right,top=geometryRoot.getBoundingClientRect().top;
  const colOf=r=>Math.max(0,Math.floor((origin-(r.left+r.right)/2)/pitch+.0001));
  const left='polygon(0 0,100% 0,83% 6%,66% 12%,48% 18%,32% 26%,16% 35%,6% 44%,0 54%,0 68%,10% 76%,22% 84%,38% 92%,51% 100%,0 100%)';
  const right='polygon(100% 0,0 0,17% 6%,34% 12%,52% 18%,68% 26%,84% 35%,94% 44%,100% 54%,100% 68%,90% 76%,78% 84%,62% 92%,49% 100%,100% 100%)';
  const make=kind=>{const el=document.createElement('span');el.setAttribute('data-book-contour',kind);el.setAttribute('aria-hidden','true');el.contentEditable='false';return el;};
  function floatFor(col){
    const el=make('float');
    Object.assign(el.style,{display:'block',float:col%2?'left':'right',width:(width*14.5/36)+'px',height:(height-5)+'px',shapeOutside:col%2?left:right,shapeMargin:'3px',pointerEvents:'none',userSelect:'none',padding:'0',margin:'0',border:'0',fontSize:'0',lineHeight:'0'});
    return el;
  }
  function firstAfter(col,back=1){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode(n){
      if(n.nodeType===1){if(n.hasAttribute('data-book-contour')||n.matches('[data-ms-object="text"],script,style,[hidden]'))return NodeFilter.FILTER_REJECT;
        return n.matches('h2,h3,h4')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;}
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
  const fail=()=>{clearBookContours(root);geometryRoot.scrollLeft=oldScroll;return false;};
  try{
    const first=floatFor(0);root.prepend(first);
    const firstRect=first.getBoundingClientRect();
    if(colOf(firstRect)!==0||Math.abs(firstRect.top-top)>3)return fail();
    for(let col=1;col<maxPages;col++){
      let placed=false;
      for(let attempt=1;attempt<=8;attempt++){
        const range=firstAfter(col,attempt);
        if(!range){geometryRoot.scrollLeft=oldScroll;return true;}
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
