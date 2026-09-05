import PhotoSwipe from 'photoswipe';
import type { ResourceListItem } from '../../lib/resources/resourceItems';
import { getLightboxDownloads, getLightboxSlides } from '../../lib/resources/resourceLightboxData';
import { startSmoothScroll, stopSmoothScroll } from '../../lib/scrollRuntime';
import { createDownloadPicker } from './resourceDownloadPicker';

const icon = (path: string) => `<svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true"><path d="${path}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICONS = {
 close: icon('m10 10 12 12M22 10 10 22'),
 previous: icon('m19 9-7 7 7 7'), next: icon('m13 9 7 7-7 7'),
 download: icon('M16 6v14m-5-5 5 5 5-5M8 23v3h16v-3'),
};

export function openResourceLightbox(resource: ResourceListItem, trigger: HTMLAnchorElement, onDestroy: () => void) {
 const slides = getLightboxSlides(resource);
 if (!slides.length) throw new Error('资源没有可展示的图片');
 const downloads = getLightboxDownloads(resource);
 const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
 const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
 let frame: HTMLElement | undefined;
 let title: HTMLElement | undefined;
 let previous: HTMLButtonElement | undefined;
 let next: HTMLButtonElement | undefined;
 let picker: ReturnType<typeof createDownloadPicker> | undefined;
 let keyboardMode = false;
 let idleTimer: number | undefined;
 let frameRequest = 0;
 let lastActivity = 0;
 let pendingIndex: number | undefined;
 let pendingClose = false;
 let originalOverflow = '';
 let locked = false;
 let box = { left: 0, top: 0, right: 0, bottom: 0 };
 const abort = new AbortController();
 const viewer = new PhotoSwipe({
  dataSource: slides, index: 0, mainClass: 'telysta-lightbox',
  bgOpacity: 0.96, showHideAnimationType: 'fade',
  showAnimationDuration: reduced.matches ? 0 : 180,
  hideAnimationDuration: reduced.matches ? 0 : 160,
  zoomAnimationDuration: reduced.matches ? 0 : 200,
  easing: 'cubic-bezier(0.2, 0, 0.38, 0.9)',
  paddingFn: viewport => ({ top: 24, bottom: 24, left: viewport.x < 640 ? 12 : 40, right: viewport.x < 640 ? 12 : 40 }),
  initialZoomLevel: zoom => {
   if (!resource.pixelArt || !zoom.elementSize || !zoom.panAreaSize) return zoom.fit;
   return Math.max(1, Math.floor(Math.min(6, zoom.panAreaSize.x / zoom.elementSize.x, zoom.panAreaSize.y / zoom.elementSize.y)));
  },
  loop: false, preload: [1, 1], counter: false, zoom: false,
  close: false, arrowPrev: false, arrowNext: false,
  // Our scoped capture handler also accepts keys during the opening animation.
  arrowKeys: false, escKey: false, returnFocus: false,
  errorMsg: '图片暂时无法加载，请关闭后重试。',
  imageClickAction: 'zoom', bgClickAction: () => closeViewer(),
  tapAction: () => showInfo(), doubleTapAction: 'zoom',
 });
 function hideInfo() {
  if (!keyboardMode && !picker?.isOpen) frame?.classList.add('is-idle');
 }
 function checkIdle() {
  idleTimer = undefined;
  const remaining = 2200 - (performance.now() - lastActivity);
  if (remaining > 0) idleTimer = window.setTimeout(checkIdle, remaining);
  else hideInfo();
 }
 function showInfo() {
  frame?.classList.remove('is-idle');
  lastActivity = performance.now();
  if (fine.matches && !keyboardMode && !picker?.isOpen && idleTimer === undefined) {
   idleTimer = window.setTimeout(checkIdle, 2200);
  }
 }
 function closeViewer() {
  if (viewer.opener.isOpening) pendingClose = true;
  else viewer.close();
 }
 function navigate(delta: number) {
  const index = Math.max(0, Math.min(slides.length - 1, (pendingIndex ?? viewer.currIndex) + delta));
  if (viewer.opener.isOpening) pendingIndex = index;
  else viewer.goTo(index);
  showInfo();
 }
 function updateFrame() {
  frameRequest = 0;
  const slide = viewer.currSlide;
  if (!frame || !slide) return;
  // Use PhotoSwipe's geometry, not synchronous DOM measurements on pointermove.
  const viewport = viewer.viewportSize;
  const left = Math.max(12, slide.pan.x);
  const top = Math.max(12, slide.pan.y);
  const right = Math.min(viewport.x - 12, slide.pan.x + slide.width * slide.currZoomLevel);
  const bottom = Math.min(viewport.y - 12, slide.pan.y + slide.height * slide.currZoomLevel);
  box = { left, top, right, bottom };
  frame.style.left = left + 'px';
  frame.style.top = top + 'px';
  frame.style.width = Math.max(0, right - left) + 'px';
  frame.style.height = Math.max(0, bottom - top) + 'px';
 }
 function queueFrame() {
  if (!frameRequest) frameRequest = window.requestAnimationFrame(updateFrame);
 }
 function updateCaption() {
  if (title) title.textContent = resource.title + (slides.length > 1 ? ` · ${viewer.currIndex + 1} / ${slides.length}` : '');
  if (previous) previous.disabled = viewer.currIndex === 0;
  if (next) next.disabled = viewer.currIndex === slides.length - 1;
  showInfo();
  queueFrame();
 }
 function button(label: string, svg: string, action: () => void, container: HTMLElement) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'resource-viewer-button';
  element.setAttribute('aria-label', label);
  element.title = label;
  element.innerHTML = svg;
  element.addEventListener('click', action, { signal: abort.signal });
  container.append(element);
  return element;
 }
 viewer.on('uiRegister', () => {
  viewer.ui?.registerElement({
   name: 'resource-frame', className: 'resource-viewer-frame', appendTo: 'root',
   onInit: element => {
    frame = element;
    const toolbar = document.createElement('div');
    toolbar.className = 'resource-viewer-toolbar';
    title = document.createElement('h2');
    title.id = 'resource-lightbox-title';
    title.setAttribute('aria-live', 'polite');
    const actions = document.createElement('div');
    actions.className = 'resource-viewer-actions';
    actions.setAttribute('role', 'group');
    actions.setAttribute('aria-label', '图片操作');
    if (slides.length > 1) {
     previous = button('上一张图片', ICONS.previous, () => navigate(-1), actions);
     next = button('下一张图片', ICONS.next, () => navigate(1), actions);
    }
    if (downloads.length) {
     const download = button('下载图片', ICONS.download, () => picker?.open(), actions);
     download.setAttribute('aria-haspopup', 'dialog');
     picker = createDownloadPicker(viewer.element!, downloads, download, {
      reduced: () => reduced.matches, currentIndex: () => viewer.currIndex, onToggle: () => showInfo(),
     });
    }
    button('关闭图片', ICONS.close, closeViewer, actions);
    toolbar.append(title, actions);
    frame.append(toolbar);
   },
  });
 });
 viewer.on('change', updateCaption);
 viewer.on('zoomPanUpdate', event => { if (event.slide === viewer.currSlide) queueFrame(); });
 viewer.on('resize', queueFrame);
 viewer.on('openingAnimationEnd', () => {
  // The core still creates neighbouring slides in other listeners for this event.
  // Flush after all listeners, otherwise a queued key can select a hidden, empty holder.
  queueMicrotask(() => {
   if (abort.signal.aborted) return;
   if (pendingClose) { viewer.close(); return; }
   if (pendingIndex !== undefined) { viewer.goTo(pendingIndex); pendingIndex = undefined; }
  });
 });
 viewer.on('keydown', event => { if (picker?.isOpen) event.preventDefault(); });
 viewer.on('afterInit', () => {
  const root = viewer.element!;
  root.setAttribute('aria-labelledby', 'resource-lightbox-title');
  root.setAttribute('data-scroll-native', '');
  root.classList.toggle('is-pixel-art', Boolean(resource.pixelArt));
  originalOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  document.documentElement.classList.add('has-modal-open');
  stopSmoothScroll();
  locked = true;
  root.focus({ preventScroll: true });
  updateCaption();
  updateFrame();
  document.addEventListener('keydown', event => {
   if (picker?.isOpen || event.altKey || event.ctrlKey || event.metaKey) return;
   keyboardMode = true;
   showInfo();
   if (!['ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key)) return;
   event.preventDefault();
   event.stopImmediatePropagation();
   if (event.key === 'Escape') closeViewer();
   else navigate(event.key === 'ArrowLeft' ? -1 : 1);
  }, { capture: true, signal: abort.signal });
  root.addEventListener('pointermove', event => {
   if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
   keyboardMode = false;
   if (event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom) showInfo();
   else hideInfo();
  }, { signal: abort.signal });
  root.addEventListener('pointerleave', () => { if (fine.matches) hideInfo(); }, { signal: abort.signal });
  root.addEventListener('focusin', () => { keyboardMode = true; showInfo(); }, { signal: abort.signal });
 });
 viewer.on('destroy', () => {
  abort.abort();
  window.clearTimeout(idleTimer);
  window.cancelAnimationFrame(frameRequest);
  picker?.destroy();
  if (locked) {
   document.body.style.overflow = originalOverflow;
   document.documentElement.classList.remove('has-modal-open');
   startSmoothScroll();
  }
  if (trigger.isConnected) trigger.focus({ preventScroll: true });
  onDestroy();
 });
 try { viewer.init(); } catch (error) { viewer.destroy(); throw error; }
 return viewer;
}
