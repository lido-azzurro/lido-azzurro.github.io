import { pumping } from './pumping.js';
import { solar } from './solar.js';
import { filtration } from './filtration.js';
import { hardness } from './hardness.js';
import { treatment } from './treatment.js';

const SIMS = { pumping, solar, filtration, hardness, treatment };

const root = document.getElementById('simRoot');
const tabs = Array.from(document.querySelectorAll('.tab'));

let activeKey = null;
let cleanup = null;

function setActiveTab(key){
  tabs.forEach(btn => btn.classList.toggle('is-active', btn.dataset.sim === key));
}

function mount(key){
  if (!SIMS[key]) return;
  if (cleanup) cleanup();
  root.innerHTML = '';
  activeKey = key;
  setActiveTab(key);
  cleanup = SIMS[key].init(root) || null;
  history.replaceState(null, '', `#${key}`);
}

tabs.forEach(btn => btn.addEventListener('click', () => mount(btn.dataset.sim)));

const initial = (location.hash || '#pumping').slice(1);
mount(SIMS[initial] ? initial : 'pumping');
