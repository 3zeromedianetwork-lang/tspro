(function() {
  'use strict';

  const urlInput = document.getElementById('anylink-url-input');
  const fetchBtn = document.getElementById('anylink-fetch-btn');
  const pasteBtn = document.getElementById('anylink-paste-btn');
  const retryBtn = document.getElementById('anylink-retry-btn');
  const toggleRawBtn = document.getElementById('anylink-toggle-raw-btn');
  const cookieToggleBtn = document.getElementById('anylink-cookie-toggle-btn');
  const cookiePanel = document.getElementById('anylink-cookie-panel');
  const cookieInput = document.getElementById('anylink-cookie-input');
  const cookieSaveBtn = document.getElementById('anylink-cookie-save-btn');

  const heroSection = document.getElementById('hero');
  const loadingSection = document.getElementById('anylink-loading-section');
  const errorSection = document.getElementById('anylink-error-section');
  const resultsSection = document.getElementById('anylink-results-section');
  const platformBadge = document.getElementById('platform-badge');
  const platformIcon = document.getElementById('platform-icon');
  const platformName = document.getElementById('platform-name');

  const loadingText = document.getElementById('anylink-loading-text');
  const loadingSteps = document.getElementById('anylink-loading-steps');

  let cookiesSaved = localStorage.getItem('anylink_cookies_saved') === 'true';

  updateCookieStatus();

  cookieToggleBtn.addEventListener('click', () => {
    cookiePanel.style.display = cookiePanel.style.display === 'none' ? 'block' : 'none';
  });

  cookieSaveBtn.addEventListener('click', async () => {
    const rawCookies = cookieInput.value.trim();
    if (!rawCookies) {
      showToast('⚠️ Please paste cookies first');
      return;
    }
    try {
      const resp = await fetch('./api/fb_scraper.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: rawCookies })
      });
      const data = await resp.json();
      if (data.success) {
        cookiesSaved = true;
        localStorage.setItem('anylink_cookies_saved', 'true');
        updateCookieStatus();
        cookiePanel.style.display = 'none';
        showToast('✅ Cookies saved!');
      } else {
        showToast('⚠️ Cookies saved locally (server may need them on next request)');
        cookiesSaved = true;
        localStorage.setItem('anylink_cookies_saved', 'true');
        updateCookieStatus();
        cookiePanel.style.display = 'none';
      }
    } catch (err) {
      showToast('✅ Cookies saved locally');
      cookiesSaved = true;
      localStorage.setItem('anylink_cookies_saved', 'true');
      updateCookieStatus();
      cookiePanel.style.display = 'none';
    }
  });

  function updateCookieStatus() {
    const icon = document.getElementById('anylink-cookie-status-icon');
    const text = document.getElementById('anylink-cookie-status-text');
    if (cookiesSaved) {
      icon.textContent = '✅';
      text.textContent = 'Cookies Connected';
      cookieToggleBtn.classList.add('connected');
    } else {
      icon.textContent = '🔧';
      text.textContent = 'Optional: Add Cookies for Restricted Videos';
      cookieToggleBtn.classList.remove('connected');
    }
  }

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

  fetchBtn.addEventListener('click', () => startDownload());
  urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') startDownload(); });
  retryBtn.addEventListener('click', () => startDownload());

  toggleRawBtn.addEventListener('click', () => {
    const raw = document.getElementById('anylink-raw-json');
    raw.style.display = raw.style.display === 'none' ? 'block' : 'none';
  });

  function showSection(section) {
    heroSection.style.display = section === 'hero' ? 'block' : 'none';
    loadingSection.style.display = section === 'loading' ? 'block' : 'none';
    errorSection.style.display = section === 'error' ? 'block' : 'none';
    resultsSection.style.display = section === 'results' ? 'block' : 'none';
  }

  function showError(msg) {
    document.getElementById('anylink-error-message').textContent = msg;
    showSection('error');
  }

  function detectPlatform(url) {
    if (/youtube\.com|youtu\.be|shorts\.youtube/i.test(url)) return { name: 'YouTube', icon: '▶️' };
    if (/tiktok\.com/i.test(url)) return { name: 'TikTok', icon: '🎵' };
    if (/instagram\.com/i.test(url)) return { name: 'Instagram', icon: '📸' };
    if (/twitter\.com|x\.com/i.test(url)) return { name: 'Twitter / X', icon: '🐦' };
    if (/facebook\.com|fb\.watch|fb\.com/i.test(url)) return { name: 'Facebook', icon: '📘' };
    if (/reddit\.com/i.test(url)) return { name: 'Reddit', icon: '🔴' };
    if (/pinterest\.com/i.test(url)) return { name: 'Pinterest', icon: '📌' };
    if (/vimeo\.com/i.test(url)) return { name: 'Vimeo', icon: '🎬' };
    if (/dailymotion\.com/i.test(url)) return { name: 'Dailymotion', icon: '📺' };
    if (/soundcloud\.com/i.test(url)) return { name: 'SoundCloud', icon: '🎧' };
    if (/twitch\.tv/i.test(url)) return { name: 'Twitch', icon: '💜' };
    if (/bilibili\.com/i.test(url)) return { name: 'Bilibili', icon: '📺' };
    return { name: 'Unknown Platform', icon: '🌐' };
  }

  function animateLoadingSteps() {
    const steps = loadingSteps.querySelectorAll('.step');
    steps.forEach(s => s.classList.remove('active'));
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) { steps[i].classList.add('active'); i++; }
      else clearInterval(interval);
    }, 600);
  }

  async function startDownload() {
    const url = urlInput.value.trim();
    if (!url) { showToast('⚠️ Please paste a video URL'); urlInput.focus(); return; }
    if (!/^https?:\/\/.+/i.test(url)) { showToast('⚠️ Please enter a valid URL starting with http'); return; }

    const platform = detectPlatform(url);
    platformIcon.textContent = platform.icon;
    platformName.textContent = platform.name;
    platformBadge.style.display = 'flex';

    showSection('loading');
    animateLoadingSteps();
    loadingText.textContent = `Fetching video from ${platform.name}...`;

    try {
      const response = await fetch('./api/video_download_anylink.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!data.success) {
        const debugInfo = data.debug ? data.debug.join(' → ') : '';
        showError(data.error || 'Failed to fetch video' + (debugInfo ? ' — ' + debugInfo : ''));
        return;
      }

      displayResults(data);
    } catch (err) {
      showError('Network error: ' + err.message);
    }
  }

  function displayResults(data) {
    showSection('results');

    document.getElementById('anylink-meta-title').textContent = data.metadata?.title || 'Video';
    document.getElementById('anylink-meta-description').textContent = data.platform || '';
    document.getElementById('anylink-meta-source').textContent = data.method || 'AnyLink Downloader';

    if (data.metadata?.thumbnail) {
      document.getElementById('anylink-meta-img').src = data.metadata.thumbnail;
      document.getElementById('anylink-meta-img').style.display = 'block';
    }

    const videoResults = document.getElementById('anylink-video-results');
    videoResults.style.display = 'block';

    const hdCard = document.getElementById('anylink-hd-card');
    const sdCard = document.getElementById('anylink-sd-card');
    const videoPreview = document.getElementById('anylink-video-preview');

    hdCard.style.display = 'none';
    sdCard.style.display = 'none';
    videoPreview.style.display = 'none';

    const downloadUrl = data.download_url || data.video_url || data.path || '';
    const tempUrl = data.temp_url || '';

    if (downloadUrl || tempUrl) {
      sdCard.style.display = 'flex';
      document.getElementById('anylink-sd-quality').textContent = data.metadata?.duration ? formatDuration(data.metadata.duration) : 'Standard';

      const sdBtn = document.getElementById('anylink-sd-download');
      sdBtn.href = downloadUrl;
      sdBtn.onclick = (e) => { e.preventDefault(); downloadVideo(downloadUrl, 'anylink_video.mp4'); };

      const videoSource = tempUrl || downloadUrl;
      document.getElementById('anylink-video-source').src = videoSource;
      document.getElementById('anylink-video-player').load();
      videoPreview.style.display = 'block';
    }

    if (data.debug && data.debug.length > 0) {
      document.getElementById('anylink-raw-json').textContent = JSON.stringify(data, null, 2);
    }

    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function downloadVideo(videoUrl, filename) {
    showToast('⬇️ Starting download...');
    try {
      const proxyUrl = `./api/video_proxy.php?url=${encodeURIComponent(videoUrl)}`;
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

  function formatDuration(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  function showToast(msg) {
    const toast = document.getElementById('anylink-toast');
    document.getElementById('anylink-toast-message').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

})();