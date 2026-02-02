import { pumping } from './pumping.js';
import { solar } from './solar.js';
import { filtration } from './filtration.js';
import { hardness } from './hardness.js';
import { treatment } from './treatment.js';

const SIMS = { pumping, solar, filtration, hardness, treatment };

const root = document.getElementById('simRoot');
const tabs = Array.from(document.querySelectorAll('.tab'));
const navSimLinks = Array.from(document.querySelectorAll('.nav-menu a[data-sim]'));
const navDetails = document.querySelector('.nav-item');

let activeKey = null;
let cleanup = null;

function setActiveNav(key){
  navSimLinks.forEach(a => a.classList.toggle('is-current', a.dataset.sim === key));
}

function getKeyFromHash(){
  const key = (location.hash || '#pumping').slice(1);
  return SIMS[key] ? key : 'pumping';
}

function setActiveTab(key){
  tabs.forEach(btn => btn.classList.toggle('is-active', btn.dataset.sim === key));
}

function mount(key){
  if (!SIMS[key]) return;
  if (cleanup) cleanup();
  root.innerHTML = '';
  activeKey = key;
  setActiveTab(key);
  setActiveNav(key);
  cleanup = SIMS[key].init(root) || null;
  if (location.hash !== `#${key}`) history.replaceState(null, '', `#${key}`);
  if (navDetails && navDetails.open) navDetails.open = false;
}

tabs.forEach(btn => btn.addEventListener('click', () => mount(btn.dataset.sim)));

navSimLinks.forEach(a => a.addEventListener('click', (e) => {
  const key = a.dataset.sim;
  if (!key) return;
  e.preventDefault();
  mount(key);
}));

window.addEventListener('hashchange', () => {
  const next = getKeyFromHash();
  if (next !== activeKey) mount(next);
});

mount(getKeyFromHash());
