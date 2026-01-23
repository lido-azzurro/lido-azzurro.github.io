document.addEventListener('DOMContentLoaded', () => {
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
  
  // Kur klikohet një pjatë (VETËM për artikujt pa foto)
  const dishItemsWithoutImg = document.querySelectorAll('.sub-section ul li:not([data-img])');
  
  dishItemsWithoutImg.forEach(item => {
    item.addEventListener('click', () => {
      const fullText = item.textContent.trim();
      // Thjesht mund të shtosh më vonë nëse dëshiron
    });
  });
  
  // Modal functionality
  const modal = document.getElementById('imageModal');
  const closeBtn = document.querySelector('.close');
  
  const dishItemsWithImg = document.querySelectorAll('.sub-section ul li[data-img]');
  
  dishItemsWithImg.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const img = item.getAttribute('data-img');
      const name = item.getAttribute('data-name');
      const price = item.getAttribute('data-price');
      const desc = item.getAttribute('data-desc');
      
      document.getElementById('modalImage').src = img;
      document.getElementById('modalTitle').textContent = name;
      document.getElementById('modalDesc').textContent = desc;
      document.getElementById('modalPrice').textContent = "Çmim: " + price;
      
      modal.style.display = 'block';
    });
  });
  
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
});
