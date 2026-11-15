import { checkLibrarySession, getLibraryCatalog, isLibraryUnlocked } from './libraryAccess';
import type Book from 'epubjs/types/book';
import type Rendition from 'epubjs/types/rendition';
export function initLibraryReader() {
    const root = document.querySelector<HTMLElement>('[data-library-reader]');
    if (!root)
        return;
    const surface = root.querySelector<HTMLElement>('[data-reader-surface]')!, state = root.querySelector<HTMLElement>('[data-reader-state]')!, title = root.querySelector<HTMLElement>('[data-reader-title]')!;
    const formats = root.querySelector<HTMLElement>('[data-reader-formats]')!, unlock = root.querySelector<HTMLElement>('[data-library-access-help]')!, tools = root.querySelector<HTMLElement>('[data-reader-tools]')!, chapters = root.querySelector<HTMLElement>('[data-reader-chapters]')!;
    const params = new URLSearchParams(location.search), id = params.get('book');
    const message = root.querySelector<HTMLElement>('[data-reader-message]')!, dialog = root.querySelector<HTMLDialogElement>('[data-reader-dialog]')!;
    let book: Book | undefined, rendition: Rendition | undefined, abort: AbortController | undefined, revision = 0, font = 18;
    let resizeFrame = 0, lastSize = '';
    const observer = new ResizeObserver(([entry]) => {
        if (!rendition || surface.hidden)
            return;
        const { width, height } = entry.contentRect, size = `${width}:${height}`;
        if (!width || !height || size === lastSize)
            return;
        lastSize = size;
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => { rendition?.resize(width, height); });
    });
    observer.observe(surface);
    function clear() { revision++; abort?.abort(); cancelAnimationFrame(resizeFrame); lastSize = ''; rendition?.destroy(); book?.destroy(); rendition = undefined; book = undefined; surface.replaceChildren(); surface.hidden = true; tools.hidden = true; chapters.replaceChildren(); title.removeAttribute('title'); dialog.close(); message.hidden = false; }
    async function open(format?: string) {
        clear();
        const request = revision;
        title.textContent = '在线阅览';
        formats.replaceChildren();
        state.hidden = false;
        unlock.hidden = true;
        if (!id || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
            state.textContent = '请选择一本书进入阅览。';
            return;
        }
        state.textContent = '正在读取书目…';
        try {
            const record = (await getLibraryCatalog()).find(item => item.id === id);
            if (request !== revision)
                return;
            if (!record) {
                state.textContent = isLibraryUnlocked() ? '未找到这份书目。' : '这份书目暂未向访客开放。';
                unlock.hidden = isLibraryUnlocked();
                return;
            }
            title.textContent = record.title;
            title.title = record.title;
            (root!.querySelector('[data-reader-back]') as HTMLAnchorElement).href = '/ebooks/';
            const supported = record.files.filter(file => ['PDF', 'EPUB'].includes(file.format));
            for (const file of supported) {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = file.format;
                button.setAttribute('aria-label', '阅读 ' + file.format);
                button.addEventListener('click', () => { void open(file.format); });
                formats.append(button);
            }
            const file = supported.find(file => file.format === format) || supported[0];
            if (!file) {
                state.textContent = '此格式暂供下载，站内阅览支持 PDF 和 EPUB。';
                return;
            }
            params.set('format', file.format);
            history.replaceState(null, '', `?${params}`);
            surface.hidden = false;
            if (file.format === 'PDF') {
                const frame = document.createElement('iframe');
                frame.src = file.href;
                frame.title = `${record.title} PDF`;
                frame.referrerPolicy = 'no-referrer';
                surface.append(frame);
                state.hidden = true;
                message.hidden = true;
                return;
            }
            state.textContent = '正在载入 EPUB…';
            abort = new AbortController();
            const response = await fetch(file.href, { credentials: 'include', signal: abort.signal });
            if (response.status === 401) {
                clear();
                state.textContent = '这份书目暂时不可访问。';
                unlock.hidden = false;
                return;
            }
            if (!response.ok)
                throw new Error('Book unavailable');
            const data = await response.arrayBuffer();
            if (request !== revision)
                return;
            const [{ default: ePub }, { default: DOMPurify }] = await Promise.all([import('epubjs'), import('dompurify')]);
            if (request !== revision)
                return;
            book = ePub(data);
            await book.ready;
            if (request !== revision)
                return;
            book.spine.hooks.serialize.register((html: string, section: {
                output: string;
            }) => {
                const clean = DOMPurify.sanitize(section.output || html, { WHOLE_DOCUMENT: true, FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'base'], FORBID_ATTR: ['srcdoc', 'ping', 'target'] });
                const doc = new DOMParser().parseFromString(clean, 'text/html');
                const policy = doc.createElement('meta');
                policy.httpEquiv = 'Content-Security-Policy';
                policy.content = "default-src 'none'; img-src blob: data:; style-src 'unsafe-inline' blob: data:; font-src blob: data:; base-uri 'none'; form-action 'none'";
                doc.head.prepend(policy);
                section.output = '<!DOCTYPE html>' + doc.documentElement.outerHTML;
            });
            rendition = book.renderTo(surface, { width: '100%', height: '100%', spread: 'none', allowScriptedContent: false });
            rendition.themes.default({
                body: { color: '#d8dee9', background: '#0b0f17', 'line-height': '1.9', 'font-family': 'sans-serif' },
                'p, h1, h2, h3, blockquote, ul, ol': { 'max-width': '72ch', 'margin-left': 'auto', 'margin-right': 'auto' },
            });
            rendition.themes.fontSize(font + 'px');
            await rendition.display();
            if (request !== revision)
                return;
            const navigation = await book.loaded.navigation;
            function links(items: typeof navigation.toc) { const list = document.createElement('ul'); for (const item of items) {
                const li = document.createElement('li'), button = document.createElement('button');
                button.type = 'button';
                button.textContent = item.label.trim();
                button.addEventListener('click', () => { dialog.close(); void rendition?.display(item.href).catch(() => { state.textContent = '该章节暂时无法打开。'; }); });
                li.append(button);
                if (item.subitems?.length)
                    li.append(links(item.subitems));
                list.append(li);
            } return list; }
            chapters.append(links(navigation.toc));
            tools.hidden = false;
            state.hidden = true;
            message.hidden = true;
        }
        catch (error) {
            if (request === revision && !(error instanceof DOMException && error.name === 'AbortError')) {
                state.hidden = false;
                state.textContent = '暂时无法载入这本书，可以从书目页面下载后阅读。';
            }
        }
    }
    root.querySelector('[data-reader-toc]')!.addEventListener('click', () => dialog.showModal());
    root.querySelector('[data-reader-close]')!.addEventListener('click', () => dialog.close());
    const fullscreen = root.querySelector<HTMLButtonElement>('[data-reader-fullscreen]')!;
    if (!document.fullscreenEnabled)
        fullscreen.hidden = true;
    fullscreen.addEventListener('click', () => {
        const action = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
        void action.catch(() => { fullscreen.title = '浏览器暂不支持全屏；当前已使用完整窗口阅览。'; });
    });
    document.addEventListener('fullscreenchange', () => { fullscreen.setAttribute('aria-pressed', String(!!document.fullscreenElement)); fullscreen.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'; fullscreen.setAttribute('aria-label', fullscreen.textContent + ' · 切换全屏阅读'); });
    root.querySelector('[data-reader-prev]')!.addEventListener('click', () => { void rendition?.prev().catch(() => { }); });
    root.querySelector('[data-reader-next]')!.addEventListener('click', () => { void rendition?.next().catch(() => { }); });
    root.querySelector('[data-reader-smaller]')!.addEventListener('click', () => { font = Math.max(14, font - 2); rendition?.themes.fontSize(font + 'px'); });
    root.querySelector('[data-reader-larger]')!.addEventListener('click', () => { font = Math.min(30, font + 2); rendition?.themes.fontSize(font + 'px'); });
    window.addEventListener('library-access-change', () => { clear(); void open(params.get('format') || undefined); });
    window.addEventListener('pagehide', () => { observer.disconnect(); clear(); });
    window.addEventListener('pageshow', event => {
        if (event.persisted) {
            observer.observe(surface);
            void checkLibrarySession().then(() => open(params.get('format') || undefined));
        }
    });
    void checkLibrarySession().then(() => open(params.get('format') || undefined));
}
