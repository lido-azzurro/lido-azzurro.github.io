document.addEventListener('DOMContentLoaded', () => {
  console.info('script.js loaded'); // debug

  // Funksionaliteti i ndërprerjes së tab-ve
  const tablinks = document.querySelectorAll('.tablink');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tablinks.forEach(button => {
    button.addEventListener('click', () => {
      // Hiq klasat aktive prej të gjithë butonave dhe përmbajtjeve
      tablinks.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Shto klasën aktive në butonin e shtypur dhe përmbajtjen përkatëse
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Modal functionality
  const modal = document.getElementById('imageModal');
  
  const closeModal = () => {
    if (modal) modal.style.display = 'none';
    const modalImage = document.getElementById('modalImage');
    if (modalImage) modalImage.src = '';
    document.body.classList.remove('modal-open');
    console.info('Modal closed');
  };
  
  // Map of known item slugs -> image URLs (fallback when data-img not set)
  const imageMap = {};

  // Select all dish items (me ose pa data-img)
  const dishItems = document.querySelectorAll('.sub-section ul li');

  dishItems.forEach(item => {
    const text = item.getAttribute('data-name') || item.textContent.trim();
    const slug = text ? text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';

    // If the item has a thumbnail or image attribute, use it; otherwise check imageMap
    const existingThumbEl = item.querySelector('img.dish-thumb');
    let thumbSrc = item.getAttribute('data-thumb') || item.getAttribute('data-img') || (existingThumbEl ? existingThumbEl.getAttribute('src') : null);
    if (!thumbSrc && slug && imageMap[slug]) {
      thumbSrc = imageMap[slug];
      // set attributes so modal and other logic see the image
      item.setAttribute('data-thumb', thumbSrc);
      item.setAttribute('data-img', thumbSrc);
      console.info('Applied imageMap for', text, '->', thumbSrc);
    }

    if (thumbSrc) {
      if (!item.hasAttribute('data-thumb')) item.setAttribute('data-thumb', thumbSrc);
      if (!item.hasAttribute('data-img')) item.setAttribute('data-img', thumbSrc);
    }

    let triggerEl = null;
    if (thumbSrc) {
      if (existingThumbEl) {
        if (!existingThumbEl.getAttribute('src') && thumbSrc) existingThumbEl.setAttribute('src', thumbSrc);
      } else if (!item.querySelector('.dish-thumb')) {
        const imgEl = document.createElement('img');
        imgEl.className = 'dish-thumb';
        imgEl.src = thumbSrc;
        imgEl.alt = item.getAttribute('data-name') || item.textContent.trim();
        item.insertBefore(imgEl, item.firstChild);
      }
      triggerEl = item.querySelector('.dish-thumb');
    } else if ((item.textContent || '').trim() !== '') {
      if (!item.querySelector('.modal-trigger')) {
        const placeholder = document.createElement('div');
        placeholder.className = 'modal-trigger';
        placeholder.setAttribute('aria-label', 'Vedi dettagli');
        placeholder.textContent = 'i';
        item.insertBefore(placeholder, item.firstChild);
      }
      triggerEl = item.querySelector('.modal-trigger');
    }

    const openModal = (e) => {
      if (e && e.type === 'touchend') e.preventDefault();
      e.stopPropagation();
      const img = item.getAttribute('data-img') || item.getAttribute('data-thumb') || '';
      const getItemText = () => {
        const parts = [];
        item.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const t = (node.textContent || '').trim();
            if (t) parts.push(t);
            return;
          }
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node;
            if (el.classList && (el.classList.contains('modal-trigger') || el.classList.contains('dish-thumb'))) return;
            const t = (el.textContent || '').trim();
            if (t) parts.push(t);
          }
        });
        return parts.join(' ').replace(/\s+/g, ' ').trim();
      };
      const name = item.getAttribute('data-name') || getItemText();
      const price = item.getAttribute('data-price') || '';
      const desc = item.getAttribute('data-desc') || '';
      if (!img && !name && !price && !desc) return;
      const modalImage = document.getElementById('modalImage');
      const modalTitle = document.getElementById('modalTitle');
      const modalDesc = document.getElementById('modalDesc');
      const modalPrice = document.getElementById('modalPrice');
      if (modalImage) {
        if (img) {
          modalImage.src = img;
          modalImage.alt = name;
          modalImage.style.display = '';
        } else {
          modalImage.src = '';
          modalImage.style.display = 'none';
        }
      }
      if (modalTitle) modalTitle.textContent = name;
      if (modalDesc) modalDesc.textContent = desc;
      if (modalPrice) modalPrice.textContent = price ? ("Prezzo: " + price) : '';
      if (modal) { 
        modal.style.display = 'flex';          // center using flex
        document.body.classList.add('modal-open'); // prevent background scroll
        console.info('Opened modal for', name);
      }
    };

    if (triggerEl) {
      triggerEl.addEventListener('click', openModal);
      triggerEl.addEventListener('touchend', openModal, { passive: false });
    }
  });
  
  // Close modal: event delegation on the modal so X button and backdrop both work
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('.close')) {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
      }
    });
    modal.addEventListener('touchend', (e) => {
      if (e.target === modal || e.target.closest('.close')) {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
      }
    }, { passive: false });
  }

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
      closeModal();
    }
  });
});