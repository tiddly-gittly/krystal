import type { ITiddlerFields } from 'tiddlywiki';

const STORY_TIDDLER_TITLE = '$:/StoryList';
const ACTIVE_LINK_CLASS = 'krystal-link--active';
const MAXIMIZED_TIDDLER_CLASS = 'krystal-tiddler__frame--maximized';
const DRAG_HANDLE_CLASS = 'krystal-drag-handle';
const DRAG_OVER_CLASS = 'krystal-tiddler__frame--drag-over';
const KRYSTAL_LAYOUT = '$:/plugins/linonetwo/krystal/krystal-layout';

const KRYSTAL_CONFIG = {
  highlight: '$:/plugins/linonetwo/krystal/config/highlight',
  tiddlerwidth: '$:/plugins/linonetwo/krystal/config/tiddlerwidth',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(exports as any).after = ['render'];

const checkIsInKrystalLayout = (): boolean =>
  Boolean($tw.wiki && $tw.wiki.getTiddlerText('$:/layout') === KRYSTAL_LAYOUT);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ThrottledFunction = (this: any) => void;

function throttle(callback: () => void, limit: number): ThrottledFunction {
  let wait = false;
  return function () {
    if (!wait) {
      callback();
      wait = true;
      setTimeout(() => {
        wait = false;
      }, limit);
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(exports as any).startup = function (): void {
  let isInKrystalLayout = checkIsInKrystalLayout();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $tw.wiki.addEventListener('change', function updateIsKrystalLayout(changes: any) {
    if (!$tw.utils.hop(changes, '$:/layout')) {
      return;
    }
    const nextIsInKrystalLayout = checkIsInKrystalLayout();
    if (nextIsInKrystalLayout !== isInKrystalLayout) {
      isInKrystalLayout = nextIsInKrystalLayout;
      if (isInKrystalLayout) {
        loadLogic();
      } else {
        unloadLogic();
      }
    }
  });

  // ---- drag handler helpers ----
  // Uses TW5's $tw.utils.makeDraggable() for drag source (sets $tw.dragInProgress
  // which makes $dropzone ignore internal drags) + event delegation on
  // .tc-story-river for drop handling (dragover must call preventDefault to
  // enable the drop, and stopPropagation to prevent $dropzone overriding).

  let storyRiverDropBound = false;

  function injectDragHandles(): void {
    if (!isInKrystalLayout) return;
    const storyRiver = document.querySelector<HTMLElement>('.tc-story-river');
    if (!storyRiver) return;

    // Ensure story-river drop delegation is set up once
    if (!storyRiverDropBound) {
      storyRiver.addEventListener('dragover', onStoryRiverDragOver);
      storyRiver.addEventListener('drop', onStoryRiverDrop);
      storyRiverDropBound = true;
    }

    const frames = document.querySelectorAll<HTMLElement>('.tc-tiddler-frame');
    frames.forEach((frame) => {
      // Already have a handle?
      if (frame.querySelector(`.${DRAG_HANDLE_CLASS}`)) return;

      const title = frame.getAttribute('data-tiddler-title');
      if (!title) return;

      // Inject drag handle at top of frame
      const handle = document.createElement('div');
      handle.className = DRAG_HANDLE_CLASS;
      handle.draggable = true;
      handle.title = '拖动重新排序';
      handle.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="4" cy="4" r="1.5"/><circle cx="10" cy="4" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="10" cy="8" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="10" cy="12" r="1.5"/></svg>';
      frame.insertBefore(handle, frame.firstChild);

      // Use TW5's built-in makeDraggable for proper drag setup
      // This sets $tw.dragInProgress so the $dropzone ignores internal drags
      $tw.utils.makeDraggable({
        domNode: frame,
        selector: `.${DRAG_HANDLE_CLASS}`,
        dragTiddlerFn: () => title,
        dragImageType: 'blank',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        widget: $tw.rootWidget as any,
      });
    });
  }

  // ---- story river drop handling (event delegation) ----

  function onStoryRiverDragOver(event: DragEvent): void {
    // Must call preventDefault to allow drop on this element
    event.preventDefault();
    // Must call stopPropagation to prevent $dropzone from overriding dropEffect
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    // Highlight the target frame
    highlightDropTarget(event);
  }

  function highlightDropTarget(event: DragEvent): void {
    // Clear all highlights
    document.querySelectorAll(`.${DRAG_OVER_CLASS}`).forEach((el) => el.classList.remove(DRAG_OVER_CLASS));
    // Find the frame under the cursor using coordinates
    const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement;
    if (!target) return;
    const frame = target.closest('.tc-tiddler-frame') as HTMLElement;
    if (frame) {
      frame.classList.add(DRAG_OVER_CLASS);
    }
  }

  function onStoryRiverDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Clear highlights
    document.querySelectorAll(`.${DRAG_OVER_CLASS}`).forEach((el) => el.classList.remove(DRAG_OVER_CLASS));

    // Get dragged title from the data transfer (set by TW5's makeDraggable)
    let draggedTitle: string | null = null;
    if (event.dataTransfer) {
      draggedTitle = event.dataTransfer.getData('text/plain');
    }

    if (!draggedTitle) return;

    // Find the frame under the cursor using coordinates
    const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement;
    if (!target) return;
    const targetFrame = target.closest('.tc-tiddler-frame') as HTMLElement;
    if (!targetFrame) return;
    const targetTitle = targetFrame.getAttribute('data-tiddler-title');
    if (!targetTitle || targetTitle === draggedTitle) return;

    // Reorder the story list
    const storyTiddler = $tw.wiki.getTiddler(STORY_TIDDLER_TITLE);
    const tiddlers = $tw.wiki.getTiddlerList(STORY_TIDDLER_TITLE);
    const fromIndex = tiddlers.indexOf(draggedTitle);
    const toIndex = tiddlers.indexOf(targetTitle);

    if (fromIndex === -1 || toIndex === -1) return;

    const newList = [...tiddlers];
    newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, draggedTitle);

    $tw.wiki.addTiddler(
      new $tw.Tiddler(
        { title: STORY_TIDDLER_TITLE } as ITiddlerFields,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        storyTiddler as any,
        { list: newList },
      ),
    );
  }

  // ---- end drag handler helpers ----

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function highlightOpenTiddlerLinks(changes: any): void {
    if (!isInKrystalLayout) return;
    if (!$tw.utils.hop(changes, STORY_TIDDLER_TITLE)) return;

    const config = $tw.wiki.getTiddler(KRYSTAL_CONFIG.highlight);
    if (config && config.fields && config.fields.text === 'disable') return;

    const tiddlers = $tw.wiki.getTiddlerList(STORY_TIDDLER_TITLE);

    document.querySelectorAll(`.${ACTIVE_LINK_CLASS}`).forEach((link) => link.classList.remove(ACTIVE_LINK_CLASS));

    tiddlers.forEach((tiddler) => {
      document
        .querySelectorAll(`.tc-tiddler-body a[href="#${encodeURIComponent(tiddler)}"]`)
        .forEach((link) => link.classList.add(ACTIVE_LINK_CLASS));
    });

    // inject drag handles after story list changes
    setTimeout(injectDragHandles, 0);
  }

  function updateHeaderHeight(): void {
    if (!isInKrystalLayout) return;
    const headerEl = document.querySelector<HTMLElement>('.krystal-header.krystal-header--big');
    if (!headerEl) return;
    const height = headerEl.offsetHeight;
    document.documentElement.style.setProperty('--krystal-header-height', `${height}px`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function tiddlersCount(event: any): void {
    const { widget } = event;
    const count = widget?.list?.length ?? 0;
    document.body.style.setProperty('--tiddler-count', String(count));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function scrollToTiddler(event: any): void {
    if (!isInKrystalLayout) return;
    const tiddlerElement = event.target as HTMLElement;
    const mediaQueryList = window.matchMedia('(min-width: 960px)');

    if (mediaQueryList.matches) {
      const storyRiver = tiddlerElement.parentElement;
      if (!storyRiver) return;

      const tiddlers = Array.from(storyRiver.querySelectorAll<HTMLElement>('div[data-tiddler-title]'));
      const tiddlerPosition = tiddlers.indexOf(tiddlerElement);
      if (tiddlerPosition === -1) return;

      const tiddlerWidthTiddler = $tw.wiki.getTiddler(KRYSTAL_CONFIG.tiddlerwidth);
      const tiddlerWidth = Number(tiddlerWidthTiddler?.fields?.text ?? 0) || 400;
      const windowWidth = window.innerWidth;

      const position = windowWidth / 2 - tiddlerWidth / 2;
      const newRiverPosition = Math.max(tiddlerPosition * tiddlerWidth - position, 0);

      storyRiver.scroll({ left: newRiverPosition, behavior: 'smooth' });
    } else {
      tiddlerElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function tiddlerFrameEffects(): void {
    if (!isInKrystalLayout) return;
    const tiddlers = Array.from(document.querySelectorAll<HTMLElement>('.tc-tiddler-frame'));
    const count = tiddlers.length;

    if (count === 0) return;

    const offset = 100;
    const tiddlerPadding = Number(window.getComputedStyle(tiddlers[0]).paddingRight.slice(0, -2));
    const tiddlerWidth = tiddlers[0].offsetWidth;
    const windowWidth = window.innerWidth;

    tiddlers.forEach((tiddler, i) => {
      if (i === 0) return;

      const tiddlerTitle = tiddler.querySelector<HTMLElement>('.krystal-tiddler__title');
      if (!tiddlerTitle) return;

      const previousTiddler = tiddlers[i - 1];
      const previousTiddlerTitle = previousTiddler.querySelector<HTMLElement>('.krystal-tiddler__title');

      const x = tiddler.getBoundingClientRect().left;

      const start = x < offset + i * tiddlerPadding;
      const end = x > windowWidth - (offset + (count - i) * tiddlerPadding);
      const startOverlay = x < tiddlerWidth + (i - 1) * tiddlerPadding;

      tiddler.classList.toggle('krystal-tiddler__frame--overlay', startOverlay);

      if (previousTiddlerTitle) {
        previousTiddlerTitle.classList.toggle('krystal-tiddler__title--start-active', start);
        if (!end) {
          previousTiddler.classList.toggle('krystal-tiddler__frame--hide', start);
        }
      }

      if (start) {
        tiddlerTitle.classList.remove('krystal-tiddler__title--end');
      }

      if (end) {
        tiddler.classList.add('krystal-tiddler__frame--overlay');
        tiddler.classList.add('krystal-tiddler__frame--hide');
        tiddlerTitle.classList.add('krystal-tiddler__title--end', 'krystal-tiddler__title--end-active');
      } else {
        if (!startOverlay) {
          tiddler.classList.remove('krystal-tiddler__frame--overlay');
        }
        tiddler.classList.remove('krystal-tiddler__frame--hide');
        tiddlerTitle.classList.remove('krystal-tiddler__title--end-active');
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function reinitiateTiddlerFrameEffects(changes: any): void {
    if (!isInKrystalLayout) return;
    if (!$tw.utils.hop(changes, STORY_TIDDLER_TITLE)) return;
    const duration: number = $tw.utils.getAnimationDuration() || 0;
    setTimeout(tiddlerFrameEffects, duration);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function closeTiddlersToRight(event: any): any {
    if (!isInKrystalLayout) return event;
    const storyTiddler = $tw.wiki.getTiddler(STORY_TIDDLER_TITLE);
    const tiddlers = $tw.wiki.getTiddlerList(STORY_TIDDLER_TITLE);

    const navigateFrom: string | undefined = event.navigateFromTitle;
    const navigateTo: string | undefined = event.navigateTo;

    const config = $tw.wiki.getTiddler('$:/plugins/linonetwo/krystal/config/close');
    if (config && config.fields && config.fields.text === 'disable') return event;
    if (!navigateFrom) return event;

    if (navigateTo !== undefined && tiddlers.indexOf(navigateTo) === -1) {
      const currentTiddlerIndex = tiddlers.indexOf(navigateFrom);
      const tiddlersToClose = tiddlers.slice(currentTiddlerIndex + 1);
      if (tiddlersToClose.length === 0) return event;

      const newStoryList = tiddlers.filter((title) => !tiddlersToClose.includes(title));
      $tw.wiki.addTiddler(
        new $tw.Tiddler(
          { title: STORY_TIDDLER_TITLE } as ITiddlerFields,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          storyTiddler as any,
          { list: newStoryList },
        ),
      );
    }

    return event;
  }

  function tiddlerFullscreen(tiddlerTitle: string): void {
    if (!isInKrystalLayout) return;
    const tiddler = document.querySelector<HTMLElement>(`div[data-tiddler-title="${tiddlerTitle}"]`);
    if (!tiddler) return;
    tiddler.classList.toggle(MAXIMIZED_TIDDLER_CLASS);
  }

  function loadLogic(): void {
    updateHeaderHeight();

    window.addEventListener('resize', updateHeaderHeight);

    const throttledTiddlerFrameEffects = throttle(tiddlerFrameEffects, 10);
    window.addEventListener('scroll', throttledTiddlerFrameEffects, true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $tw.rootWidget.addEventListener('tm-remove', tiddlersCount as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $tw.rootWidget.addEventListener('tm-scroll', function (event: any) {
      if (event.type === 'tm-scroll') {
        tiddlersCount(event);
        scrollToTiddler(event);
      }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $tw.rootWidget.addEventListener('tm-maximize', function (event: any) {
      if (event.type === 'tm-maximize') {
        tiddlerFullscreen(event.param);
      }
    });

    $tw.hooks.addHook('th-navigating', closeTiddlersToRight);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $tw.wiki.addEventListener('change', highlightOpenTiddlerLinks as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $tw.wiki.addEventListener('change', reinitiateTiddlerFrameEffects as any);

    // Initial injection of drag handles
    setTimeout(injectDragHandles, 100);
  }

  function unloadLogic(): void {
    window.removeEventListener('resize', updateHeaderHeight);
    window.removeEventListener('scroll', tiddlerFrameEffects, true);

    $tw.hooks.removeHook('th-navigating', closeTiddlersToRight);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $tw.wiki.removeEventListener('change', highlightOpenTiddlerLinks as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $tw.wiki.removeEventListener('change', reinitiateTiddlerFrameEffects as any);
  }

  if (isInKrystalLayout) {
    loadLogic();
  }
};
