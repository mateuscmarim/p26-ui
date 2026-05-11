const cache = {};

function selectorFor(name) {
  return name.startsWith("[") ? name : `[data-id="${name}"]`;
}

function getTemplate(name) {
  const key = selectorFor(name);
  if (!cache[key]) {
    const node = document.querySelector(`#templates ${key}`);
    if (!node) return null;
    cache[key] = $(node);
  }
  return cache[key];
}

export const TemplateUtil = {
  copyTemplate(name) {
    const $tpl = getTemplate(name);
    if (!$tpl) throw new Error(`Template not found: ${name}`);
    return $tpl.clone(true, true);
  },
  reset() {
    Object.keys(cache).forEach((k) => delete cache[k]);
  },
};

if (typeof window !== "undefined") {
  window.TemplateUtil = TemplateUtil;
}
