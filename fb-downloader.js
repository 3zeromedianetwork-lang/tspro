/**
 * FB Downloader Pro - Client-side JavaScript v3
 * Handles cookies, URL input, API calls, and result display
 */

(function() {
  'use strict';

  // DOM Elements
  const urlInput = document.getElementById('fb-url-input');
  const fetchBtn = document.getElementById('fetch-btn');
  const pasteBtn = document.getElementById('paste-btn');
  const retryBtn = document.getElementById('retry-btn');
  const toggleRawBtn = document.getElementById('toggle-raw-btn');
  const copyTextBtn = document.getElementById('copy-text-btn');
  const cookieToggleBtn = document.getElementById('cookie-toggle-btn');
  const cookiePanel = document.getElementById('cookie-panel');
  const cookieInput = document.getElementById('cookie-input');
  const cookieSaveBtn = document.getElementById('cookie-save-btn');

  const heroSection = document.getElementById('hero');
  const loadingSection = document.getElementById('loading-section');
  const errorSection = document.getElementById('error-section');
  const resultsSection = document.getElementById('results-section');

  const typeBtns = document.querySelectorAll('.type-btn');
  let selectedType = 'auto';
  let cookiesSaved = localStorage.getItem('fb_cookies_saved') === 'true';

  // Init cookie status
  updateCookieStatus();

  // ========== COOKIE MANAGEMENT ==========
  
  cookieToggleBtn.addEventListener('click', () => {
    cookiePanel.style.display = cookiePanel.style.display === 'none' ? 'block' : 'none';
  });

  cookieSaveBtn.addEventListener('click', async () => {
    const rawCookies = cookieInput.value.trim();
    if (!rawCookies) {
      showToast('⚠️ Please paste your Facebook cookies');
      return;
    }

    // Convert browser cookie string to Netscape format for cURL
    const netscapeCookies = convertToNetscape(rawCookies);
    
    try {
      const resp = await fetch('./api/fb_scraper.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: netscapeCookies })
      });
      const data = await resp.json();
      
      if (data.success) {
        cookiesSaved = true;
        localStorage.setItem('fb_cookies_saved', 'true');
        updateCookieStatus();
        cookiePanel.style.display = 'none';
        showToast('✅ Cookies saved! You can now scrape FB content');
      } else {
        showToast('❌ Failed to save cookies');
      }
    } catch (err) {
      showToast('❌ Error: ' + err.message);
    }
  });

  function convertToNetscape(browserCookies) {
    // Convert "key=value; key2=value2" format to Netscape cookie file format
    const lines = ['# Netscape HTTP Cookie File'];
    const pairs = browserCookies.split(';');
    
    pairs.forEach(pair => {
      const eqIdx = pair.indexOf('=');
      if (eqIdx === -1) return;
      const name = pair.substring(0, eqIdx).trim();
      const value = pair.substring(eqIdx + 1).trim();
      if (!name) return;
      
      // Format: domain  flag  path  secure  expiry  name  value
      lines.push(`.facebook.com\tTRUE\t/\tTRUE\t0\t${name}\t${value}`);
    });
    
    return lines.join('\n');
  }

  function updateCookieStatus() {
    const icon = document.getElementById('cookie-status-icon');
    const text = document.getElementById('cookie-status-text');
    
    if (cookiesSaved) {
      icon.textContent = '✅';
      text.textContent = 'FB Cookies Connected';
      cookieToggleBtn.classList.add('connected');
    } else {
      icon.textContent = '🔒';
      text.textContent = 'Setup FB Cookies (Required for scraping)';
      cookieToggleBtn.classList.remove('connected');
    }
  }

  // ========== TYPE SELECTOR ==========

  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.dataset.type;
    });
  });

  // ========== UI ACTIONS ==========

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      urlInput.value = text;
      urlInput.focus();
      showToast('📋 Pasted from clipboard!');
    } catch {
      showToast('⚠️ Could not access clipboard');
    }
  });

  fetchBtn.addEventListener('click', () => startScraping());
  urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') startScraping(); });
  retryBtn.addEventListener('click', () => startScraping());

  toggleRawBtn.addEventListener('click', () => {
    const raw = document.getElementById('raw-json');
    raw.style.display = raw.style.display === 'none' ? 'block' : 'none';
  });

  copyTextBtn.addEventListener('click', () => {
    const text = document.getElementById('post-text').innerText;
    navigator.clipboard.writeText(text).then(() => showToast('✅ Text copied!')).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✅ Text copied!');
    });
  });

  // ========== MAIN SCRAPING ==========

  async function startScraping() {
    const url = urlInput.value.trim();
    if (!url) { showToast('⚠️ Please paste a Facebook URL'); urlInput.focus(); return; }
    if (!/facebook\.com|fb\.watch|fb\.com/i.test(url)) { showToast('⚠️ Invalid Facebook URL'); return; }

    showSection('loading');
    animateLoadingSteps();

    try {
      const response = await fetch('./api/fb_scraper.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type: selectedType })
      });

      const data = await response.json();

      if (!data.success) {
        showError(data.error || 'Failed to scrape content');
        return;
      }

      // Check if cookies are needed
      if (data.needCookies && !cookiesSaved) {
        showSection('hero');
        cookiePanel.style.display = 'block';
        showToast('🔒 Facebook requires login. Please add your cookies above!');
        return;
      }

      displayResults(data);
    } catch (err) {
      showError('Network error: ' + err.message);
    }
  }

  // ========== UI HELPERS ==========

  function showSection(section) {
    heroSection.style.display = section === 'hero' ? 'block' : 'none';
    loadingSection.style.display = section === 'loading' ? 'block' : 'none';
    errorSection.style.display = section === 'error' ? 'block' : 'none';
    resultsSection.style.display = section === 'results' ? 'block' : 'none';
  }

  function showError(msg) {
    document.getElementById('error-message').textContent = msg;
    showSection('error');
  }

  function animateLoadingSteps() {
    const steps = document.querySelectorAll('.loading-steps .step');
    steps.forEach(s => s.classList.remove('active'));
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) { steps[i].classList.add('active'); i++; }
      else clearInterval(interval);
    }, 800);
  }

  // ========== DISPLAY RESULTS ==========

  function displayResults(data) {
    showSection('results');

    // Meta card
    const metaTitle = document.getElementById('meta-title');
    const metaDesc = document.getElementById('meta-description');
    const metaImg = document.getElementById('meta-img');
    const metaBadge = document.getElementById('meta-type-badge');
    const metaSource = document.getElementById('meta-source-name');

    if (data.meta) {
      metaTitle.textContent = data.meta.title || 'Facebook Content';
      metaDesc.textContent = data.meta.description || 'No description available';
      metaSource.textContent = data.meta.site_name || 'Facebook';
      if (data.meta.image) { metaImg.src = data.meta.image; metaImg.style.display = 'block'; }
    }

    metaBadge.textContent = data.type === 'video' ? 'VIDEO' : 'POST';

    const videoResults = document.getElementById('video-results');
    const postResults = document.getElementById('post-results');
    videoResults.style.display = 'none';
    postResults.style.display = 'none';

    // Video
    if (data.video && (data.video.hd_url || data.video.sd_url)) {
      videoResults.style.display = 'block';
      // Restore original HTML if it was replaced by error
      if (!document.getElementById('hd-card')) {
        location.reload(); return;
      }

      const hdCard = document.getElementById('hd-card');
      if (data.video.hd_url) {
        hdCard.style.display = 'flex';
        const hdBtn = document.getElementById('hd-download');
        hdBtn.href = data.video.hd_url;
        hdBtn.onclick = (e) => { e.preventDefault(); downloadVideo(data.video.hd_url, 'fb_video_hd.mp4'); };
      } else { hdCard.style.display = 'none'; }

      const sdCard = document.getElementById('sd-card');
      if (data.video.sd_url) {
        sdCard.style.display = 'flex';
        const sdBtn = document.getElementById('sd-download');
        sdBtn.href = data.video.sd_url;
        sdBtn.onclick = (e) => { e.preventDefault(); downloadVideo(data.video.sd_url, 'fb_video_sd.mp4'); };
      } else { sdCard.style.display = 'none'; }

      const videoSrc = data.video.sd_url || data.video.hd_url;
      if (videoSrc) {
        document.getElementById('video-preview').style.display = 'block';
        document.getElementById('video-source').src = videoSrc;
        document.getElementById('video-player').load();
      }
    } else if (data.type === 'video') {
      videoResults.style.display = 'block';
      videoResults.innerHTML = `
        <div style="text-align:center; padding:2rem; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:16px;">
          <div style="font-size:3rem; margin-bottom:1rem;">🚫</div>
          <h3 style="margin-bottom:0.5rem;">Video URL Not Found</h3>
          <p style="color:#8888aa; margin-bottom:0.5rem;">Facebook may have blocked scraping or the video is private.</p>
          <p style="color:#8888aa; font-size:0.75rem; margin-bottom:1rem;">Debug: ${(data.debug || []).join(' → ')}</p>
          ${!cookiesSaved ? '<p style="color:#ffa500; font-size:0.85rem;">💡 Try adding your FB cookies above!</p>' : ''}
        </div>`;
    }

    // Post
    if (data.post) {
      postResults.style.display = 'block';

      if (data.post.author || data.post.title) {
        document.getElementById('author-name').textContent = data.post.author || data.post.title;
        document.getElementById('author-avatar').textContent = (data.post.author || 'FB').substring(0, 2).toUpperCase();
      }
      if (data.post.timestamp) document.getElementById('post-time').textContent = data.post.timestamp;

      document.getElementById('post-text').textContent = data.post.text || 'No text content found';

      const imagesSection = document.getElementById('post-images');
      const imagesGrid = document.getElementById('images-grid');
      if (data.post.images && data.post.images.length > 0) {
        imagesSection.style.display = 'block';
        imagesGrid.innerHTML = '';
        data.post.images.forEach((imgUrl, i) => {
          const card = document.createElement('div');
          card.className = 'image-card';
          card.innerHTML = `
            <img src="${imgUrl}" alt="Post image ${i + 1}" onerror="this.parentElement.style.display='none'" />
            <a href="${imgUrl}" class="image-download-btn" target="_blank" download title="Download">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </a>`;
          imagesGrid.appendChild(card);
        });
      } else { imagesSection.style.display = 'none'; }
    }

    // Debug info bar
    if (data.debug && data.debug.length > 0) {
      document.getElementById('raw-json').textContent = JSON.stringify(data, null, 2);
    }

    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ========== DOWNLOAD ==========

  async function downloadVideo(videoUrl, filename) {
    showToast('⬇️ Starting download...');
    try {
      const proxyUrl = `./api/fb_download.php?url=${encodeURIComponent(videoUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast('✅ Download started!');
    } catch {
      window.open(videoUrl, '_blank');
      showToast('📺 Opened in new tab - right-click to save');
    }
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

})();
