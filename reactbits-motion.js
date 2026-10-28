/*
 * Motion adapter based on the interaction patterns of React Bits
 * AnimatedContent, SplitText and Magnet.
 * Copyright (c) 2026 David Haz — MIT + Commons Clause.
 * https://reactbits.dev/
 */
(() => {
  'use strict';

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
  const observed = new WeakSet();
  const splitObserved = new WeakSet();
  const autoMotionSelector = '.task-row, tbody > tr, .forecast-grid > .day, .history-list > li';

  const reveal = element => {
    element.classList.add('rb-in');
    if (element.classList.contains('rb-split')) element.classList.add('rb-split-in');
  };

  const observer = reduced || !('IntersectionObserver' in window)
    ? null
    : new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  const mountReveal = element => {
    requestAnimationFrame(() => requestAnimationFrame(() => reveal(element)));
  };

  const prepareMotion = element => {
    if (observed.has(element)) return;
    observed.add(element);
    element.classList.add('rb-prepared');
    const delay = Number(element.dataset.rbDelay || 0);
    const duration = Number(element.dataset.rbDuration || 0);
    const distance = Number(element.dataset.rbDistance || 0);
    if (delay) element.style.setProperty('--rb-delay', `${delay}s`);
    if (duration) element.style.setProperty('--rb-duration', `${duration}s`);
    if (distance) element.style.setProperty('--rb-distance', `${distance}px`);
    if (reduced || !observer) reveal(element);
    else if (element.dataset.rbTrigger === 'mount') mountReveal(element);
    else observer.observe(element);
  };

  const prepareStagger = element => {
    if (observed.has(element)) return;
    observed.add(element);
    element.classList.add('rb-stagger-ready');
    const step = Number(element.dataset.rbStaggerStep || 0.075);
    Array.from(element.children).forEach((child, index) => {
      child.style.setProperty('--rb-item-delay', `${index * step}s`);
    });
    if (reduced || !observer) reveal(element);
    else if (element.dataset.rbTrigger === 'mount') mountReveal(element);
    else observer.observe(element);
  };

  const splitWords = element => {
    if (splitObserved.has(element)) return;
    splitObserved.add(element);
    const accessibleText = element.innerText.replace(/\s+/g, ' ').trim();
    if (!accessibleText) return;
    element.setAttribute('aria-label', accessibleText);
    element.classList.add('rb-split');

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
    }

    let wordIndex = 0;
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(token => {
        if (!token) return;
        if (/^\s+$/.test(token)) {
          fragment.appendChild(document.createTextNode(token));
          return;
        }
        const mask = document.createElement('span');
        const word = document.createElement('span');
        mask.className = 'rb-word-mask';
        mask.setAttribute('aria-hidden', 'true');
        word.className = 'rb-word';
        word.textContent = token;
        word.style.setProperty('--rb-word-delay', `${wordIndex * 0.055}s`);
        wordIndex += 1;
        mask.appendChild(word);
        fragment.appendChild(mask);
      });
      node.replaceWith(fragment);
    });

    if (reduced || !observer) reveal(element);
    else if (element.dataset.rbSplit === 'mount') mountReveal(element);
    else observer.observe(element);
  };

  const attachTilt = element => {
    if (!finePointer || reduced || element.dataset.rbTiltReady) return;
    element.dataset.rbTiltReady = 'true';
    element.addEventListener('pointermove', event => {
      const box = element.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      element.style.setProperty('--rb-tilt-x', `${(-y * 7).toFixed(2)}deg`);
      element.style.setProperty('--rb-tilt-y', `${(x * 9).toFixed(2)}deg`);
    });
    element.addEventListener('pointerleave', () => {
      element.style.setProperty('--rb-tilt-x', '0deg');
      element.style.setProperty('--rb-tilt-y', '0deg');
    });
  };

  const attachMagnet = element => {
    if (!finePointer || reduced || element.dataset.rbMagnetReady) return;
    element.dataset.rbMagnetReady = 'true';
    element.addEventListener('pointermove', event => {
      const box = element.getBoundingClientRect();
      const x = (event.clientX - box.left - box.width / 2) / box.width;
      const y = (event.clientY - box.top - box.height / 2) / box.height;
      element.style.translate = `${(x * 12).toFixed(2)}px ${(y * 8).toFixed(2)}px`;
    });
    element.addEventListener('pointerleave', () => { element.style.translate = ''; });
  };

  const prepareDynamicItem = element => {
    if (element.hasAttribute('data-rb')) return;
    const siblings = Array.from(element.parentElement?.children || []);
    const index = Math.max(siblings.indexOf(element), 0);
    if (element.matches('.history-list > li')) element.dataset.rb = 'slide-right';
    else if (element.matches('.forecast-grid > .day')) element.dataset.rb = 'slide-up';
    else if (element.matches('.task-row')) element.dataset.rb = index % 2 ? 'slide-right' : 'slide-left';
    else element.dataset.rb = 'slide-left';
    element.dataset.rbDistance = '22';
    element.dataset.rbDuration = '0.5';
    element.dataset.rbDelay = String(Math.min(index * 0.045, 0.22));
    prepareMotion(element);
  };

  const initialize = root => {
    const scope = root instanceof Element ? root : document;
    if (scope.matches?.(autoMotionSelector)) prepareDynamicItem(scope);
    if (scope.matches?.('[data-rb]')) prepareMotion(scope);
    if (scope.matches?.('[data-rb-stagger]')) prepareStagger(scope);
    if (scope.matches?.('[data-rb-split]')) splitWords(scope);
    if (scope.matches?.('[data-rb-tilt]')) attachTilt(scope);
    if (scope.matches?.('[data-rb-magnet]')) attachMagnet(scope);
    scope.querySelectorAll?.('[data-rb]').forEach(prepareMotion);
    scope.querySelectorAll?.('[data-rb-stagger]').forEach(prepareStagger);
    scope.querySelectorAll?.('[data-rb-split]').forEach(splitWords);
    scope.querySelectorAll?.('[data-rb-tilt]').forEach(attachTilt);
    scope.querySelectorAll?.('[data-rb-magnet]').forEach(attachMagnet);
    scope.querySelectorAll?.(autoMotionSelector).forEach(prepareDynamicItem);
  };

  document.documentElement.classList.add('rb-motion-ready');
  initialize(document);

  const mutations = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof Element) initialize(node);
    }));
  });
  mutations.observe(document.body, { childList: true, subtree: true });
})();
