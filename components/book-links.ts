'use client'

import { useSyncExternalStore } from 'react'

export type BookLocation = { slug: string; title: string; href: string }
export const BOOK_LINK_EVENT = 'mashkeeza:open-book-writing'

const empty: BookLocation[] = []
let locations: BookLocation[] = empty
let signature = '[]'
const listeners = new Set<() => void>()
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
function snapshot() { return locations }
function serverSnapshot() { return empty }

export function publishBookLocations(items: BookLocation[]) {
  const next = JSON.stringify(items)
  if (next === signature) return
  signature = next
  locations = items
  listeners.forEach(listener => listener())
}
export function useBookLocations() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}

export function findBookLocation(items: BookLocation[], slug: string, currentRoot = '') {
  const matching = items.filter(item => item.slug === slug)
  return matching.find(item => currentRoot && item.href.startsWith('/' + currentRoot + '/')) ?? matching[0]
}

// The main navigation consumes same-home clicks, keeping the mounted book
// and its page-turn state intact. Otherwise the ordinary anchor is sufficient.
export function requestBookLocation(href: string) {
  return !window.dispatchEvent(new CustomEvent<string>(BOOK_LINK_EVENT, { detail: href, cancelable: true }))
}
