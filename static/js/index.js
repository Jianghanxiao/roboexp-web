document.addEventListener("DOMContentLoaded", () => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stars = document.querySelector("[data-github-stars]");
  if (stars && window.fetch) {
    fetch("https://api.github.com/repos/Jianghanxiao/RoboEXP", {
      headers: { Accept: "application/vnd.github+json" }
    })
      .then((response) => {
        if (!response.ok) throw new Error("GitHub request failed");
        return response.json();
      })
      .then((repository) => {
        if (!Number.isFinite(repository.stargazers_count)) return;
        stars.textContent = new Intl.NumberFormat("en-US").format(repository.stargazers_count) + " stars";
        stars.title = "Live GitHub star count";
      })
      .catch(() => {
        // Keep the stable fallback when GitHub is offline or rate-limited.
      });
  }

  const loadVideo = (video) => {
    if (video.dataset.loaded === "true") return;

    video.dataset.loaded = "true";
    video.src = video.dataset.src;
    video.load();

    const markLoaded = () => video.classList.add("is-loaded");
    video.addEventListener("loadeddata", markLoaded, { once: true });
    video.addEventListener("error", markLoaded, { once: true });
  };

  const lazyVideos = [...document.querySelectorAll("video[data-src]")];

  if ("IntersectionObserver" in window) {
    const loadObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          loadVideo(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "420px 0px", threshold: 0.01 }
    );

    const playbackObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;

          if (!entry.isIntersecting) {
            if (!video.paused) video.dataset.resumeOnView = "true";
            video.pause();
            return;
          }

          const shouldResume =
            video.hasAttribute("data-autoplay") ||
            video.hasAttribute("autoplay") ||
            video.dataset.resumeOnView === "true";

          if (!reducedMotion && shouldResume) {
            if (video.dataset.src) loadVideo(video);
            delete video.dataset.resumeOnView;
            video.play().catch(() => {
              // Controls remain available when a browser declines autoplay.
            });
          }
        });
      },
      { rootMargin: "160px 0px", threshold: 0.12 }
    );

    lazyVideos.forEach((video) => {
      loadObserver.observe(video);
      playbackObserver.observe(video);
    });

    document.querySelectorAll("video[autoplay]").forEach((video) => {
      playbackObserver.observe(video);
    });
  } else {
    lazyVideos.forEach(loadVideo);
  }

  if (reducedMotion) {
    document.querySelectorAll("video").forEach((video) => video.pause());
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    document.querySelectorAll("video").forEach((video) => video.pause());
  });

  const interactiveButton = document.querySelector("[data-load-interactive]");
  interactiveButton?.addEventListener("click", () => {
    const frame = interactiveButton.closest("[data-interactive-frame]");
    const iframe = frame?.querySelector("iframe[data-src]");

    if (!frame || !iframe) return;
    interactiveButton.disabled = true;
    iframe.src = iframe.dataset.src;
    frame.classList.add("is-loaded");
  });

  const copyButton = document.querySelector("[data-copy-bibtex]");
  const bibtex = document.querySelector("#bibtex-code");

  const fallbackCopy = (text) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  };

  copyButton?.addEventListener("click", async () => {
    if (!bibtex) return;

    try {
      const citation = bibtex.textContent.trim();
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(citation);
      } else {
        fallbackCopy(citation);
      }

      copyButton.textContent = "Copied";
      copyButton.classList.add("is-copied");
      window.setTimeout(() => {
        copyButton.textContent = "Copy citation";
        copyButton.classList.remove("is-copied");
      }, 1800);
    } catch {
      copyButton.textContent = "Select & copy";
    }
  });

  document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const viewport = carousel.querySelector("[data-carousel-track]");
    const cards = [...carousel.querySelectorAll(".motion-card")];
    const previous = carousel.querySelector("[data-carousel-prev]");
    const next = carousel.querySelector("[data-carousel-next]");
    const status = carousel.querySelector("[data-carousel-status]");
    const progress = carousel.querySelector("[data-carousel-progress]");

    if (!viewport || !cards.length) return;

    const cardMetrics = () => {
      const width = cards[0].getBoundingClientRect().width;
      const track = viewport.querySelector(".showreel-track");
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      const visible = Math.max(1, Math.round(viewport.clientWidth / (width + gap)));
      return { width, gap, visible };
    };

    const updateCarousel = () => {
      const { width, gap, visible } = cardMetrics();
      const first = Math.min(cards.length - 1, Math.max(0, Math.round(viewport.scrollLeft / (width + gap))));
      const last = Math.min(cards.length, first + visible);
      const pad = (value) => String(value).padStart(2, "0");

      if (status) status.textContent = pad(first + 1) + "–" + pad(last) + " / " + pad(cards.length);
      if (progress) progress.style.width = Math.max(8, (last / cards.length) * 100) + "%";
      if (previous) previous.disabled = viewport.scrollLeft <= 3;
      if (next) next.disabled = viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 3;
    };

    const move = (direction) => {
      const { width, gap, visible } = cardMetrics();
      viewport.scrollBy({
        left: direction * (width + gap) * visible,
        behavior: reducedMotion ? "auto" : "smooth"
      });
    };

    previous?.addEventListener("click", () => move(-1));
    next?.addEventListener("click", () => move(1));

    let ticking = false;
    viewport.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          updateCarousel();
          ticking = false;
        });
      },
      { passive: true }
    );

    window.addEventListener("resize", updateCarousel);
    updateCarousel();
  });
});
