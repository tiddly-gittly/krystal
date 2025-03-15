/*\
title: $:/plugins/linonetwo/krystal/plugin.js
type: application/javascript
module-type: startup

Sets plugin behavior

\*/
const STORY_TIDDLER_TITLE = "$:/StoryList";
const ACTIVE_LINK_CLASS = "krystal-link--active";
const MAXIMIZED_TIDDLER_CLASS = "krystal-tiddler__frame--maximized";
const KRYSTAL_LAYOUT = "$:/plugins/linonetwo/krystal/krystal-layout";

const KRYSTAL_CONFIG = {
  highlight: "$:/plugins/linonetwo/krystal/config/highlight",
  tiddlerwidth: "$:/plugins/linonetwo/krystal/config/tiddlerwidth",
};

exports.after = ["render"];

const checkIsInKrystalLayout = () => $tw.wiki && $tw.wiki.getTiddlerText("$:/layout") === KRYSTAL_LAYOUT;
exports.startup = function () {
  let isInKrystalLayout = checkIsInKrystalLayout();
  $tw.wiki.addEventListener("change", function updateIsKrystalLayout (changes) {
    if (!$tw.utils.hop(changes, "$:/layout")) {
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

  function loadLogic() {
    header();

    window.addEventListener("resize", header);
  
    const throttledTiddlerFrameEffects = throttle(tiddlerFrameEffects, 10);
    window.addEventListener("scroll", throttledTiddlerFrameEffects, true);
  
    $tw.rootWidget.addEventListener("tm-remove", tiddlersCount);
    $tw.rootWidget.addEventListener("tm-scroll", function (event) {
      if (event.type === "tm-scroll") {
        tiddlersCount(event);
        scroll(event);
      }
    });
  
    $tw.rootWidget.addEventListener("tm-maximize", function (event) {
      if (event.type === "tm-maximize") {
        tiddlerFullscreen(event.param);
      }
    });
  
    $tw.hooks.addHook("th-navigating", closeTiddlersToRight);
  
    $tw.wiki.addEventListener("change", highlightOpenTiddlerLinks);
    $tw.wiki.addEventListener("change", reinitiateTiddlerFrameEffects);
  }
  function unloadLogic() {
    window.removeEventListener("resize", header);
    window.removeEventListener("scroll", tiddlerFrameEffects, true);

    // FIXME: Core don't have this, wait until PR accepts.
    // $tw.rootWidget.removeEventListener("tm-remove", tiddlersCount);
    // $tw.rootWidget.removeEventListener("tm-scroll", function (event) {
    //   if (event.type === "tm-scroll") {
    //     tiddlersCount(event);
    //     scroll(event);
    //   }
    // });
    // $tw.rootWidget.removeEventListener("tm-maximize", function (event) {
    //   if (event.type === "tm-maximize") {
    //     tiddlerFullscreen(event.param);
    //   }
    // });
    $tw.hooks.removeHook("th-navigating", closeTiddlersToRight);
    $tw.wiki.removeEventListener("change", highlightOpenTiddlerLinks);
    $tw.wiki.removeEventListener("change", reinitiateTiddlerFrameEffects);
  }

  if (isInKrystalLayout) {
    loadLogic();
  }

  function highlightOpenTiddlerLinks(changes) {
    if (!isInKrystalLayout) {
      return;
    }
    if (!$tw.utils.hop(changes, STORY_TIDDLER_TITLE)) {
      return;
    }

    const config = $tw.wiki.getTiddler(KRYSTAL_CONFIG.highlight);

    if (config && config.fields && config.fields.text === "disable") {
      return;
    }

    const tiddlers = $tw.wiki.getTiddlerList(STORY_TIDDLER_TITLE);

    Array.from(document.querySelectorAll(`.${ACTIVE_LINK_CLASS}`)).forEach(
      (link) => link.classList.remove(ACTIVE_LINK_CLASS)
    );

    tiddlers.forEach((tiddler) => {
      Array.from(
        document.querySelectorAll(
          `.tc-tiddler-body a[href="#${encodeURIComponent(tiddler)}"]`
        )
      ).forEach((link) => link.classList.add(ACTIVE_LINK_CLASS));
    });
  }

  function header() {
    if (!isInKrystalLayout) {
      return;
    }
    const height = document.querySelector(
      ".krystal-header.krystal-header--big"
    ).offsetHeight;
    document.documentElement.style.setProperty(
      "--krystal-header-height",
      `${height}px`
    );
  }

  function tiddlersCount(event) {
    const { widget } = event;
    var tiddlersCount = widget.list.length;
    document.body.style.setProperty("--tiddler-count", tiddlersCount);
  }

  function scroll(event) {
    if (!isInKrystalLayout) {
      return;
    }
    const { target: tiddlerElement } = event;
    const mediaQueryList = window.matchMedia("(min-width: 960px)");

    if (mediaQueryList.matches) {
      var storyRiver = tiddlerElement.parentElement;

      var tiddlers = Array.from(
        storyRiver.querySelectorAll("div[data-tiddler-title]")
      );
      var tiddlerPosition = tiddlers.indexOf(tiddlerElement);
      var tiddlerWidth = $tw.wiki.getTiddler(KRYSTAL_CONFIG.tiddlerwidth).fields
        .text;
      var windowWidth = window.innerWidth;

      var position = windowWidth / 2 - tiddlerWidth / 2;
      var newRiverPosition = Math.max(
        tiddlerPosition * tiddlerWidth - position,
        0
      );

      storyRiver.scroll({ left: newRiverPosition, behavior: "smooth" });
    } else {
      tiddlerElement.scrollIntoView({ behavior: "smooth" });
    }
  }

  function tiddlerFrameEffects() {
    if (!isInKrystalLayout) {
      return;
    }
    var tiddlers = Array.from(document.querySelectorAll(".tc-tiddler-frame"));
    var tiddlersCount = tiddlers.length;

    if (tiddlersCount === 0) {
      return;
    }

    var offset = 100;
    var tiddlerPadding = Number(
      window.getComputedStyle(tiddlers[0]).paddingRight.slice(0, -2)
    );
    var tiddlerWidth = tiddlers[0].offsetWidth;
    var windowWidth = window.innerWidth;

    tiddlers.forEach(function (tiddler, i) {
      if (i === 0) {
        return;
      }

      var tiddlerTitle = tiddler.querySelector(".krystal-tiddler__title");

      // Edit Template
      if (!tiddlerTitle) {
        return;
      }

      var previousTiddler = tiddlers[i - 1];
      var previousTiddlerTitle = previousTiddler.querySelector(
        ".krystal-tiddler__title"
      );

      var x = tiddler.getBoundingClientRect().left;

      var start = x < offset + i * tiddlerPadding;
      var end =
        x > windowWidth - (offset + (tiddlersCount - i) * tiddlerPadding);

      var startOverlay = x < tiddlerWidth + (i - 1) * tiddlerPadding;

      tiddler.classList.toggle("krystal-tiddler__frame--overlay", startOverlay);

      if (previousTiddlerTitle) {
        previousTiddlerTitle.classList.toggle(
          "krystal-tiddler__title--start-active",
          start
        );

        if (!end) {
          previousTiddler.classList.toggle(
            "krystal-tiddler__frame--hide",
            start
          );
        }
      }

      if (start) {
        tiddlerTitle.classList.remove("krystal-tiddler__title--end");
      }

      if (end) {
        tiddler.classList.add("krystal-tiddler__frame--overlay");
        tiddler.classList.add("krystal-tiddler__frame--hide");
        tiddlerTitle.classList.add(
          "krystal-tiddler__title--end",
          "krystal-tiddler__title--end-active"
        );
      } else {
        if (!startOverlay) {
          tiddler.classList.remove("krystal-tiddler__frame--overlay");
        }

        tiddler.classList.remove("krystal-tiddler__frame--hide");
        tiddlerTitle.classList.remove("krystal-tiddler__title--end-active");
      }
    });
  }

  function reinitiateTiddlerFrameEffects(changes) {
    if (!isInKrystalLayout) {
      return;
    }
    if (!$tw.utils.hop(changes, STORY_TIDDLER_TITLE)) {
      return;
    }
    var duration = $tw.utils.getAnimationDuration() || 0;
    setTimeout(tiddlerFrameEffects, duration);
  }

  function closeTiddlersToRight(event) {
    if (!isInKrystalLayout) {
      return event;
    }
    const storyTiddler = $tw.wiki.getTiddler(STORY_TIDDLER_TITLE);
    const tiddlers = $tw.wiki.getTiddlerList(STORY_TIDDLER_TITLE);

    const navigateFrom = event.navigateFromTitle;
    const navigateTo = event.navigateTo;

    const config = $tw.wiki.getTiddler(
      "$:/plugins/linonetwo/krystal/config/close"
    );

    if (config && config.fields && config.fields.text === "disable") {
      return event;
    }

    // Navigating from outside open tiddlers
    if (!navigateFrom) {
      return event;
    }

    // Destination tiddler already open
    if (tiddlers.indexOf(navigateTo) === -1) {
      const currentTiddlerIndex = tiddlers.indexOf(navigateFrom);
      const tiddlersToClose = tiddlers.slice(currentTiddlerIndex + 1);

      if (tiddlersToClose.length === 0) {
        return event;
      }

      const newStoryList = tiddlers.filter(
        (title) => !tiddlersToClose.includes(title)
      );

      $tw.wiki.addTiddler(
        new $tw.Tiddler({ title: STORY_TIDDLER_TITLE }, storyTiddler, {
          list: newStoryList,
        })
      );
    }

    return event;
  }

  function tiddlerFullscreen(tiddlerTitle) {
    if (!isInKrystalLayout) {
      return;
    }
    const tiddler = document.querySelector(
      `div[data-tiddler-title="${tiddlerTitle}"]`
    );

    tiddler.classList.toggle(MAXIMIZED_TIDDLER_CLASS);
  }

  // ---

  function throttle(callback, limit) {
    var wait = false; // Initially, we're not waiting

    return function () {
      // We return a throttled function
      if (!wait) {
        // If we're not waiting
        callback.call(); // Execute users function
        wait = true; // Prevent future invocations
        setTimeout(function () {
          // After a period of time
          wait = false; // And allow future invocations
        }, limit);
      }
    };
  }
};
