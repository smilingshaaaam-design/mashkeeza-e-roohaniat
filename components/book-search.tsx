'use client'
import { useRef, useState } from 'react'
import type { NavItem } from './main-nav'

const aliases: Record<string,string> = {
  'ism-azam':'ism e azam isme azam asma ilahi', jafar:'ilm e jafar jafr jaffar', adad:'ilm ul adad adaad abjad',
  nujoom:'ilm e nujoom najoom astrology', 'dast-shanasi':'dast shanasi palmistry', wazaif:'wird aurad wazaif wazifa',
  taweez:'taweezat tawiz', talismat:'tilism talismat', nawaz:'roohani free tools',
  peshgoiyan:'tareekhi hisabat pesh goiyan', 'jafri-hisabat':'purane jafri hisabat'
}
function normalize(s:string) {
  return s.toLowerCase().normalize('NFKC').replace(/[\u064B-\u065Fـ]/g,'').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[-_]/g,' ')
}
export function BookSearch({topics,articles}:{topics:NavItem[];articles:NavItem[]}) {
  const dialog=useRef<HTMLDialogElement>(null)
  const [query,setQuery]=useState('')
  const terms=normalize(query.trim()).split(/\s+/)
  const candidates=[...articles,...topics.flatMap(topic=>
    [topic,...(topic.children??[]).filter(child=>child.visible!==false)].map(item=>{
      const page=item.href.startsWith('/pages/') || item.href.startsWith('/pages?')
      return {...item,href:page?topic.href+'/read/'+encodeURIComponent(item.id):item.href,
        keywords:[topic.label,aliases[topic.id],item.href.includes('quran-analyzer')?'calculator ism e azam':'',item.href].join(' ')}
    })
  )]
  const matches=query.trim()?candidates.filter(item=>{
    const haystack=normalize([item.label,item.id,'keywords' in item?item.keywords:''].join(' '))
    return terms.every(term=>haystack.includes(term))
  }):[]
  return <><button type="button" onClick={()=>dialog.current?.showModal()}>تلاش</button>
    <dialog ref={dialog} className="m-auto w-80 max-w-full rounded bg-amber-50 p-4 text-right text-red-950 backdrop:bg-black/60">
      <label>مضمون یا موضوع تلاش کریں<input autoFocus dir="auto" type="search" value={query} onChange={e=>setQuery(e.target.value)} className="my-2 block w-full border p-2" /></label>
      <ul className="max-h-72 overflow-auto">{matches.slice(0,50).map(item=><li key={item.id}><a href={item.href} onClick={()=>dialog.current?.close()}>{item.label}</a></li>)}</ul>
      {query.trim() && !matches.length && <p>کوئی نتیجہ نہیں ملا۔</p>}
      <button type="button" onClick={()=>dialog.current?.close()}>بند کریں</button>
    </dialog></>
}
