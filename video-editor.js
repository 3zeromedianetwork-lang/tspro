/**
 * video-editor.js
 * Frontend logic for AI Video Editor
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('AI Video Editor Started');
  
  // --- STATE ---
  let state = {
    videos: [],
    currentVideo: null,
    isProcessing: false,
    processingProgress: 0,
    currentStep: 0,
    searchQuery: '',
    settings: {
      autoTrim: true,
      smartCrop: true,
      noiseReduction: true,
      autoCaptions: true,
      backgroundMusic: true,
      colorEnhancement: true,
      format: 'mp4',
      resolution: '1080p',
      codec: 'h264',
      captionFont: 'bold',
      captionColor: '#ffffff',
      highlightColor: '#fdcb6e',
      captionAnimation: 'bounce',
      maxLines: 2
    }
  };
  
  // --- MOCK DATA ---
  const sampleVideos = [
    { id: 'v1', title: 'Tech Review Shorts', duration: '0:45', status: 'completed', date: '2 hours ago', img: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&q=80', res: '1080x1920', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
    { id: 'v2', title: 'Cooking Tutorial Quick', duration: '0:59', status: 'completed', date: 'Yesterday', img: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&q=80', res: '1080x1920', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
    { id: 'v3', title: 'Travel Vlog Highlights', duration: '0:30', status: 'processing', date: 'Just now', img: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500&q=80', res: '1080x1920', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
    { id: 'v4', title: 'Fitness Routine Day 1', duration: '1:00', status: 'failed', date: '2 days ago', img: 'https://images.unsplash.com/photo-1517836357463-d25dfe09ce1e?w=500&q=80', res: '1080x1920', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' },
    { id: 'v5', title: 'Finance Tips 101', duration: '0:42', status: 'completed', date: '3 days ago', img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&q=80', res: '1080x1920', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' },
    { id: 'v6', title: 'Gaming Montage', duration: '0:55', status: 'completed', date: '1 week ago', img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&q=80', res: '1080x1920', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' }
  ];
  state.videos = [...sampleVideos];
  
  const sampleCaptions = [
    { time: '00:00', text: 'Welcome to this quick tutorial' },
    { time: '00:02', text: 'Today we are going to learn' },
    { time: '00:04', text: 'How to edit videos with AI' },
    { time: '00:06', text: 'It is super easy and fast' },
    { time: '00:08', text: 'Just paste your link below' }
  ];
  
  const sampleTracks = [
    { id: 't1', name: 'Cinematic Rise', duration: '2:45', type: 'cinematic' },
    { id: 't2', name: 'Lofi Chill Beats', duration: '3:10', type: 'lofi' },
    { id: 't3', name: 'Upbeat Tech', duration: '1:55', type: 'trending' },
    { id: 't4', name: 'Ambient Space', duration: '4:20', type: 'cinematic' }
  ];
  
  // --- DOM ELEMENTS ---
  const elements = {
    urlInput: document.getElementById('url-input'),
    heroUrlInput: document.getElementById('hero-url-input'),
    generateBtn: document.getElementById('generate-btn'),
    heroGenerateBtn: document.getElementById('hero-generate-btn'),
    loader: document.getElementById('loader'),
    toastContainer: document.getElementById('toast-container'),
    
    // Processing
    processingSection: document.getElementById('processing-section'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    progressText: document.getElementById('progress-text'),
    processingFilename: document.getElementById('processing-filename'),
    steps: document.querySelectorAll('.step'),
    
    // Video Grid
    videoGrid: document.getElementById('video-grid'),
    searchInput: document.getElementById('global-search'),
    
    // Modal
    modal: document.getElementById('video-modal'),
    modalClose: document.getElementById('modal-close'),
    modalTitle: document.getElementById('modal-video-title'),
    modalDuration: document.getElementById('modal-video-duration'),
    modalRes: document.getElementById('modal-video-res'),
    modalDownloadBtn: document.getElementById('modal-download-btn'),
    modalDeleteBtn: document.getElementById('modal-delete-btn'),
    videoPlayer: document.getElementById('modal-video-player'),
    playerContainer: document.getElementById('video-player-container'),
    playerOverlay: document.getElementById('player-overlay'),
    playIcon: document.getElementById('play-icon-large'),
    
    // Right Panel
    captionList: document.getElementById('caption-list'),
    musicList: document.getElementById('music-list'),
    
    // Nav
    navItems: document.querySelectorAll('.nav-item'),
    
    // Stats
    statValues: document.querySelectorAll('.stat-value')
  };
  
  // --- INITIALIZATION ---
  init();
  
  function init() {
    renderVideoCards();
    renderCaptions();
    renderMusicTracks();
    animateStats();
    setupEventListeners();
    setupSettingsBindings();
  }
  
  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    elements.generateBtn.addEventListener('click', () => handleGenerate(elements.urlInput.value));
    elements.heroGenerateBtn.addEventListener('click', () => handleGenerate(elements.heroUrlInput.value));
    
    // Allow pressing Enter in URL input
    elements.urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleGenerate(elements.urlInput.value);
    });
    elements.heroUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleGenerate(elements.heroUrlInput.value);
    });
    
    elements.modalClose.addEventListener('click', closeVideoModal);
    
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase();
      renderVideoCards();
    });
    
    // Navigation filtering
    elements.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        elements.navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        const text = item.textContent.trim().toLowerCase();
        
        if (text.includes('dashboard')) {
          state.currentFilter = 'all';
          showToast('Showing Dashboard', 'info');
        } else if (text.includes('my videos')) {
          state.currentFilter = 'completed';
          showToast('Filter: My Completed Videos', 'info');
        } else if (text.includes('templates')) {
          showToast('Template Library: Select a style template below', 'info');
        } else if (text.includes('music')) {
          showToast('Music Library: Browse trending tracks', 'info');
        } else if (text.includes('settings')) {
          showToast('Settings: Adjust processing options on the sidebar', 'info');
        }
        renderVideoCards();
      });
    });
    
    elements.modalDownloadBtn.addEventListener('click', () => {
      if (state.currentVideo) {
        triggerDownload(state.currentVideo);
      }
    });
    
    const shareBtn = document.getElementById('modal-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(window.location.href);
        showToast('Link copied to clipboard!', 'success');
      });
    }
    
    elements.modalDeleteBtn.addEventListener('click', () => {
      if (state.currentVideo) {
        deleteVideo(state.currentVideo.id);
        closeVideoModal();
      }
    });

    // Quick Actions
    const btnDownloadAll = document.getElementById('btn-download-all');
    if (btnDownloadAll) {
      btnDownloadAll.addEventListener('click', () => {
        const completed = state.videos.filter(v => v.status === 'completed');
        if (completed.length === 0) {
          showToast('No completed videos to download', 'error');
        } else {
          showToast(`Downloading ${completed.length} completed videos...`, 'info');
          completed.forEach((v, idx) => {
            setTimeout(() => triggerDownload(v), idx * 1200);
          });
        }
      });
    }

    const btnBatch = document.getElementById('btn-batch-process');
    if (btnBatch) {
      btnBatch.addEventListener('click', () => {
        showToast('Starting Batch Processing queue...', 'info');
        handleGenerate('https://youtube.com/shorts/batch_sample1');
      });
    }

    const btnClear = document.getElementById('btn-clear-history');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all video history?')) {
          state.videos = [];
          renderVideoCards();
          showToast('Video history cleared', 'success');
        }
      });
    }

    // Music Category Tabs
    document.querySelectorAll('.music-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.music-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const category = tab.getAttribute('data-tab');
        renderMusicTracks(category);
      });
    });

    // Music Volume
    const volumeSlider = document.getElementById('music-volume');
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const vol = e.target.value;
        const currentTrackName = document.getElementById('current-music')?.textContent;
        console.log(`Volume set to ${vol}% for ${currentTrackName}`);
      });
    }
  }
  
  function setupSettingsBindings() {
    // Toggles
    const toggles = ['autoTrim', 'smartCrop', 'noiseReduction', 'autoCaptions', 'backgroundMusic', 'colorEnhancement'];
    toggles.forEach(setting => {
      const el = document.getElementById(`setting-${setting}`);
      if(el) {
        el.addEventListener('change', (e) => {
          state.settings[setting] = e.target.checked;
          showToast(`${setting} ${e.target.checked ? 'Enabled' : 'Disabled'}`);
        });
      }
    });
    
    // Selects
    const selects = ['export-format', 'export-resolution', 'export-codec', 'caption-font', 'caption-animation', 'caption-lines'];
    selects.forEach(id => {
      const el = document.getElementById(id);
      if(el) {
        el.addEventListener('change', (e) => {
          const key = id.split('-')[1]; // e.g., 'format' from 'export-format'
          state.settings[key] = e.target.value;
        });
      }
    });
    
    // Colors
    ['caption-color', 'highlight-color'].forEach(id => {
      const el = document.getElementById(id);
      if(el) {
        el.addEventListener('change', (e) => {
          const key = id.replace('-', '');
          state.settings[key] = e.target.value;
        });
      }
    });
  }
  
  // --- UI ACTIONS ---
  
  function handleGenerate(url) {
    if (!url) {
      showToast('Please enter a video URL', 'error');
      return;
    }
    if (!validateUrl(url)) {
      showToast('Invalid URL format. Use YouTube, TikTok, or Instagram.', 'error');
      return;
    }
    
    elements.urlInput.value = '';
    elements.heroUrlInput.value = '';
    startProcessingSimulation(url);
  }
  
  function validateUrl(url) {
    // Very basic validation for demo
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('tiktok.com') || url.includes('instagram.com');
  }
  
  function startProcessingSimulation(url) {
    if (state.isProcessing) {
      showToast('A video is already processing', 'error');
      return;
    }
    
    state.isProcessing = true;
    state.processingProgress = 0;
    state.currentStep = 0;
    
    const ytMatch = url.match(/(?:watch\?v=|shorts\/|v=|youtu\.be\/|\/v\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
    const ytId = ytMatch ? ytMatch[1] : null;

    const filename = ytId ? `YouTube_Short_${ytId}.mp4` : `Generated_Short_${Math.floor(Math.random()*1000)}.mp4`;
    const thumbnailImg = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&q=80';

    elements.processingFilename.textContent = filename;
    elements.processingSection.classList.remove('hidden');
    
    // Add new video to state as processing
    const newVideo = {
      id: `v${Date.now()}`,
      title: ytId ? `YouTube Short (${ytId})` : filename,
      duration: '--:--',
      status: 'processing',
      date: 'Just now',
      img: thumbnailImg,
      res: state.settings.resolution,
      url: url,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    };
    state.videos.unshift(newVideo);
    renderVideoCards();
    
    updateProcessingUI();
    
    // Simulate progress
    const interval = setInterval(() => {
      state.processingProgress += Math.random() * 5;
      
      if (state.processingProgress >= 100) {
        state.processingProgress = 100;
        clearInterval(interval);
        finishProcessing(newVideo.id);
      }
      
      // Determine step based on progress
      let newStep = Math.floor(state.processingProgress / 20);
      if (newStep > 5) newStep = 5;
      
      if (newStep !== state.currentStep) {
        state.currentStep = newStep;
        showToast(`Step completed: ${elements.steps[state.currentStep-1]?.querySelector('.step-label').textContent}`, 'info');
      }
      
      updateProcessingUI();
    }, 400);
  }
  
  function updateProcessingUI() {
    elements.progressBarFill.style.width = `${state.processingProgress}%`;
    elements.progressText.textContent = `${Math.floor(state.processingProgress)}%`;
    
    elements.steps.forEach((step, index) => {
      step.classList.remove('active', 'completed');
      if (index < state.currentStep) {
        step.classList.add('completed');
      } else if (index === state.currentStep) {
        step.classList.add('active');
      }
    });
  }
  
  function finishProcessing(videoId) {
    state.isProcessing = false;
    
    setTimeout(() => {
      elements.processingSection.classList.add('hidden');
      
      // Update video status
      const videoIndex = state.videos.findIndex(v => v.id === videoId);
      if (videoIndex !== -1) {
        state.videos[videoIndex].status = 'completed';
        state.videos[videoIndex].duration = '0:58'; // mock generated duration
        renderVideoCards();
        showToast('Video processing complete!', 'success');
        
        // Update stats
        const processedStat = document.querySelector('.stat-value[data-value="1284"]');
        if (processedStat) {
          processedStat.dataset.value = 1285;
          processedStat.textContent = '1,285';
        }
      }
    }, 1500);
  }
  
  function renderVideoCards() {
    elements.videoGrid.innerHTML = '';
    
    const filteredVideos = state.videos.filter(v => {
      const matchesSearch = v.title.toLowerCase().includes(state.searchQuery);
      const matchesFilter = (state.currentFilter === 'completed') ? (v.status === 'completed') : true;
      return matchesSearch && matchesFilter;
    });
    
    if (filteredVideos.length === 0) {
      elements.videoGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--ve-text-muted); padding: 40px;">No videos found.</div>`;
      return;
    }
    
    filteredVideos.forEach(video => {
      const card = document.createElement('div');
      card.className = 'video-card';
      
      let statusClass = '';
      let statusText = '';
      if (video.status === 'completed') { statusClass = 'status-completed'; statusText = 'Completed'; }
      else if (video.status === 'processing') { statusClass = 'status-processing'; statusText = 'Processing'; }
      else { statusClass = 'status-failed'; statusText = 'Failed'; }
      
      card.innerHTML = `
        <div class="video-thumbnail">
          <img src="${video.img}" alt="${video.title}">
          <div class="play-btn-overlay">▶</div>
          <div class="video-duration">${video.duration}</div>
          <div class="video-actions-overlay">
            <button class="action-btn-sm btn-download">Download</button>
            <button class="action-btn-sm btn-edit">Edit</button>
            <button class="action-btn-sm btn-del">Delete</button>
          </div>
        </div>
        <div class="video-info">
          <div class="video-title" title="${video.title}">${video.title}</div>
          <div class="video-meta-row">
            <span class="status-badge ${statusClass}">${statusText}</span>
            <span class="video-date">${video.date}</span>
          </div>
        </div>
      `;
      
      // Card click anywhere
      card.addEventListener('click', () => {
        if (video.status === 'completed') {
          openVideoModal(video);
        } else if (video.status === 'processing') {
          showToast('Video is currently being processed...', 'info');
        } else {
          showToast('Video processing failed. Click Generate to try again.', 'error');
        }
      });
      
      // Events for buttons inside card
      card.querySelector('.play-btn-overlay').addEventListener('click', (e) => {
        e.stopPropagation();
        if (video.status === 'completed') openVideoModal(video);
        else showToast('Video is not ready yet', 'error');
      });
      
      card.querySelector('.btn-download').addEventListener('click', (e) => {
        e.stopPropagation();
        triggerDownload(video);
      });
      
      card.querySelector('.btn-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        if (video.status === 'completed') openVideoModal(video);
      });
      
      card.querySelector('.btn-del').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteVideo(video.id);
      });
      
      elements.videoGrid.appendChild(card);
    });
  }
  
  function togglePlayPause() {
    if (!elements.videoPlayer) return;
    if (elements.videoPlayer.paused) {
      elements.videoPlayer.play().then(() => {
        elements.playerOverlay.classList.add('playing');
        elements.playIcon.textContent = '❚❚';
      }).catch(err => {
        console.log('Video playback error:', err);
      });
    } else {
      elements.videoPlayer.pause();
      elements.playerOverlay.classList.remove('playing');
      elements.playIcon.textContent = '▶';
    }
  }

  if (elements.playerOverlay) {
    elements.playerOverlay.addEventListener('click', togglePlayPause);
  }
  if (elements.videoPlayer) {
    elements.videoPlayer.addEventListener('play', () => {
      elements.playerOverlay.classList.add('playing');
      elements.playIcon.textContent = '❚❚';
    });
    elements.videoPlayer.addEventListener('pause', () => {
      elements.playerOverlay.classList.remove('playing');
      elements.playIcon.textContent = '▶';
    });
    elements.videoPlayer.addEventListener('ended', () => {
      elements.playerOverlay.classList.remove('playing');
      elements.playIcon.textContent = '▶';
    });
  }

  function extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:shorts\/|v=|youtu\.be\/|\/v\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  const captionPhrases = [
    ['HOW 🚀', 'TO', 'EDIT', 'VIDEOS', 'WITH', 'AI ⚡'],
    ['AUTOMATIC', 'CAPCUT', 'STYLE', 'SUBTITLES 💬'],
    ['SMART CROP', '9:16', 'VERTICAL', 'FORMAT ✨'],
    ['BACKGROUND', 'MUSIC', 'DUCKING 🎵', 'ACTIVE'],
    ['EXPORT', 'READY', 'FOR', 'REELS', '&', 'TIKTOK 🔥']
  ];

  function openVideoModal(video) {
    state.currentVideo = video;
    elements.modalTitle.textContent = video.title;
    elements.modalDuration.textContent = video.duration;
    elements.modalRes.textContent = video.res || '1080x1920';

    const frame = document.getElementById('vertical-player-frame');
    const ytId = extractYouTubeId(video.url || video.originalUrl);

    if (ytId && frame) {
      frame.innerHTML = `
        <iframe id="modal-youtube-iframe" style="width: 178%; height: 100%; position: absolute; top: 0; left: -39%; border: none; filter: contrast(110%) saturate(115%) brightness(105%); pointer-events: auto;" src="https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&controls=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        
        <!-- CapCut Animated Subtitles Overlay -->
        <div class="capcut-captions-overlay" id="capcut-captions-overlay">
          <div class="caption-animated-box" id="caption-animated-box">
            <span class="caption-word active-word">SENORITA 🚀</span>
            <span class="caption-word">I</span>
            <span class="caption-word highlight">LOVE</span>
            <span class="caption-word">YOU</span>
          </div>
        </div>
        
        <!-- Watermark Overlay -->
        <div class="watermark-overlay">
          <span class="watermark-logo">⚡ AI EDITOR</span>
        </div>
        
        <!-- AI Filter Badges -->
        <div class="ai-badge-overlay">
          <span class="ai-pill">✨ 9:16 Smart Crop</span>
          <span class="ai-pill">🎨 Color HDR</span>
        </div>
      `;

      const captionAnimatedBox = document.getElementById('caption-animated-box');
      if (captionAnimatedBox) {
        let timerIndex = 0;
        if (window.captionTimer) clearInterval(window.captionTimer);
        window.captionTimer = setInterval(() => {
          timerIndex++;
          const currentPhrase = captionPhrases[timerIndex % captionPhrases.length];
          const activeWordIdx = timerIndex % currentPhrase.length;
          captionAnimatedBox.innerHTML = currentPhrase.map((word, idx) => {
            const isActive = idx === activeWordIdx;
            const isHighlight = word.includes('AI') || word.includes('CAPCUT') || word.includes('9:16') || word.includes('LOVE');
            return `<span class="caption-word ${isActive ? 'active-word' : ''} ${isHighlight ? 'highlight' : ''}">${word}</span>`;
          }).join(' ');
        }, 1200);
      }
    } else {
      const videoEl = document.getElementById('modal-video-player');
      const overlay = document.getElementById('player-overlay');
      const ctrlPlayBtn = document.getElementById('ctrl-play-btn');
      const ctrlSeekSlider = document.getElementById('ctrl-seek-slider');
      const ctrlTimeDisplay = document.getElementById('ctrl-time-display');
      const ctrlMuteBtn = document.getElementById('ctrl-mute-btn');
      const captionAnimatedBox = document.getElementById('caption-animated-box');

      if (videoEl) {
        if (video.img) videoEl.setAttribute('poster', video.img);
        const sampleUrl = video.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        if (videoEl.querySelector('source').src !== sampleUrl) {
          videoEl.querySelector('source').src = sampleUrl;
          videoEl.load();
        }
        videoEl.currentTime = 0;

        const togglePlay = () => {
          if (videoEl.paused) videoEl.play();
          else videoEl.pause();
        };

        if (overlay) overlay.onclick = togglePlay;
        if (ctrlPlayBtn) ctrlPlayBtn.onclick = togglePlay;

        if (ctrlMuteBtn) {
          ctrlMuteBtn.onclick = () => {
            videoEl.muted = !videoEl.muted;
            ctrlMuteBtn.textContent = videoEl.muted ? '🔇' : '🔊';
          };
        }

        if (ctrlSeekSlider) {
          ctrlSeekSlider.oninput = (e) => {
            if (videoEl.duration) {
              videoEl.currentTime = (e.target.value / 100) * videoEl.duration;
            }
          };
        }

        videoEl.onplay = () => {
          if (overlay) overlay.classList.add('playing');
          if (ctrlPlayBtn) ctrlPlayBtn.textContent = '❚❚';
        };

        videoEl.onpause = () => {
          if (overlay) overlay.classList.remove('playing');
          if (ctrlPlayBtn) ctrlPlayBtn.textContent = '▶';
        };

        // Sync time & CapCut live animated subtitles
        videoEl.ontimeupdate = () => {
          if (!videoEl.duration) return;
          const pct = (videoEl.currentTime / videoEl.duration) * 100;
          if (ctrlSeekSlider) ctrlSeekSlider.value = pct;

          const curMins = Math.floor(videoEl.currentTime / 60);
          const curSecs = Math.floor(videoEl.currentTime % 60).toString().padStart(2, '0');
          const durMins = Math.floor(videoEl.duration / 60);
          const durSecs = Math.floor(videoEl.duration % 60).toString().padStart(2, '0');
          if (ctrlTimeDisplay) ctrlTimeDisplay.textContent = `${curMins}:${curSecs} / ${durMins}:${durSecs}`;

          if (captionAnimatedBox) {
            const phraseIdx = Math.floor(videoEl.currentTime / 3.5) % captionPhrases.length;
            const currentPhrase = captionPhrases[phraseIdx];
            const activeWordIdx = Math.floor((videoEl.currentTime % 3.5) / (3.5 / currentPhrase.length));

            captionAnimatedBox.innerHTML = currentPhrase.map((word, idx) => {
              const isActive = idx === activeWordIdx;
              const isHighlight = word.includes('AI') || word.includes('CAPCUT') || word.includes('9:16');
              return `<span class="caption-word ${isActive ? 'active-word' : ''} ${isHighlight ? 'highlight' : ''}">${word}</span>`;
            }).join(' ');
          }
        };

        videoEl.play().catch(e => console.log('Autoplay handled:', e));
      }
    }

    elements.modal.classList.remove('hidden');
  }

  function closeVideoModal() {
    if (window.captionTimer) clearInterval(window.captionTimer);
    const videoEl = document.getElementById('modal-video-player');
    if (videoEl) {
      videoEl.pause();
      videoEl.currentTime = 0;
    }
    const frame = document.getElementById('vertical-player-frame');
    if (frame) {
      frame.innerHTML = `
        <video id="modal-video-player" class="vertical-video-el" preload="metadata" playsinline loop>
          <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
        </video>
        <div class="capcut-captions-overlay" id="capcut-captions-overlay">
          <div class="caption-animated-box" id="caption-animated-box">
            <span class="caption-word active-word">HOW 🚀</span>
            <span class="caption-word">TO</span>
            <span class="caption-word highlight">EDIT</span>
            <span class="caption-word">VIDEOS</span>
          </div>
        </div>
        <div class="watermark-overlay">
          <span class="watermark-logo">⚡ AI EDITOR</span>
        </div>
        <div class="ai-badge-overlay">
          <span class="ai-pill">✨ 9:16 Smart Crop</span>
          <span class="ai-pill">🎨 Color HDR</span>
        </div>
        <div class="player-overlay" id="player-overlay">
          <span class="play-icon-large" id="play-icon-large">▶</span>
        </div>
      `;
    }
    state.currentVideo = null;
    elements.modal.classList.add('hidden');
  }
  
  function triggerDownload(video) {
    if (!video) return;
    const videoTitle = video.title ? video.title.replace(/[^a-zA-Z0-9_-]/g, '_') : 'AI_Short_Video';
    showToast(`Downloading ${videoTitle}.mp4...`, 'info');
    
    // Download valid local MP4 file asset
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = 'assets/sample.mp4';
    a.download = `${videoTitle}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showToast(`${videoTitle}.mp4 downloaded successfully!`, 'success');
  }

  function deleteVideo(id) {
    state.videos = state.videos.filter(v => v.id !== id);
    renderVideoCards();
    showToast('Video deleted');
  }
  
  // --- RIGHT PANEL RENDERERS ---
  
  function renderCaptions() {
    elements.captionList.innerHTML = '';
    sampleCaptions.forEach(cap => {
      const el = document.createElement('div');
      el.className = 'caption-item';
      el.innerHTML = `<span class="caption-time">${cap.time}</span> <span class="caption-text">${cap.text}</span>`;
      elements.captionList.appendChild(el);
    });
  }
  
  function renderMusicTracks(categoryFilter = null) {
    elements.musicList.innerHTML = '';
    const tracksToRender = categoryFilter ? sampleTracks.filter(t => t.type === categoryFilter) : sampleTracks;
    
    if (tracksToRender.length === 0) {
      elements.musicList.innerHTML = `<div style="text-align: center; color: var(--ve-text-muted); padding: 12px; font-size: 12px;">No tracks in this category</div>`;
      return;
    }
    
    tracksToRender.forEach((track, index) => {
      const el = document.createElement('div');
      el.className = `music-track ${index === 0 ? 'playing' : ''}`;
      el.innerHTML = `
        <div class="music-play-btn">▶</div>
        <div class="music-info">
          <div class="music-title">${track.name}</div>
          <div class="music-duration">${track.duration}</div>
        </div>
      `;
      el.addEventListener('click', () => {
        document.querySelectorAll('.music-track').forEach(t => t.classList.remove('playing'));
        el.classList.add('playing');
        document.getElementById('current-music').textContent = track.name;
        showToast(`Selected music: ${track.name}`, 'info');
      });
      elements.musicList.appendChild(el);
    });
  }
  
  // --- UTILS ---
  
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if(type === 'success') icon = '✅';
    if(type === 'error') icon = '❌';
    
    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span class="toast-msg">${message}</span>`;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  function animateStats() {
    elements.statValues.forEach(stat => {
      const target = parseFloat(stat.getAttribute('data-value'));
      const duration = 2000;
      const steps = 60;
      const stepValue = target / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += stepValue;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        
        // Format based on type (has decimal or not)
        if (target % 1 !== 0) {
          stat.textContent = current.toFixed(1);
        } else {
          stat.textContent = Math.floor(current).toLocaleString();
        }
      }, duration / steps);
    });
  }
});
