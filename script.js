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
  const closeBtn = document.querySelector('#imageModal .close'); // më saktë
  
  // Map of known item slugs -> image URLs (add more as you upload)
  const imageMap = {
    '4-formaggi': 'https://raw.githubusercontent.com/lido-azzurro/lido-azzurro.github.io/main/4%20formaggi.png?raw=true'
  };

  // Select all dish items (me ose pa data-img)
  const dishItems = document.querySelectorAll('.sub-section ul li');

  dishItems.forEach(item => {
    const text = item.getAttribute('data-name') || item.textContent.trim();
    const slug = text ? text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';

    // If the item has a thumbnail or image attribute, use it; otherwise check imageMap
    let thumbSrc = item.getAttribute('data-thumb') || item.getAttribute('data-img');
    if (!thumbSrc && slug && imageMap[slug]) {
      thumbSrc = imageMap[slug];
      // set attributes so modal and other logic see the image
      item.setAttribute('data-thumb', thumbSrc);
      item.setAttribute('data-img', thumbSrc);
      console.info('Applied imageMap for', text, '->', thumbSrc);
    }

    if (thumbSrc) {
      // avoid duplicating if page re-renders
      if (!item.querySelector('.dish-thumb')) {
        const imgEl = document.createElement('img');
        imgEl.className = 'dish-thumb';
        imgEl.src = thumbSrc;
        imgEl.alt = item.getAttribute('data-name') || item.textContent.trim();
        item.appendChild(imgEl); // places thumbnail to the right of the text
      }
    } else {
      // No explicit thumb: try to find one in /images/ based on name
      attemptFindImage(item).catch(err => console.info('attemptFindImage error', err));
    }

    const openModal = (e) => {
      if (e && e.type === 'touchend') e.preventDefault();
      e.stopPropagation();
      const img = item.getAttribute('data-img') || item.getAttribute('data-thumb') || '';
      const name = item.getAttribute('data-name') || item.textContent.trim();
      const price = item.getAttribute('data-price') || '';
      const desc = item.getAttribute('data-desc') || '';
      if (!img && !name && !price && !desc) return;
      const modalImage = document.getElementById('modalImage');
      const modalTitle = document.getElementById('modalTitle');
      const modalDesc = document.getElementById('modalDesc');
      const modalPrice = document.getElementById('modalPrice');
      if modalImage) { modalImage.src = img; modalImage.alt = name; }
      if (modalTitle) modalTitle.textContent = name;
      if (modalDesc) modalDesc.textContent = desc;
      if (modalPrice) modalPrice.textContent = price ? ("Prezzo: " + price) : '';
      if (modal) { modal.style.display = 'block'; console.info('Opened modal for', name); }
    };

    // attach both click and touchend for mobile reliability
    item.addEventListener('click', openModal);
    item.addEventListener('touchend', openModal);
  });
  
  // Përzgjedh të gjitha li me data-img (edhe nëse ka karaktere të çuditshme)
  const dishItemsWithImg = document.querySelectorAll('.sub-section ul li[data-img]');

  dishItemsWithImg.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const img = item.getAttribute('data-img');
      const name = item.getAttribute('data-name');
      const price = item.getAttribute('data-price');
      const desc = item.getAttribute('data-desc');

      // Kontrollo që img ekziston
      if (img) {
        document.getElementById('modalImage').src = img;
        document.getElementById('modalTitle').textContent = name || '';
        document.getElementById('modalDesc').textContent = desc || '';
        document.getElementById('modalPrice').textContent = price ? "Çmim: " + price : '';
        modal.style.display = 'block';
      }
    });
  });

  // Close modal handlers (use both click + touchend)
  if (closeBtn) {
    const closeHandler = (e) => {
      if (e && e.type === 'touchend') e.preventDefault();
      e.stopPropagation();
      if (modal) modal.style.display = 'none';
      const modalImage = document.getElementById('modalImage');
      if (modalImage) modalImage.src = '';
      console.info('Modal closed');
    };
    closeBtn.addEventListener('click', closeHandler);
    closeBtn.addEventListener('touchend', closeHandler);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        const modalImage = document.getElementById('modalImage');
        if (modalImage) modalImage.src = '';
        console.info('Modal closed by backdrop');
      }
    });
  }
  
  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'block') {
      modal.style.display = 'none';
      const modalImage = document.getElementById('modalImage');
      if (modalImage) modalImage.src = '';
      console.info('Modal closed by Escape');
    }
  });
});