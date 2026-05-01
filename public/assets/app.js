document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-confirm]');
  if (!target) {
    return;
  }

  const message = target.getAttribute('data-confirm');
  if (message && !window.confirm(message)) {
    event.preventDefault();
  }
});
