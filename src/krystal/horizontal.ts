const easing = 'cubic-bezier(0.645, 0.045, 0.355, 1)'; // From http://easings.net/#easeInOutCubic

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface HorizontalStoryViewInstance {
  listWidget: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigateTo(historyInfo: any): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert(widget: any): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  remove(widget: any): void;
}

interface HorizontalStoryViewConstructor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (listWidget: any): HorizontalStoryViewInstance;
}

const HorizontalStoryView = function (this: HorizontalStoryViewInstance, listWidget: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  this.listWidget = listWidget as any;
} as unknown as HorizontalStoryViewConstructor;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
HorizontalStoryView.prototype.navigateTo = function (historyInfo: any): void {
  if (!historyInfo.title) return;
  const listElementIndex = this.listWidget.findListItem(0, historyInfo.title);
  if (listElementIndex === undefined) return;

  const listItemWidget = this.listWidget.children[listElementIndex];
  if (!listItemWidget) return;
  const targetElement = listItemWidget.findFirstDomNode();

  // Abandon if the list entry isn't a DOM element (it might be a text node)
  if (!(targetElement instanceof Element)) return;

  // Scroll the node into view
  this.listWidget.dispatchEvent({
    type: 'tm-scroll',
    target: targetElement,
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
HorizontalStoryView.prototype.insert = function (widget: any): void {
  const duration: number = $tw.utils.getAnimationDuration();

  if (duration) {
    const targetElement = widget.findFirstDomNode();
    if (!(targetElement instanceof Element)) return;

    const currWidth = (targetElement as HTMLElement).offsetWidth;

    setTimeout(() => {
      (targetElement as HTMLElement).style.cssText = '';
    }, duration);

    // Set up the initial position of the element
    $tw.utils.setStyle(targetElement, [
      { transition: 'none' },
      { transform: 'scale(0.85)' },
      { opacity: '0' },
      { marginLeft: `-${currWidth}px` },
    ]);

    $tw.utils.forceLayout(targetElement);

    // Transition to the final position
    $tw.utils.setStyle(targetElement, [
      {
        transition: `opacity ${duration}ms ${easing}, margin ${duration}ms ${easing}, transform ${duration}ms ${easing}`,
      },
      { transform: 'scale(1)' },
      { opacity: '1' },
      { marginLeft: '0' },
    ]);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
HorizontalStoryView.prototype.remove = function (widget: any): void {
  const duration: number = $tw.utils.getAnimationDuration();

  this.listWidget.dispatchEvent({
    type: 'tm-remove',
  });

  if (duration) {
    const targetElement = widget.findFirstDomNode();
    const removeElement = (): void => {
      widget.removeChildDomNodes();
    };

    if (!(targetElement instanceof Element)) {
      removeElement();
      return;
    }

    const currWidth = (targetElement as HTMLElement).offsetWidth;

    // Remove the dom nodes of the widget at the end of the transition
    setTimeout(removeElement, duration);

    // Animate the closure
    $tw.utils.setStyle(targetElement, [
      { transition: 'none' },
      { transform: 'scale(1)' },
      { opacity: '1' },
      { marginLeft: '0' },
    ]);

    $tw.utils.forceLayout(targetElement);

    $tw.utils.setStyle(targetElement, [
      {
        transition: `opacity ${duration}ms ${easing}, margin ${duration}ms ${easing}, transform ${duration}ms ${easing}`,
      },
      { transform: 'scale(0.85)' },
      { marginLeft: `-${currWidth}px` },
      { opacity: '0' },
    ]);
  } else {
    widget.removeChildDomNodes();
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(exports as any).horizontal = HorizontalStoryView;
