const helpToggle = document.getElementById('help-toggle');
const help = document.getElementById('admin-help');
const loading = document.getElementById('admin-loading');
const retry = document.getElementById('retry-loading');
const root = document.getElementById('nc-root');
const frame = document.getElementById('cms-frame');
let loadingTimeout;

helpToggle.addEventListener('click', () => {
  help.hidden = !help.hidden;
  helpToggle.setAttribute('aria-expanded',String(!help.hidden));
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !help.hidden) {
    help.hidden = true;
    helpToggle.setAttribute('aria-expanded','false');
    helpToggle.focus();
  }
});
function showLoadError() {
  document.getElementById('loading-spinner').hidden = true;
  document.getElementById('loading-title').textContent = 'Panel belum dapat dimuat';
  document.getElementById('loading-description').textContent = 'Periksa koneksi internet, lalu coba muat ulang panel.';
  retry.hidden = false;
  root.setAttribute('aria-busy','false');
}
function loadCms() {
  clearTimeout(loadingTimeout);
  loading.hidden = false;
  root.setAttribute('aria-busy','true');
  document.getElementById('loading-spinner').hidden = false;
  document.getElementById('loading-title').textContent = 'Menyiapkan ruang kerja...';
  document.getElementById('loading-description').textContent = 'Panel admin akan segera tampil di sini.';
  retry.hidden = true;
  const url = new URL(frame.dataset.src,window.location.href);
  url.searchParams.set('reload',String(Date.now()));
  frame.src = url.href;
  loadingTimeout = setTimeout(showLoadError,30000);
}
window.addEventListener('message', event => {
  if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
  if (event.data?.type === 'tobapia-admin-ready') {
    clearTimeout(loadingTimeout);
    loading.hidden = true;
    root.setAttribute('aria-busy','false');
  } else if (event.data?.type === 'tobapia-admin-error') {
    clearTimeout(loadingTimeout);
    showLoadError();
  }
});
frame.addEventListener('error',showLoadError);
retry.addEventListener('click',loadCms);
loadCms();
