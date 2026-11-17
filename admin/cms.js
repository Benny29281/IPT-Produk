window.CMS_MANUAL_INIT = true;

function notifyParent(type) {
  window.parent.postMessage({type},window.location.origin);
}

const library = document.createElement('script');
library.src = 'https://unpkg.com/@sveltia/cms/dist/sveltia-cms.js';
library.onload = async () => {
  try {
    await window.CMS.init({config:{logo:{src:new URL('../images/Tobapia-01.png',window.location.href).href,show_in_header:true}}});
    notifyParent('tobapia-admin-ready');
  } catch (error) {
    console.error('CMS initialization failed',error);
    notifyParent('tobapia-admin-error');
  }
};
library.onerror = () => notifyParent('tobapia-admin-error');
document.head.append(library);
