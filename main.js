document.addEventListener('DOMContentLoaded', () => {
  console.log('NewsFlash Pro Started');

  // --- SERVER-SIDE SHARED STATE ---
  let appState = {
    monitored_sites: [],
    auto_saved_posts: [],
    templates: {},
    settings: {},
    processed_links: []
  };
  let monitoredSites = [];
  let autoSavedPosts = [];

  // DOM Elements - Workspace Modes
  const modePosterBtn = document.getElementById('mode-poster-btn');
  const modeVideoBtn = document.getElementById('mode-video-btn');
  const posterWorkspace = document.getElementById('news-card');
  const videoWorkspace = document.getElementById('video-workspace');

  modePosterBtn.addEventListener('click', () => {
    modePosterBtn.classList.add('active');
    modePosterBtn.classList.remove('btn-secondary');
    modePosterBtn.classList.add('btn-primary');
    
    modeVideoBtn.classList.remove('active', 'btn-primary');
    modeVideoBtn.classList.add('btn-secondary');

    posterWorkspace.style.display = 'block';
    videoWorkspace.style.display = 'none';
  });

  modeVideoBtn.addEventListener('click', () => {
    modeVideoBtn.classList.add('active');
    modeVideoBtn.classList.remove('btn-secondary');
    modeVideoBtn.classList.add('btn-primary');
    
    modePosterBtn.classList.remove('active', 'btn-primary');
    modePosterBtn.classList.add('btn-secondary');

    posterWorkspace.style.display = 'none';
    videoWorkspace.style.display = 'flex';
  });

  // Video Editor DOM Elements
  const editorVideoUpload = document.getElementById('editor-video-upload');
  const editorBaseVideo = document.getElementById('editor-base-video');
  const videoEditorEmptyState = document.getElementById('video-editor-empty-state');
  const addLowerThirdBtn = document.getElementById('add-lower-third-btn');
  const videoOverlaysContainer = document.getElementById('video-overlays');

  let editorVideoFile = null;

  editorVideoUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 250) { 
        alert('Video too large (' + fileSizeMB.toFixed(1) + 'MB). Max 250MB.');
        return;
      }
      editorVideoFile = file;
      
      // Upload video to server temp
      showLoader(true, 'Uploading to Editor...', 0);
      const formData = new FormData();
      formData.append('video_file', file);
      
      try {
          const resp = await fetch('./api/upload_video.php', {
              method: 'POST',
              body: formData
          });
          const data = await resp.json();
          if (!data.success) throw new Error(data.error);
          
          editorBaseVideo.src = data.url;
          editorBaseVideo.load();
          videoEditorEmptyState.style.display = 'none';
          showLoader(false);
          showToast('âœ… Video Loaded in Editor');
      } catch(err) {
          console.error(err);
          showLoader(false);
          alert('Upload failed: ' + err.message);
      }
    }
  });

  // Adding Lower Third
  addLowerThirdBtn.addEventListener('click', () => {
    const el = document.createElement('div');
    el.className = 'video-lower-third draggable-overlay';
    el.innerHTML = `
      <div class="delete-overlay-btn" style="position: absolute; top: -10px; right: -10px; background: red; color: white; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px; cursor: pointer; font-size: 12px; display: none; z-index: 100;">âœ•</div>
      <h1 contenteditable="true" spellcheck="false">NEWS HEADLINE HERE</h1>
      <p contenteditable="true" spellcheck="false">Details or reporter name goes here...</p>
    `;
    el.style.pointerEvents = 'auto'; // allow dragging/clicking
    
    // Show/hide delete button on hover
    const deleteBtn = el.querySelector('.delete-overlay-btn');
    el.addEventListener('mouseenter', () => deleteBtn.style.display = 'block');
    el.addEventListener('mouseleave', () => deleteBtn.style.display = 'none');
    
    // Delete action
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent drag
      el.remove();
    });

    videoOverlaysContainer.appendChild(el);
  });

  // Video Size Dropdown
  const videoSizePreset = document.getElementById('video-size-preset');
  const videoEditorCanvas = document.getElementById('video-editor-canvas');
  if (videoSizePreset && videoEditorCanvas) {
    videoSizePreset.addEventListener('change', (e) => {
      const size = e.target.value;
      if (size === 'landscape') videoEditorCanvas.style.aspectRatio = '16/9';
      else if (size === 'story') videoEditorCanvas.style.aspectRatio = '9/16';
      else if (size === 'square') videoEditorCanvas.style.aspectRatio = '1/1';
      else if (size === 'portrait') videoEditorCanvas.style.aspectRatio = '4/5';
    });
  }

  // Reset Video button
  const resetVideoBtn = document.getElementById('reset-video-btn');
  if (resetVideoBtn) {
    resetVideoBtn.addEventListener('click', () => {
      const wrapper = document.getElementById('editor-video-wrapper');
      if (wrapper) {
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.transform = 'translate(0px, 0px)';
        wrapper.dataset.x = 0;
        wrapper.dataset.y = 0;
      }
    });
  }

  // --- Advanced Video Controls Handlers ---
  let editorBgUrl = null;
  let editorMusicUrl = null;
  let highestZIndex = 100;
  let selectedOverlay = null;
  
  const overlayBorderRadius = document.getElementById('overlay-border-radius');
  const overlayBorderWidth = document.getElementById('overlay-border-width');
  const overlayBorderColor = document.getElementById('overlay-border-color');

  function selectOverlay(el) {
    el.style.zIndex = ++highestZIndex;
    if (selectedOverlay) {
      selectedOverlay.style.boxShadow = '';
    }
    selectedOverlay = el;
    selectedOverlay.style.boxShadow = '0 0 0 2px #3b82f6';
    
    const img = el.querySelector('img');
    if (img) {
      overlayBorderRadius.value = parseInt(img.style.borderRadius || 0);
      overlayBorderWidth.value = parseInt(img.style.borderWidth || 0);
      // For simplicity, we just keep the previous color picker value.
    }
  }

  function updateOverlayStyles() {
    if (!selectedOverlay) return;
    const img = selectedOverlay.querySelector('img');
    if (img) {
      img.style.borderRadius = overlayBorderRadius.value + 'px';
      img.style.border = `${overlayBorderWidth.value}px solid ${overlayBorderColor.value}`;
      img.style.boxSizing = 'border-box';
    }
  }

  if (overlayBorderRadius) overlayBorderRadius.addEventListener('input', updateOverlayStyles);
  if (overlayBorderWidth) overlayBorderWidth.addEventListener('input', updateOverlayStyles);
  if (overlayBorderColor) overlayBorderColor.addEventListener('input', updateOverlayStyles);

  if (videoEditorCanvas) {
    videoEditorCanvas.addEventListener('mousedown', (e) => {
      if (e.target.id === 'editor-base-video' || e.target.classList.contains('video-drag-handle')) {
        if (selectedOverlay) {
          selectedOverlay.style.boxShadow = '';
          selectedOverlay = null;
        }
      }
    });
  }

  // 1. Logo Upload
  const videoLogoUpload = document.getElementById('video-logo-upload');
  if (videoLogoUpload) {
    videoLogoUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      
      const el = document.createElement('div');
      el.className = 'video-logo draggable-overlay';
      el.style.pointerEvents = 'auto';
      el.addEventListener('mousedown', () => { selectOverlay(el); });
      
      const img = new Image();
      img.onload = () => {
        el.style.width = '100px';
        el.style.height = (100 * (img.naturalHeight / img.naturalWidth)) + 'px';
        el.innerHTML = `
          <div class="delete-overlay-btn" style="position: absolute; top: -10px; right: -10px; background: red; color: white; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px; cursor: pointer; font-size: 12px; display: none; z-index: 100;">âœ•</div>
          <img src="${url}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />
        `;
        
        const deleteBtn = el.querySelector('.delete-overlay-btn');
        el.addEventListener('mouseenter', () => deleteBtn.style.display = 'block');
        el.addEventListener('mouseleave', () => deleteBtn.style.display = 'none');
        deleteBtn.addEventListener('click', (ev) => { ev.stopPropagation(); el.remove(); });
        
        videoOverlaysContainer.appendChild(el);
      };
      img.src = url;
    });
  }

  // 2. Add Image Upload
  const videoImageUpload = document.getElementById('video-image-upload');
  if (videoImageUpload) {
    videoImageUpload.addEventListener('change', (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = URL.createObjectURL(file);
        
        const el = document.createElement('div');
        el.className = 'video-image draggable-overlay';
        el.style.pointerEvents = 'auto';
        el.addEventListener('mousedown', () => { selectOverlay(el); });
        
        const img = new Image();
        img.onload = () => {
          let startW = 300;
          if (img.naturalWidth < 300) startW = img.naturalWidth; // don't make small images blurry
          
          el.style.width = startW + 'px';
          el.style.height = (startW * (img.naturalHeight / img.naturalWidth)) + 'px';
          el.innerHTML = `
            <div class="delete-overlay-btn" style="position: absolute; top: -10px; right: -10px; background: red; color: white; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px; cursor: pointer; font-size: 12px; display: none; z-index: 100;">âœ•</div>
            <img src="${url}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />
          `;
          
          const deleteBtn = el.querySelector('.delete-overlay-btn');
          el.addEventListener('mouseenter', () => deleteBtn.style.display = 'block');
          el.addEventListener('mouseleave', () => deleteBtn.style.display = 'none');
          deleteBtn.addEventListener('click', (ev) => { ev.stopPropagation(); el.remove(); });
          
          videoOverlaysContainer.appendChild(el);
        };
        img.src = url;
      }
      
      // Clear the input so the same file(s) can be selected again
      e.target.value = '';
    });
  }

  // 3. Music Upload
  const videoMusicUpload = document.getElementById('video-music-upload');
  const musicFileName = document.getElementById('music-file-name');
  if (videoMusicUpload) {
    videoMusicUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      showLoader(true, 'Uploading Music...', 0);
      const formData = new FormData();
      formData.append('media_file', file);
      try {
        const resp = await fetch('./api/upload_media.php', { method: 'POST', body: formData });
        const data = await resp.json();
        if (data.success) {
          editorMusicUrl = data.url;
          musicFileName.textContent = file.name;
          musicFileName.style.display = 'inline';
        } else {
          alert('Upload failed: ' + data.error);
        }
      } catch (err) {
        alert('Error uploading music.');
      }
      showLoader(false);
    });
  }

  // Export Video Project
  const exportVideoProjectBtn = document.getElementById('export-video-project-btn');
  exportVideoProjectBtn.addEventListener('click', async () => {
    if (!editorVideoFile) {
      alert("Please upload a video to the editor first.");
      return;
    }

    showLoader(true, 'Rendering Video Project...');
    
    try {
      // 1. Deselect any active elements so borders don't show, hide delete buttons
      document.querySelectorAll('.draggable-overlay').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.delete-overlay-btn').forEach(btn => btn.style.display = 'none');
      
      // 2. Take a screenshot of the overlays container with a transparent background
      const canvas = await html2canvas(videoOverlaysContainer, {
        backgroundColor: null, // transparent
        scale: 2 // High quality
      });
      
      const overlayData = canvas.toDataURL('image/png');
      
      // 3. Collect all video properties
      const trimStart = document.getElementById('trim-start').value || 0;
      const trimEnd = document.getElementById('trim-end').value || 0;
      const muteVideo = document.getElementById('mute-video').checked;
      
      // Calculate video relative position/size compared to canvas
      const canvasRect = videoEditorCanvas.getBoundingClientRect();
      const videoWrapper = document.getElementById('editor-video-wrapper');
      const videoRect = videoWrapper ? videoWrapper.getBoundingClientRect() : editorBaseVideo.getBoundingClientRect();
      
      // We pass percentages to the backend so it can scale to any resolution
      const videoBox = {
        x: (videoRect.left - canvasRect.left) / canvasRect.width,
        y: (videoRect.top - canvasRect.top) / canvasRect.height,
        w: videoRect.width / canvasRect.width,
        h: videoRect.height / canvasRect.height
      };

      // 4. Send to server
      const payload = {
        videoUrl: editorBaseVideo.src,
        overlayData: overlayData,
        bgUrl: editorBgUrl,
        musicUrl: editorMusicUrl,
        trimStart: parseFloat(trimStart),
        trimEnd: parseFloat(trimEnd),
        muteVideo: muteVideo,
        videoBox: videoBox
      };
      
      const response = await fetch('./api/render_video_project.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Server processing failed");
      
      // 4. Download final video
      const a = document.createElement('a');
      a.href = data.url;
      a.download = `video_project_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      showLoader(false);
      showToast('âœ… Video Rendered Successfully!');
      
    } catch (error) {
      console.error(error);
      showLoader(false);
      alert("Error rendering video: " + error.message);
    }
  });

  // DOM Elements - Sidebar
  const urlInput = document.getElementById('news-url');
  const extractBtn = document.getElementById('extract-btn');
  const videoDlUrl = document.getElementById('video-dl-url');
  const videoDlBtn = document.getElementById('video-dl-btn');
  const extractionResults = document.getElementById('extraction-results');
  const targetLang = document.getElementById('target-lang');
  const translateAllBtn = document.getElementById('translate-all-btn');
  const aiRewriteBtn = document.getElementById('ai-rewrite-btn');
  const aiHeadlineBtn = document.getElementById('ai-headline-btn');
  const aiHashtagBtn = document.getElementById('ai-hashtag-btn');
  const fbHashtagsOutput = document.getElementById('fb-hashtags');
  const contentEditor = document.getElementById('content-editor');
  const imageGrid = document.getElementById('image-grid');
  const logoUpload = document.getElementById('logo-upload');
  const logoSizeInput = document.getElementById('logo-size');
  const logoBgColorInput = document.getElementById('logo-bg-color');
  const logoBorderColorInput = document.getElementById('logo-border-color');
  const manualImgUpload = document.getElementById('manual-img-upload');

  // DOM Elements - Toolbox
  const inputH1 = document.getElementById('input-h1');
  const fontFamilySelect = document.getElementById('font-family');
  const fontSizeInput = document.getElementById('font-size');
  const textColorInput = document.getElementById('text-color');
  const dateColorInput = document.getElementById('date-color');
  const dateSizeInput = document.getElementById('date-font-size');
  const inputDate = document.getElementById('input-date');
  const newsCategoryInput = document.getElementById('news-category');
  const watermarkText = document.getElementById('watermark-text');
  const watermarkOpacity = document.getElementById('watermark-opacity');
  const inputWeb = document.getElementById('input-web');
  const inputPhone = document.getElementById('input-phone');
  const footerColor1Input = document.getElementById('footer-color-1');
  const footerColor2Input = document.getElementById('footer-color-2');
  const downloadBtn = document.getElementById('download-btn');
  const wpPostBtn = document.getElementById('wp-post-btn');
  const fbPostAllBtn   = document.getElementById('fb-post-all-btn');
  const fbPageList     = document.getElementById('fb-page-list');
  const bulkFbPageList = document.getElementById('bulk-fb-pages-list');
  const fbMediaType    = document.getElementById('fb-media-type');
  const fbScheduleTime = document.getElementById('fb-schedule-time');
  const fbPostSingleBtn= document.getElementById('fb-post-single-btn');
  const fbScheduleBtn  = document.getElementById('fb-schedule-btn');
  const wpCategorySelect = document.getElementById('wp-category-select');
  const wpTagsInput = document.getElementById('wp-tags-input');
  const webhookUrlInput = document.getElementById('webhook-url');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const resetBtn = document.getElementById('reset-btn');
  const cardSizePreset = document.getElementById('card-size-preset');

  const bulkMediaType = document.getElementById('bulk-media-type');
  const bulkMediaUrl = document.getElementById('bulk-media-url');
  const bulkImageUpload = document.getElementById('bulk-image-upload');
  const bulkVideoUpload = document.getElementById('bulk-video-upload');
  const bulkHeadline = document.getElementById('bulk-headline');
  const bulkHashtags = document.getElementById('bulk-hashtags');
  const bulkPostAllBtn = document.getElementById('bulk-post-all-btn');
  const bulkUploadLabel = document.getElementById('bulk-upload-label');
  const bulkVideoUploadLabel = document.getElementById('bulk-video-upload-label');

  // DOM Elements - Voice & Monitoring
  const voiceBtn = document.getElementById('voice-btn');
  const voiceIcon = document.getElementById('voice-icon');
  const voiceStatus = document.getElementById('voice-status');
  const voiceIndicator = document.getElementById('voice-indicator');
  const toggleWebsitesBtn = document.getElementById('toggle-websites-btn');
  const monitoredSitesPanel = document.getElementById('monitored-sites-panel');
  const sitesList = document.getElementById('sites-list');
  const siteNickname = document.getElementById('site-nickname');
  const siteUrl = document.getElementById('site-url');
  const addSiteBtn = document.getElementById('add-site-btn');
  const autoPostsList = document.getElementById('auto-posts-list');
  const syncAllBtn = document.getElementById('sync-all-btn');
  const startWorkflowBtn = document.getElementById('start-workflow-btn');
  const workflowProgress = document.getElementById('workflow-progress');
  const currentPostName = document.getElementById('current-post-name');

  // DOM Elements - Templates
  const templateNameInput = document.getElementById('template-name');
  const saveTemplateBtn = document.getElementById('save-template-btn');
  const templateSelect = document.getElementById('template-select');
  const loadTemplateBtn = document.getElementById('load-template-btn');
  const deleteTemplateBtn = document.getElementById('delete-template-btn');

  // DOM Elements - News Card
  const newsCard = document.getElementById('news-card');
  const cardImg = document.getElementById('card-img');
  const cardH1 = document.getElementById('card-h1');
  const cardDate = document.getElementById('card-date-drag');
  const cardBadge = document.getElementById('card-badge-drag');
  const cardLogo = document.getElementById('card-logo-drag');
  const mainLogo = document.getElementById('main-logo');
  const cardWatermark = document.getElementById('card-watermark-drag');
  const footerWeb = document.getElementById('footer-web');
  const footerPhone = document.getElementById('footer-phone');
  const cardFooter = document.querySelector('.card-footer');
  const cardTemplateImg = document.getElementById('card-template-img');
  const addBannerBtn = document.getElementById('add-banner-btn');
  const bannerList = document.getElementById('banner-list');

  // Banner Management
  let customBanners = [];

  // Cropper
  const cropperModal = document.getElementById('cropper-modal');
  const cropperImage = document.getElementById('cropper-image');
  const cropApplyBtn = document.getElementById('crop-apply-btn');
  const cropCancelBtn = document.getElementById('crop-cancel-btn');
  let cropper = null;
  const loader = document.getElementById('loader');
  const successToast = document.getElementById('success-toast');
  const footerStyleSelect = document.getElementById('footer-style');
  const uploadTemplateBtn = document.getElementById('upload-template-btn');
  const templateImgUpload = document.getElementById('template-img-upload');
  const clearTemplateBtn = document.getElementById('clear-template-btn');
  const manualVideoUpload = document.getElementById('manual-video-upload');
  const togglePlayBtn = document.getElementById('toggle-play-btn');
  const playOverlay = document.getElementById('play-overlay');
  const downloadVideoBtn = document.getElementById('download-video-btn');
  const recordingOverlay = document.getElementById('video-recording-overlay');
  const recordProgress = document.getElementById('video-record-progress');
  const videoTrimSection = document.getElementById('video-trim-section');
  const trimStartInput = document.getElementById('trim-start');
  const trimEndInput = document.getElementById('trim-end');
  const cardImageBox = document.getElementById('card-image-box');
  const cardVideo = document.getElementById('card-video');
  const posterVideoWrapper = document.getElementById('poster-video-wrapper');
  const cardContentDrag = document.getElementById('card-content-drag');

  let currentNewsData = {
    title: '',
    content: '',
    images: []
  };

  let currentCardAspectRatio = 4 / 5; // default portrait

  function getAspectRatioForSize(size) {
    switch (size) {
      case 'portrait': return 4 / 5;
      case 'square': return 1 / 1;
      case 'landscape': return 16 / 9;
      case 'story': return 9 / 16;
      default: return 4 / 5;
    }
  }

  // --- INTERACT.JS INTEGRATION ---
  function initDraggables() {
  interact('#card-template-img').draggable({
    listeners: {
      move: dragMoveListener,
      end: function (event) { if (typeof appHistory !== 'undefined') appHistory.saveState(); }
    },
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: 'parent',
        endOnly: true
      })
    ]
  });

  // Draggable elements (General)
  interact('.card-image-container, .card-logo, .card-date, .card-badge, .card-content-area, .card-footer, .draggable-overlay')
    .draggable({
      inertia: true,
      autoScroll: true,
      listeners: {
        move: dragMoveListener
      }
    });
      
  // Draggable element (Video specifically with a drag handle)
  interact('.draggable-video')
    .draggable({
      inertia: true,
      allowFrom: '.video-drag-handle',
      autoScroll: true,
      listeners: {
        move: dragMoveListener
      }
    });

  // Resizable elements (General)
  interact('.card-image-container, .card-logo, .card-content-area, .card-footer')
    .resizable({
      edges: { left: true, right: true, bottom: true, top: true },
      listeners: {
        move(event) {
          let { x, y } = event.target.dataset;
          x = (parseFloat(x) || 0) + event.deltaRect.left;
          y = (parseFloat(y) || 0) + event.deltaRect.top;

          Object.assign(event.target.style, {
            width: ${event.rect.width}px,
            height: ${event.rect.height}px,
            transform: 	ranslate(px, px)
          });

          Object.assign(event.target.dataset, { x, y });
        }
      },
      modifiers: [
        interact.modifiers.restrictSize({
          min: { width: 50, height: 20 }
        }),
        interact.modifiers.restrictRect({
          restriction: 'parent'
        })
      ]
    });
  }

  // --- MOUSE WHEEL ZOOM FOR VIDEO AND OVERLAYS ---
  document.addEventListener('wheel', (e) => {
    const target = e.target.closest('.draggable-video, .draggable-overlay, .poster-video-wrapper');
    if (target) {
      e.preventDefault();
      const rect = target.getBoundingClientRect();
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1; // scroll down = zoom out, scroll up = zoom in
      
      const newWidth = Math.max(50, rect.width * scaleFactor);
      const newHeight = Math.max(50, rect.height * scaleFactor);
      
      target.style.width = newWidth + 'px';
      target.style.height = newHeight + 'px';
    }
  }, { passive: false });

  function dragMoveListener(event) {
    var target = event.target;
    var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
    var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

    target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
  }

  window.dragMoveListener = dragMoveListener;
  initDraggables();

  // --- BANNER MANAGEMENT ---
  function addBanner(text = 'NEW BANNER', position = 'top') {
    const bannerId = 'banner-' + Date.now();
    const banner = document.createElement('div');
    banner.id = bannerId;
    banner.className = 'custom-banner';
    banner.textContent = text;
    banner.style.cssText = `
      position: absolute;
      left: 0;
      width: 100%;
      padding: 8px 16px;
      background: linear-gradient(90deg, #d11230, #ff6b6b);
      color: white;
      font-weight: bold;
      font-size: 0.9rem;
      text-align: center;
      cursor: move;
      z-index: 35;
      user-select: none;
      touch-action: none;
    `;
    if (position === 'bottom') {
      banner.style.top = 'auto';
      banner.style.bottom = '40px';
    } else {
      banner.style.top = '0px';
      banner.style.bottom = 'auto';
    }
    
    newsCard.appendChild(banner);
    
    // Make draggable
    interact(banner)
      .draggable({
        inertia: true,
        autoScroll: true,
        modifiers: [],
        listeners: {
          move: dragMoveListener
        }
      });
    
    customBanners.push({ id: bannerId, text, position, element: banner });
    updateBannerList();
    if (typeof window.updateLayerList === 'function') window.updateLayerList();
    showToast('Banner added! Drag to move it.'); if(typeof window.appHistory !== 'undefined') window.appHistory.saveState();
  }

  function deleteBanner(bannerId) {
    const banner = document.getElementById(bannerId);
    if (banner) {
      banner.remove();
      customBanners = customBanners.filter(b => b.id !== bannerId);
      updateBannerList();
      if (typeof window.updateLayerList === 'function') window.updateLayerList();
    }
  }

  function updateBannerList() {
    if (!bannerList) return;
    bannerList.innerHTML = '';
    customBanners.forEach((banner, index) => {
      const item = document.createElement('div');
      item.style.cssText = 'display: flex; gap: 0.3rem; align-items: center;';
      item.innerHTML = `
        <input type="text" value="${banner.text}" data-index="${index}" class="banner-text-input" style="flex: 1; padding: 4px; font-size: 0.75rem; border: 1px solid #ccc; border-radius: 3px;" />
        <button type="button" data-delete="${banner.id}" class="btn-minimal" style="padding: 2px 6px; font-size: 0.7rem; background: #ef4444; color: white; border: none; border-radius: 3px; cursor: pointer;">âœ•</button>
      `;
      bannerList.appendChild(item);
    });

    // Add event listeners for banner list items
    bannerList.querySelectorAll('.banner-text-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index);
        if (customBanners[index]) {
          customBanners[index].text = e.target.value;
          customBanners[index].element.textContent = e.target.value;
        }
      });
    });

    bannerList.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        deleteBanner(e.target.dataset.delete);
      });
    });
  }

  if (addBannerBtn) {
    addBannerBtn.addEventListener('click', () => {
      addBanner('NEW BANNER', 'top');
    });
  }

  // --- NEWS EXTRACTION ---
  extractBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) return alert('Please enter a URL');

    showLoader(true);
    try {
      const response = await fetch(`./api/extract.php?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      currentNewsData = data;
      
      // Update UI
      inputH1.value = data.title;
      contentEditor.value = data.content;
      renderImageGrid(data.images);
      
      extractionResults.style.display = 'block';
      updateCardPreview();
      showToast('News Extracted Successfully!');
    } catch (err) {
      alert('Extraction failed: ' + err.message);
    } finally {
      showLoader(false);
    }
  });

  if (videoDlBtn) {
    videoDlBtn.addEventListener('click', async () => {
      const url = videoDlUrl.value.trim();
      if (!url) {
        alert('Please enter a video link first');
        return;
      }

      showLoader(true, 'Analyzing video link...');
      const statusEl = document.getElementById('video-dl-status');
      if (statusEl) statusEl.textContent = 'Fetching from AnyLink...';

      try {
        const response = await fetch('./api/video_download_anylink.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await response.json();

        if (statusEl) statusEl.textContent = '';

        if (!data.success) {
          const debugInfo = data.debug ? data.debug.join(' â†’ ') : '';
          throw new Error(data.error || 'Download failed' + (debugInfo ? ' â€” ' + debugInfo : ''));
        }

        const downloadUrl = data.download_url || data.video_url || data.path || '';
        const tempUrl = data.temp_url || downloadUrl;
        if (!downloadUrl) {
          throw new Error('No download URL found in response');
        }

        // Use temp URL for video player (direct access), download URL for downloads
        const videoSource = tempUrl;

        cardVideo.src = videoSource;
        cardVideo.load();
        cardVideo.onloadeddata = () => {
          if (posterVideoWrapper) {
            posterVideoWrapper.style.display = 'block'; posterVideoWrapper.style.visibility = 'visible';
            posterVideoWrapper.style.width = '100%';
            posterVideoWrapper.style.height = '100%';
            posterVideoWrapper.style.transform = 'translate(0px, 0px)';
            posterVideoWrapper.dataset.x = 0;
            posterVideoWrapper.dataset.y = 0;
          }
          cardImg.style.display = 'none';
          videoTrimSection.style.display = 'block';
          downloadVideoBtn.style.display = 'block';
          downloadVideoBtn.style.background = '#10b981';
          downloadVideoBtn.style.borderColor = '#10b981';
          downloadBtn.style.opacity = '0.5';
          trimEndInput.value = Math.floor(cardVideo.duration);
          cardVideo.play().catch(e => console.warn("Autoplay blocked:", e));
          showLoader(false);
          showToast('âœ… Video Downloaded & Loaded!');
          videoDlUrl.value = '';
          if (typeof window.updateLayerList === 'function') window.updateLayerList();
          if (typeof updateCardPreview === 'function') updateCardPreview();
        };
        cardVideo.onerror = () => {
          showLoader(false);
          alert('Video loaded but could not be played. Try downloading directly.');
        };
      } catch (err) {
        if (statusEl) statusEl.textContent = '';
        showLoader(false);
        alert('Download Error: ' + err.message);
      }
    });
  }

  function renderImageGrid(images) {
    imageGrid.innerHTML = '';
    images.forEach((src, idx) => {
      const div = document.createElement('div');
      div.className = 'image-item';
      div.innerHTML = `<img src="${src}" alt="img-${idx}">`;
      div.addEventListener('click', () => {
        openCropper(src);
      });
      imageGrid.appendChild(div);
    });
  }

  function openCropper(src, isForWP = false) {
    console.log('Opening cropper for src length:', src.length);
    showLoader(true, 'Preparing Cropper...');
    
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }

    // Safety timeout to hide loader if everything fails
    const safetyTimeout = setTimeout(() => {
      console.warn('Cropper safety timeout reached');
      showLoader(false);
    }, 8000);

    cropperImage.onload = () => {
      clearTimeout(safetyTimeout);
      console.log('Cropper image loaded, initializing Cropper...');
      try {
        if (typeof Cropper === 'undefined') {
          throw new Error('Cropper.js library not loaded!');
        }
        cropper = new Cropper(cropperImage, {
          aspectRatio: isForWP ? NaN : 500 / 350,
          viewMode: 1,
          background: false,
          autoCropArea: 1
        });
        
        cropApplyBtn.onclick = () => {
          if (isForWP) finalizeWPPost();
          else applyImageCrop();
        };
        
        showLoader(false);
      } catch (e) {
        console.error('Cropper Init Error:', e);
        alert('Cropper Error: ' + e.message);
        showLoader(false);
        cropperModal.style.display = 'none';
      }
    };

    cropperImage.onerror = () => {
      clearTimeout(safetyTimeout);
      console.error('Failed to load image for cropping');
      alert('Failed to load image for cropping. Please try another image.');
      showLoader(false);
      cropperModal.style.display = 'none';
    };

    // Set source
    if (src && src.startsWith('data:')) {
      cropperImage.src = src;
    } else if (src) {
      cropperImage.src = `./api/proxy.php?url=${encodeURIComponent(src)}`;
    } else {
      console.error('Empty src provided to openCropper');
      showLoader(false);
      return;
    }
    
    cropperModal.style.display = 'flex';
  }

  function applyImageCrop() {
    if (!cropper) return;
    
    const croppedCanvas = cropper.getCroppedCanvas({
      width: 1000, // High quality output
      height: 700
    });
    
    cardImg.src = croppedCanvas.toDataURL('image/png');
    cardImg.style.display = 'block'; cardImg.style.visibility = 'visible';
    cropperModal.style.display = 'none';
    cropper.destroy();
    cropper = null;
    showToast('Image Cropped & Set!');
    if (typeof window.updateLayerList === 'function') window.updateLayerList();
    if (typeof updateCardPreview === 'function') updateCardPreview();
  }

  cropCancelBtn.addEventListener('click', () => {
    cropperModal.style.display = 'none';
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  });

  async function setCardImage(src) {
    const proxyUrl = `./api/proxy.php?url=${encodeURIComponent(src)}`;
    cardImg.src = proxyUrl;
    cardImg.style.display = 'block'; cardImg.style.visibility = 'visible';
    if (typeof window.updateLayerList === 'function') window.updateLayerList();
    if (typeof updateCardPreview === 'function') updateCardPreview();
  }

  // --- AI TOOLS ---
  translateAllBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const lang = targetLang.value;
    showLoader(true, `Translating to ${lang}...`);
    
    try {
      // Translate Headline
      const headlineRes = await fetchAI('translate', inputH1.value, lang);
      inputH1.value = headlineRes;
      
      // Translate Content
      const contentRes = await fetchAI('translate', contentEditor.value, lang);
      contentEditor.value = contentRes;
      
      updateCardPreview();
      showToast(`Translated to ${lang}!`);
    } catch (err) {
      alert('AI Error: ' + err.message);
    } finally {
      showLoader(false);
    }
  });

  aiRewriteBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    showLoader(true, 'AI Rewriting Content...');
    try {
      const res = await fetchAI('content', contentEditor.value);
      contentEditor.value = res;
      showToast('Content Optimized by AI!');
    } catch (err) {
      alert('AI Error: ' + err.message);
    } finally {
      showLoader(false);
    }
  });

  aiHeadlineBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    // If inputH1 is empty, use contentEditor, otherwise use inputH1 as source
    const sourceText = inputH1.value.trim() || contentEditor.value.trim();
    if (!sourceText) return alert('Please enter some content or a headline first');
    
    showLoader(true, 'AI Generating Headline...');
    try {
      const res = await fetchAI('headline', sourceText);
      // Put the whole headline into the textarea, stripping formatting
      inputH1.value = res.replace(/[#*]/g, '').trim();
      updateCardPreview();
      showToast('Headline Optimized by AI!');
    } catch (err) {
      alert('AI Error: ' + err.message);
    } finally {
      showLoader(false);
    }
  });
  
  aiHashtagBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const text = (inputH1.value + ' ' + contentEditor.value).trim();
    if (!text) return alert('Please add some content first');
    
    showLoader(true, 'AI Generating Hashtags...');
    try {
      const res = await fetchAI('hashtags', text);
      fbHashtagsOutput.value = res;
      showToast('Hashtags Generated! #ï¸âƒ£');
    } catch (err) {
      alert('AI Error: ' + err.message);
    } finally {
      showLoader(false);
    }
  });

  async function fetchAI(type, text, lang = null) {
    const response = await fetch('./api/ai_modify.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, text, lang })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.modified_text;
  }

  // --- REAL-TIME PREVIEW ---
  function updateCardPreview() {
    try {
      const font = fontFamilySelect.value;
      const size = fontSizeInput.value;
      const color = textColorInput.value;

      const processText = (txt) => {
        if (!txt) return "";
        if (font === 'Bamini') return unicodeToBamini(txt);
        return txt;
      };

      // Set text and hide if empty to avoid broken layouts
      if (cardH1) {
        cardH1.innerText = processText(inputH1.value);
        cardH1.style.fontFamily = `'${font}', sans-serif`;
        cardH1.style.fontSize = `${size}rem`;
        cardH1.style.color = color;
        cardH1.style.display = cardH1.innerText ? 'block' : 'none';
        cardH1.style.whiteSpace = 'pre-wrap'; // Preserve newlines
      }

      // Date Update
      if (cardDate) {
        cardDate.textContent = inputDate.value;
        cardDate.style.color = dateColorInput.value;
        cardDate.style.fontSize = `${dateSizeInput.value}rem`;
        cardDate.style.display = inputDate.value ? 'block' : 'none';
      }

      if (cardBadge) {
        cardBadge.textContent = processText(newsCategoryInput.value.toUpperCase());
        cardBadge.style.display = newsCategoryInput.value ? 'block' : 'none';
      }

      // Watermark Update
      if (cardWatermark) {
        cardWatermark.textContent = processText(watermarkText.value);
        cardWatermark.style.opacity = watermarkOpacity.value;
        cardWatermark.style.display = (watermarkOpacity.value > 0 && watermarkText.value) ? 'block' : 'none';
      }

      if (footerWeb) footerWeb.textContent = inputWeb.value;
      if (footerPhone) footerPhone.textContent = inputPhone.value;

      // Footer Colors Update
      if (cardFooter) {
        cardFooter.style.setProperty('--footer-bg-1', footerColor1Input.value);
        cardFooter.style.setProperty('--footer-bg-2', footerColor2Input.value);
        cardFooter.classList.remove('style-classic', 'style-glass', 'style-minimal', 'style-dark', 'style-none');
        cardFooter.classList.add(`style-${footerStyleSelect.value}`);
      }

      // Hide Logo if src is empty or broken
      if (cardLogo) {
        cardLogo.style.width = `${logoSizeInput.value}px`;
        cardLogo.style.backgroundColor = logoBgColorInput.value;
        cardLogo.style.borderColor = logoBorderColorInput.value;
        // Show logo if it has a valid source (data URL or contains 'logo')
        const hasValidSrc = mainLogo.src && (mainLogo.src.startsWith('data:') || mainLogo.src.toLowerCase().includes('logo'));
        cardLogo.style.display = hasValidSrc ? 'flex' : 'none'; // Use flex for centering
      }

      // Hide Card Img if video is loaded
      if (cardImg && cardVideo && posterVideoWrapper) {
        if (cardVideo.src && !cardVideo.src.endsWith('/')) {
           posterVideoWrapper.style.display = 'block'; posterVideoWrapper.style.visibility = 'visible';
           cardImg.style.display = 'none';
        } else {
           posterVideoWrapper.style.display = 'none';
           cardImg.style.display = cardImg.src && !cardImg.src.endsWith('/') ? 'block' : 'none';
        }
      }

      // Play Overlay Toggle
      if (playOverlay) {
        playOverlay.style.display = togglePlayBtn.checked ? 'flex' : 'none';
      }

    } catch (e) {
      console.error('Preview Update Error:', e);
    }
  }

  // --- PERSISTENCE LOGIC ---
  function getCurrentDesignSettings() {
    const draggables = ['.card-logo', '.card-date', '.card-badge', '.headline-line', '.card-footer', '.card-image-container', '.card-content-area'];
    const positions = {};
    draggables.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) {
        positions[selector] = {
          x: el.getAttribute('data-x') || 0,
          y: el.getAttribute('data-y') || 0,
          width: el.style.width || '',
          height: el.style.height || ''
        };
      }
    });

    if (posterVideoWrapper) {
      positions['.poster-video-wrapper'] = {
        x: posterVideoWrapper.getAttribute('data-x') || 0,
        y: posterVideoWrapper.getAttribute('data-y') || 0,
        width: posterVideoWrapper.style.width || '100%',
        height: posterVideoWrapper.style.height || '100%'
      };
    }

    const banners = customBanners.map(b => ({
      id: b.id,
      text: b.text,
      position: b.position,
      x: b.element.getAttribute('data-x') || 0,
      y: b.element.getAttribute('data-y') || 0
    }));

    return {
      fontFamily: fontFamilySelect.value,
      fontSize: fontSizeInput.value,
      textColor: textColorInput.value,
      dateColor: dateColorInput.value,
      dateSize: dateSizeInput.value,
      newsCategory: newsCategoryInput.value,
      watermarkText: watermarkText.value,
      watermarkOpacity: watermarkOpacity.value,
      inputWeb: inputWeb.value,
      inputPhone: inputPhone.value,
      footerColor1: footerColor1Input.value,
      footerColor2: footerColor2Input.value,
      footerStyle: footerStyleSelect.value,
      logoSize: logoSizeInput.value,
      logoBgColor: logoBgColorInput.value,
      logoBorderColor: logoBorderColorInput.value,
      logoData: mainLogo.src.startsWith('data:') ? mainLogo.src : null,
      showPlayIcon: togglePlayBtn.checked,
      cardBackground: newsCard.style.backgroundImage || null,
      webhookUrl: webhookUrlInput.value,
      cardSize: cardSizePreset.value,
      positions: positions,
      banners: banners
    };
  }

  function applyDesignSettings(settings) {
    if (!settings) return;

    if (settings.fontFamily) fontFamilySelect.value = settings.fontFamily;
    if (settings.fontSize) fontSizeInput.value = settings.fontSize;
    if (settings.textColor) textColorInput.value = settings.textColor;
    if (settings.dateColor) dateColorInput.value = settings.dateColor;
    if (settings.dateSize) dateSizeInput.value = settings.dateSize;
    if (settings.newsCategory) newsCategoryInput.value = settings.newsCategory;
    if (settings.watermarkText) watermarkText.value = settings.watermarkText;
    if (settings.watermarkOpacity) watermarkOpacity.value = settings.watermarkOpacity;
    if (settings.inputWeb) inputWeb.value = settings.inputWeb;
    if (settings.inputPhone) inputPhone.value = settings.inputPhone;
    if (settings.footerColor1) footerColor1Input.value = settings.footerColor1;
    if (settings.footerColor2) footerColor2Input.value = settings.footerColor2;
    if (settings.logoSize) logoSizeInput.value = settings.logoSize;
    if (settings.logoBgColor) logoBgColorInput.value = settings.logoBgColor;
    if (settings.logoBorderColor) logoBorderColorInput.value = settings.logoBorderColor;
    if (settings.logoData) mainLogo.src = settings.logoData;
    if (settings.webhookUrl) webhookUrlInput.value = settings.webhookUrl;
    if (settings.footerStyle) footerStyleSelect.value = settings.footerStyle;
    if (settings.showPlayIcon !== undefined) togglePlayBtn.checked = settings.showPlayIcon;
    if (settings.cardBackground) newsCard.style.backgroundImage = settings.cardBackground;
    if (settings.cardSize) {
      cardSizePreset.value = settings.cardSize;
      updateCardSize(settings.cardSize);
    }

    // Restore positions
    if (settings.positions) {
      Object.keys(settings.positions).forEach(selector => {
        const el = document.querySelector(selector);
        const pos = settings.positions[selector];
        if (el && pos) {
          el.setAttribute('data-x', pos.x);
          el.setAttribute('data-y', pos.y);
          el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
          if (pos.width) el.style.width = pos.width;
          if (pos.height) el.style.height = pos.height;
        }
      });
    }
    
    // Restore custom banners
    if (settings.banners && Array.isArray(settings.banners)) {
      customBanners.forEach(b => {
        const el = document.getElementById(b.id);
        if (el) el.remove();
      });
      customBanners = [];
      settings.banners.forEach(b => {
        addBanner(b.text, b.position);
        const banner = customBanners.find(cb => cb.id === b.id);
        if (banner && banner.element) {
          banner.element.setAttribute('data-x', b.x);
          banner.element.setAttribute('data-y', b.y);
          banner.element.style.transform = `translate(${b.x}px, ${b.y}px)`;
        }
      });
    }
    
    // Restore poster video wrapper visibility if video exists
    if (posterVideoWrapper && cardVideo && cardVideo.src && !cardVideo.src.endsWith('/')) {
      posterVideoWrapper.style.display = 'block'; posterVideoWrapper.style.visibility = 'visible';
    }

    updateCardPreview();
  }

  // --- STATE-BASED SETTINGS & TEMPLATES ---
  function saveSettings() {
    appState.settings = getCurrentDesignSettings();
    saveStateToServer();
  }

  function loadSettings() {
    if (appState.settings && Object.keys(appState.settings).length > 0) {
      applyDesignSettings(appState.settings);
    }
  }

  function getTemplates() {
    return appState.templates || {};
  }

  async function saveTemplates(templates) {
    appState.templates = templates;
    const success = await saveStateToServer();
    if (success) {
      renderTemplateList();
      return true;
    }
    return false;
  }

  function renderTemplateList() {
    const templates = getTemplates();
    templateSelect.innerHTML = '<option value="">Select Template</option>';
    Object.keys(templates).forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      templateSelect.appendChild(opt);
    });
  }

  saveTemplateBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const name = templateNameInput.value.trim();
    if (!name) return alert('Please enter a template name');

    const templates = getTemplates();
    templates[name] = getCurrentDesignSettings();
    
    showLoader(true, 'Saving Template...');
    const success = await saveTemplates(templates);
    showLoader(false);

    if (success) {
      templateNameInput.value = '';
      showToast(`Template "${name}" Saved! ðŸ’œ`);
    } else {
      alert('Failed to save template to server. Please check file permissions.');
    }
  });

  loadTemplateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const name = templateSelect.value;
    if (!name) return alert('Please select a template');

    const templates = getTemplates();
    if (templates[name]) {
      applyDesignSettings(templates[name]);
      showToast(`Template "${name}" Loaded!`);
    }
  });

  deleteTemplateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const name = templateSelect.value;
    if (!name) return alert('Please select a template to delete');

    if (confirm(`Are you sure you want to delete template "${name}"?`)) {
      const templates = getTemplates();
      delete templates[name];
      saveTemplates(templates);
      showToast(`Template "${name}" Deleted!`);
    }
  });

  // Call render templates on start
  renderTemplateList();

  // Listeners for real-time updates
  [inputH1, fontFamilySelect, fontSizeInput, textColorInput, inputDate, dateColorInput, dateSizeInput, newsCategoryInput, watermarkText, watermarkOpacity, inputWeb, inputPhone, footerColor1Input, footerColor2Input, logoSizeInput, logoBgColorInput, logoBorderColorInput, cardSizePreset, footerStyleSelect].forEach(el => {
    el.addEventListener('input', () => {
      if (el === cardSizePreset) {
        updateCardSize(el.value);
      }
      updateCardPreview();
    });
  });

  function updateCardSize(size) {
    // Remove all size classes for the poster
    newsCard.classList.remove('size-square', 'size-portrait', 'size-landscape', 'size-story');
    // Add new size class
    newsCard.classList.add(`size-${size}`);
    
    // Update aspect ratio for poster video wrapper
    currentCardAspectRatio = getAspectRatioForSize(size);
    
    // Reset poster video wrapper to fit new aspect ratio
    if (posterVideoWrapper) {
      posterVideoWrapper.style.width = '100%';
      posterVideoWrapper.style.height = '100%';
      posterVideoWrapper.style.transform = 'translate(0px, 0px)';
      posterVideoWrapper.dataset.x = 0;
      posterVideoWrapper.dataset.y = 0;
    }
    
    // After transition, we might need to re-verify draggable bounds
    setTimeout(() => {
      console.log('Card size updated to:', size, 'aspect ratio:', currentCardAspectRatio);
    }, 400);
  }

  // Manual Save Handler
  
// --- HISTORY STATE (UNDO/REDO) ---
class HistoryManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.maxStates = 30;
    this.isRestoring = false;
  }
  
  saveState() {
    if (this.isRestoring) return;
    try {
      const state = {
        template: cardTemplateImg.src,
        templateData: { x: cardTemplateImg.dataset.x, y: cardTemplateImg.dataset.y, scale: cardTemplateImg.dataset.scale },
        templateTransform: cardTemplateImg.style.transform,
        templateDisplay: cardTemplateImg.style.display,
        image: cardImg.src,
        imageVis: cardImg.style.visibility,
        imageDisplay: cardImg.style.display,
        imageContainerHeight: document.getElementById('card-image-box').style.height,
        logo: cardLogo.src,
        logoData: { x: cardLogo.dataset.x, y: cardLogo.dataset.y },
        logoTransform: cardLogo.style.transform,
        logoDisplay: cardLogo.style.display,
        headline: cardH1.innerHTML,
        date: cardDate.innerHTML,
        dateDisplay: cardDate.style.display,
        dateData: { x: cardDate.dataset.x, y: cardDate.dataset.y },
        dateTransform: cardDate.style.transform,
        badge: cardBadge.innerHTML,
        badgeDisplay: cardBadge.style.display,
        badgeData: { x: cardBadge.dataset.x, y: cardBadge.dataset.y },
        badgeTransform: cardBadge.style.transform,
        contentArea: { x: document.querySelector('.card-content-area').dataset.x, y: document.querySelector('.card-content-area').dataset.y },
        contentTransform: document.querySelector('.card-content-area').style.transform,
        footer: { x: cardFooter.dataset.x, y: cardFooter.dataset.y },
        footerTransform: cardFooter.style.transform,
        footerDisplay: cardFooter.style.display,
        banners: customBanners.map(b => ({ ...b, transform: b.element.style.transform, dataX: b.element.dataset.x, dataY: b.element.dataset.y }))
      };
      this.undoStack.push(state);
      if (this.undoStack.length > this.maxStates) this.undoStack.shift();
      this.redoStack = []; 
      if(typeof window.updateLayerList === 'function') window.updateLayerList(); 
    } catch(e) { console.error('saveState error', e); }
  }
  
  restoreState(state) {
    if (!state) return;
    this.isRestoring = true;
    
    cardTemplateImg.src = state.template || '';
    cardTemplateImg.style.display = state.templateDisplay || 'none';
    cardTemplateImg.style.transform = state.templateTransform || '';
    if(state.templateData) { cardTemplateImg.dataset.x = state.templateData.x || 0; cardTemplateImg.dataset.y = state.templateData.y || 0; cardTemplateImg.dataset.scale = state.templateData.scale || 1; }
    
    cardImg.src = state.image || '';
    cardImg.style.visibility = state.imageVis || 'visible';
    cardImg.style.display = state.imageDisplay || 'none';
    if(state.imageContainerHeight) document.getElementById('card-image-box').style.height = state.imageContainerHeight;
    
    cardLogo.src = state.logo || '';
    cardLogo.style.display = state.logoDisplay || 'block';
    cardLogo.style.transform = state.logoTransform || '';
    if(state.logoData) { cardLogo.dataset.x = state.logoData.x || 0; cardLogo.dataset.y = state.logoData.y || 0; }
    
    cardH1.innerHTML = state.headline || 'YOUR HEADLINE HERE';
    cardDate.innerHTML = state.date || '';
    cardDate.style.display = state.dateDisplay || 'inline-block';
    cardDate.style.transform = state.dateTransform || '';
    if(state.dateData) { cardDate.dataset.x = state.dateData.x || 0; cardDate.dataset.y = state.dateData.y || 0; }
    
    cardBadge.innerHTML = state.badge || '';
    cardBadge.style.display = state.badgeDisplay || 'inline-block';
    cardBadge.style.transform = state.badgeTransform || '';
    if(state.badgeData) { cardBadge.dataset.x = state.badgeData.x || 0; cardBadge.dataset.y = state.badgeData.y || 0; }
    
    const contentArea = document.querySelector('.card-content-area');
    contentArea.style.transform = state.contentTransform || '';
    if(state.contentArea) { contentArea.dataset.x = state.contentArea.x || 0; contentArea.dataset.y = state.contentArea.y || 0; }
    
    cardFooter.style.display = state.footerDisplay || 'flex';
    cardFooter.style.transform = state.footerTransform || '';
    if(state.footer) { cardFooter.dataset.x = state.footer.x || 0; cardFooter.dataset.y = state.footer.y || 0; }
    
    // Restore banners
    document.querySelectorAll('.custom-banner').forEach(b => b.remove());
    customBanners = [];
    if (state.banners) {
      state.banners.forEach(b => {
        addBanner(b.text, b.position);
        const el = document.getElementById(customBanners[customBanners.length-1].id);
        if(el) {
          el.style.transform = b.transform || '';
          el.dataset.x = b.dataX || 0;
          el.dataset.y = b.dataY || 0;
        }
      });
    }
    
    this.isRestoring = false;
    if(typeof window.updateLayerList === 'function') window.updateLayerList();
  }
  
  undo() {
    if (this.undoStack.length <= 1) return; // Keep initial state
    this.redoStack.push(this.undoStack.pop()); // Move current to redo
    this.restoreState(this.undoStack[this.undoStack.length - 1]);
    showToast('Undo');
    if(typeof saveSettings === 'function') saveSettings();
  }
  
  redo() {
    if (this.redoStack.length === 0) return;
    const state = this.redoStack.pop();
    this.undoStack.push(state);
    this.restoreState(state);
    showToast('Redo');
    if(typeof saveSettings === 'function') saveSettings();
  }
}

window.appHistory = new HistoryManager();
setTimeout(() => window.appHistory.saveState(), 1000); 

document.getElementById('undo-btn')?.addEventListener('click', () => window.appHistory.undo());
document.getElementById('redo-btn')?.addEventListener('click', () => window.appHistory.redo());
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); window.appHistory.undo(); }
  if (e.ctrlKey && e.key === 'y') { e.preventDefault(); window.appHistory.redo(); }
});

const layersList = document.getElementById('layers-list');
let activeLayerEl = null;

window.updateLayerList = function() {
  if (!layersList) return;
  layersList.innerHTML = '';
  
  const layers = [
    { name: 'Headline', el: document.querySelector('.card-content-area'), id: 'headline', type: 'system' },
    { name: 'Logo', el: document.getElementById('card-logo-drag'), id: 'logo', type: 'system' },
    { name: 'Date Tag', el: document.getElementById('card-date-drag'), id: 'date', type: 'system' },
    { name: 'Badge', el: document.getElementById('card-badge-drag'), id: 'badge', type: 'system' },
    { name: 'Image', el: document.getElementById('card-img'), id: 'image', type: 'system' },
    { name: 'Video', el: document.getElementById('poster-video-wrapper'), id: 'video', type: 'system' },
    { name: 'Footer', el: document.querySelector('.card-footer'), id: 'footer', type: 'system' },
    { name: 'Background', el: document.getElementById('card-template-img'), id: 'bg-template', type: 'system' }
  ];
  
  customBanners.forEach((b, i) => {
    layers.push({ name: 'Banner ' + (i+1) + ': ' + b.text.substring(0,10) + '...', el: b.element, id: b.id, type: 'banner' });
  });
  
  layers.forEach(layer => {
    if (!layer.el) return;
    const isHidden = layer.el.style.display === 'none' || layer.el.style.visibility === 'hidden';
    
    const div = document.createElement('div');
    div.className = 'layer-item';
    div.innerHTML = '<div class="layer-name" title="' + layer.name + '">' + layer.name + '</div><div class="layer-actions"><button class="layer-btn toggle-vis" title="' + (isHidden ? 'Show' : 'Hide') + '">' + (isHidden ? 'Show' : 'Hide') + '</button>' + (layer.type === 'banner' ? '<button class="layer-btn delete-layer" title="Delete">Del</button>' : '<button class="layer-btn delete-layer" title="Clear">Clear</button>') + '</div>';
    
    div.onclick = (e) => {
      if (e.target.closest('.layer-btn')) return;
      document.querySelectorAll('.layer-item').forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.layer-highlight').forEach(l => l.classList.remove('layer-highlight'));
      div.classList.add('active');
      layer.el.classList.add('layer-highlight');
      activeLayerEl = layer.el;
      setTimeout(() => { if (layer.el) layer.el.classList.remove('layer-highlight'); }, 2000);
    };
    
    const toggleVis = div.querySelector('.toggle-vis');
    toggleVis.onclick = (e) => {
      e.stopPropagation();
      const currentHidden = layer.el.style.display === 'none' || layer.el.style.visibility === 'hidden';
      if (layer.id === 'image') {
        layer.el.style.display = currentHidden ? 'block' : 'none';
      } else if (layer.id === 'video') {
        layer.el.style.display = currentHidden ? 'block' : 'none';
      } else {
        layer.el.style.display = currentHidden ? (layer.id === 'headline' || layer.id === 'footer' ? 'flex' : 'block') : 'none';
      }
      window.appHistory.saveState();
      window.updateLayerList();
      if(typeof saveSettings === 'function') saveSettings();
    };
    
    div.querySelector('.delete-layer').onclick = (e) => {
      e.stopPropagation();
      if (layer.type === 'banner') {
         deleteBanner(layer.id);
      } else {
         if (layer.id === 'image') {
            document.getElementById('card-img').src = '';
            document.getElementById('card-img').style.display = 'none';
         } else if (layer.id === 'video') {
            const vid = document.getElementById('card-video');
            if (vid) { vid.src = ''; vid.style.display = 'none'; }
            const wrapper = document.getElementById('poster-video-wrapper');
            if (wrapper) wrapper.style.display = 'none';
         } else if (layer.id === 'bg-template') {
            const btn = document.getElementById('clear-template-btn');
            if(btn) btn.click();
         } else if (layer.id === 'logo') {
            layer.el.src = '';
            layer.el.style.display = 'none';
         } else {
            layer.el.innerHTML = '';
            layer.el.style.display = 'none';
         }
      }
      window.appHistory.saveState();
      window.updateLayerList();
      if(typeof saveSettings === 'function') saveSettings();
    };
    
    layersList.appendChild(div);
  });
}

document.getElementById('refresh-layers-btn')?.addEventListener('click', window.updateLayerList);
// Auto update layers periodically as fallback
setInterval(window.updateLayerList, 5000);

  saveSettingsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    saveSettings();
    showToast('All Settings Saved! ðŸ’¾');
  });

  // Call load on start
  loadSettings();

  // Logo Upload Handler
  logoUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        mainLogo.src = event.target.result;
        updateCardPreview();
        saveSettings();
        showToast('Logo Updated & Saved! âœ…');
      };
      reader.readAsDataURL(file);
      }
      e.target.value = '';
  });

  // Manual Image Upload
  manualImgUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        openCropper(event.target.result);
      };
      reader.readAsDataURL(file);
      }
      e.target.value = '';
  });

  // Background Template Upload (handled by label for)

    let isAdjustingTemplate = false;
  const adjustTemplateBtn = document.getElementById('adjust-template-btn');
  
  adjustTemplateBtn.addEventListener('click', () => {
    isAdjustingTemplate = !isAdjustingTemplate;
    if (isAdjustingTemplate) {
      cardTemplateImg.style.zIndex = '9999';
      cardTemplateImg.style.outline = '4px dashed #ef4444';
      cardTemplateImg.style.opacity = '0.9';
      adjustTemplateBtn.textContent = 'Done';
      adjustTemplateBtn.style.background = '#10b981';
      adjustTemplateBtn.style.borderColor = '#10b981';
      showToast('You can now drag and zoom the background image.');
    } else {
      cardTemplateImg.style.zIndex = '0';
      cardTemplateImg.style.outline = 'none';
      cardTemplateImg.style.opacity = '1';
      adjustTemplateBtn.textContent = 'Adjust';
      adjustTemplateBtn.style.background = '#3b82f6';
      adjustTemplateBtn.style.borderColor = '#3b82f6';
      showToast('Background Template Locked.');
    }
  });

  clearTemplateBtn.addEventListener('click', () => {
    cardTemplateImg.src = '';
    cardTemplateImg.style.display = 'none';
    const newsCard = document.getElementById('news-card');
    if (newsCard) {
      newsCard.style.backgroundImage = 'none';
      newsCard.style.background = 'white';
    }
    cardTemplateImg.style.transform = 'translate(0px, 0px) scale(1)';
    cardTemplateImg.dataset.x = 0;
    cardTemplateImg.dataset.y = 0;
    cardTemplateImg.dataset.scale = 1;
    // Restore the grey text box background
    document.getElementById('card-content-drag').style.background = 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)';
    document.getElementById('card-content-drag').style.boxShadow = '0 -4px 20px rgba(0,0,0,0.05)';
    templateImgUpload.value = '';
    showToast('Background Cleared'); if(typeof appHistory !== 'undefined') appHistory.saveState();
    adjustTemplateBtn.style.display = 'none';
    isAdjustingTemplate = false;
    if(typeof saveSettings === 'function') saveSettings();
  });

  templateImgUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        cardTemplateImg.src = event.target.result;
        cardTemplateImg.style.display = 'block';
        cardTemplateImg.style.transform = 'translate(0px, 0px) scale(1)';
        cardTemplateImg.dataset.x = 0;
        cardTemplateImg.dataset.y = 0;
        cardTemplateImg.dataset.scale = 1;
        document.getElementById('card-content-drag').style.background = 'transparent';
        document.getElementById('card-content-drag').style.boxShadow = 'none';
        showToast('Draggable Background Template Set!'); if(typeof appHistory !== 'undefined') appHistory.saveState();
        const adjustBtn = document.getElementById('adjust-template-btn');
        if (adjustBtn) adjustBtn.style.display = 'block';
      };
      reader.readAsDataURL(file);
      }
      e.target.value = '';
  });



  // Video Frame Capture (handled by label for)

    // Mouse wheel zoom for background template
  cardTemplateImg.addEventListener('wheel', (e) => {
    if (!isAdjustingTemplate) return;
    e.preventDefault();
    let currentScale = parseFloat(e.target.dataset.scale) || 1;
    currentScale += e.deltaY * -0.002;
    if (currentScale < 0.2) currentScale = 0.2;
    if (currentScale > 5.0) currentScale = 5.0;
    e.target.dataset.scale = currentScale;
    updateTransform(e.target);
  });

  manualVideoUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 250) { 
        alert('Video too large (' + fileSizeMB.toFixed(1) + 'MB). Max 250MB.');
        return;
      }
      
      let p = 0;
      showLoader(true, 'Uploading Video...', p);
      
      const formData = new FormData();
      formData.append('video_file', file);
      
      try {
          const resp = await fetch('./api/upload_video.php', {
              method: 'POST',
              body: formData
          });
          const data = await resp.json();
          
          if (!data.success) {
              throw new Error(data.error);
          }
          
           cardVideo.src = data.url;
           cardVideo.load();
           
           showLoader(true, 'Uploading Video...', 100);
           
      } catch(err) {
          console.error(err);
          showLoader(false);
          alert('Upload failed: ' + err.message);
          return;
      }

      const onVideoReady = () => {
        setTimeout(() => {
          if (posterVideoWrapper) {
            posterVideoWrapper.style.display = 'block';
            posterVideoWrapper.style.width = '100%';
            posterVideoWrapper.style.height = '100%';
            posterVideoWrapper.style.transform = 'translate(0px, 0px)';
            posterVideoWrapper.dataset.x = 0;
            posterVideoWrapper.dataset.y = 0;
          }
          cardImg.style.display = 'none';
          videoTrimSection.style.display = 'block';
          downloadVideoBtn.style.display = 'block'; 
          downloadVideoBtn.style.background = '#10b981';
          downloadVideoBtn.style.borderColor = '#10b981';
          
          downloadBtn.style.opacity = '0.5';
          trimEndInput.value = Math.floor(cardVideo.duration);
          
          cardVideo.play().catch(e => console.warn("Autoplay blocked:", e));
          
          showLoader(false);
          showToast('âœ… Upload Completed!');
          if (typeof window.updateLayerList === 'function') window.updateLayerList();
          if (typeof updateCardPreview === 'function') updateCardPreview();
        }, 300);
      };

      if (cardVideo.readyState >= 2) {
        onVideoReady();
      } else {
        cardVideo.addEventListener('canplay', onVideoReady, { once: true });
      }

      cardVideo.onerror = () => {
        handleVideoError(file);
      };
    }
  });

  function handleVideoError(file) {
    showLoader(false);
    alert("This video could not be loaded in the browser. It may use a codec not supported by the browser (for example, H.265/HEVC inside an MP4). Please convert it to an H.264 MP4 and try again.");
  }

  togglePlayBtn.addEventListener('change', updateCardPreview);

  function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  // Image Paste Support
  document.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index in items) {
      const item = items[index];
      if (item.kind === 'file') {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          openCropper(event.target.result);
        };
        reader.readAsDataURL(blob);
      }
    }
  });

  // --- UTILS ---
  function showLoader(show, text = 'Processing...', progress = null) {
    loader.style.display = show ? 'flex' : 'none';
    loader.querySelector('p').textContent = text + (progress !== null ? ` (${progress}%)` : '');
  }

  function showToast(msg) {
    successToast.textContent = msg;
    successToast.classList.add('show');
    setTimeout(() => successToast.classList.remove('show'), 3000);
  }

  // --- DOWNLOAD ---
  downloadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showLoader(true, 'Generating High Quality Image...');
    captureCard().then(canvas => {
      const link = document.createElement('a');
      link.download = `newsflash-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Image Downloaded!');
    }).finally(() => {
      showLoader(false);
    });
  });

  wpPostBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    showLoader(true, 'Capturing card for cropping...');
    try {
      const canvas = await captureCard();
      const imageData = canvas.toDataURL('image/png');
      openCropper(imageData, true); 
    } catch (err) {
      alert('Capture Failed: ' + err.message);
    } finally {
      showLoader(false);
    }
  });

  async function finalizeWPPost() {
    if (!cropper) return;
    
    const croppedCanvas = cropper.getCroppedCanvas({ maxWidth: 1200 });
    const imageData = croppedCanvas.toDataURL('image/png');
    
    closeCropper();
    showLoader(true, 'Posting to WordPress...');
    
    try {
      const response = await fetch('./api/wp_post.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: inputH1.value,
          content: contentEditor.value,
          image: imageData,
          category: wpCategorySelect.value,
          tags: wpTagsInput.value
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Successfully posted to WordPress! Post ID: ' + result.post_id);
        window.open(result.link, '_blank');
      } else {
        const errorMsg = result.error + 
                         (result.code ? ' (HTTP: ' + result.code + ')' : '') + 
                         (result.curl_error ? '\nCURL Error: ' + result.curl_error : '') +
                         (result.details ? '\nDetails: ' + JSON.stringify(result.details) : '');
        throw new Error(errorMsg);
      }
    } catch (err) {
      alert('WordPress Post Failed: ' + err.message);
    } finally {
      showLoader(false);
    }
  }

  function closeCropper() {
    cropperModal.style.display = 'none';
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  }

  async function captureCard() {
    // Before capture, remove scale transform for perfect image quality
    // We use setProperty to override CSS !important rules
    const originalTransform = newsCard.style.transform;
    const originalOrigin = newsCard.style.transformOrigin;
    
    newsCard.style.setProperty('transform', 'none', 'important');
    newsCard.style.setProperty('transform-origin', 'unset', 'important');
    
    // Capture the card
    const canvas = await html2canvas(newsCard, {
      useCORS: true,
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        const clonedCard = clonedDoc.getElementById('news-card');
        clonedCard.style.setProperty('transform', 'none', 'important');
        clonedCard.style.setProperty('transform-origin', 'unset', 'important');
      }
    });

    // Restore original scaling
    newsCard.style.transform = originalTransform;
    newsCard.style.transformOrigin = originalOrigin;

    return canvas;
  }

  // --- WordPress Categories Fetch ---
  async function fetchWPCategories() {
    try {
      const response = await fetch('./api/wp_get_categories.php');
      const cats = await response.json();
      
      if (cats && Array.isArray(cats)) {
        wpCategorySelect.innerHTML = '<option value="">Select Category</option>';
        cats.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat.id;
          opt.textContent = cat.name;
          wpCategorySelect.appendChild(opt);
        });
      } else {
        wpCategorySelect.innerHTML = '<option value="">Failed to load categories</option>';
      }
    } catch (err) {
      console.error('WP Categories Fetch Error:', err);
      wpCategorySelect.innerHTML = '<option value="">Error loading categories</option>';
    }
  }

  fetchWPCategories();

  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Reset all positions and content?')) {
        localStorage.removeItem('newsflash_settings');
        location.reload();
      }
    });
  }

  // --- UNICODE TO BAMINI ---
  function unicodeToBamini(text) {
    if (!text) return "";
    const mapping = [
      ["à®‰à¯—", "à®Š"], ["à®”", "xs"], ["à®“", "X"], ["à®’", "x"], ["à®", "V"], ["à®Ž", "v"], ["à®", "I"], ["à®ˆ", "P"], ["à®‡", "p"], ["à®†", "M"], ["à®…", "m"],
      ["à®µà¯†", "nf"], ["à®µà¯‡", "Nf"], ["à®µà¯ˆ", "if"], ["à®•à¯Š", "nfh"], ["à®•à¯‹", "Nfh"], ["à®•à¯Œ", "nfs"],
      ["à®šà¯†", "nr"], ["à®šà¯‡", "Nr"], ["à®šà¯ˆ", "ir"], ["à®šà¯Š", "nrh"], ["à®šà¯‹", "Nrh"], ["à®šà¯Œ", "nrs"],
      ["à®Ÿà¯†", "nl"], ["à®Ÿà¯‡", "Nl"], ["à®Ÿà¯ˆ", "il"], ["à®Ÿà¯Š", "nlh"], ["à®Ÿà¯‹", "Nlh"], ["à®Ÿà¯Œ", "nls"],
      ["à®£à¯†", "nz"], ["à®£à¯‡", "Nz"], ["à®£à¯ˆ", "iz"], ["à®£à¯Š", "nzh"], ["à®£à¯‹", "Nzh"], ["à®£à¯Œ", "nzs"],
      ["à®¤à¯†", "nj"], ["à®¤à¯‡", "Nj"], ["à®¤à¯ˆ", "ij"], ["à®¤à¯Š", "njh"], ["à®¤à¯‹", "Njh"], ["à®¤à¯Œ", "njs"],
      ["à®¨à¯†", "ne"], ["à®¨à¯‡", "Ne"], ["à®¨à¯ˆ", "ie"], ["à®¨à¯Š", "neh"], ["à®¨à¯‹", "Neh"], ["à®¨à¯Œ", "nes"],
      ["à®ªà¯†", "ng"], ["à®ªà¯‡", "Ng"], ["à®ªà¯ˆ", "ig"], ["à®ªà¯Š", "ngh"], ["à®ªà¯‹", "Ngh"], ["à®ªà¯Œ", "ngs"],
      ["à®®à¯†", "nk"], ["à®®à¯‡", "Nk"], ["à®®à¯ˆ", "ik"], ["à®®à¯Š", "nkh"], ["à®®à¯‹", "Nkh"], ["à®®à¯Œ", "nks"],
      ["à®¯à¯†", "na"], ["à®¯à¯‡", "Na"], ["à®¯à¯ˆ", "ia"], ["à®¯à¯Š", "nah"], ["à®¯à¯‹", "Nah"], ["à®¯à¯Œ", "nas"],
      ["à®°à¯†", "nu"], ["à®°à¯‡", "Nu"], ["à®°à¯ˆ", "iu"], ["à®°à¯Š", "nuh"], ["à®°à¯‹", "Nuh"], ["à®°à¯Œ", "nus"],
      ["à®²à¯†", "ny"], ["à®²à¯‡", "Ny"], ["à®²à¯ˆ", "iy"], ["à®²à¯Š", "nyh"], ["à®²à¯‹", "Nyh"], ["à®²à¯Œ", "nls"],
      ["à®µà¯†", "nv"], ["à®µà¯‡", "Nv"], ["à®µà¯ˆ", "iv"], ["à®µà¯Š", "nvh"], ["à®µà¯‹", "Nvh"], ["à®µà¯Œ", "nvs"],
      ["à®´à¯†", "no"], ["à®´à¯‡", "No"], ["à®´à¯ˆ", "io"], ["à®´à¯Š", "noh"], ["à®´à¯‹", "Noh"], ["à®´à¯Œ", "nos"],
      ["à®³à¯†", "ns"], ["à®³à¯‡", "Ns"], ["à®³à¯ˆ", "is"], ["à®³à¯Š", "nsh"], ["à®³à¯‹", "Nsh"], ["à®³à¯Œ", "nss"],
      ["à®±à¯†", "nw"], ["à®±à¯‡", "Nw"], ["à®±à¯ˆ", "iw"], ["à®±à¯Š", "nwh"], ["à®±à¯‹", "Nwh"], ["à®±à¯Œ", "nws"],
      ["à®©à¯†", "nd"], ["à®©à¯‡", "Nd"], ["à®©à¯ˆ", "id"], ["à®¨à¯Š", "ndh"], ["à®¨à¯‹", "Ndh"], ["à®©à¯Œ", "nds"],
      ["à®•à®¾", "fh"], ["à®šà®¾", "rh"], ["à®žà®¾", "nh"], ["à®Ÿà®¾", "lh"], ["à®£à®¾", "zh"], ["à®¤à®¾", "jh"], ["à®¨à®¾", "eh"], ["à®ªà®¾", "gh"], ["à®®à®¾", "kh"], ["à®¯à®¾", "ah"], ["à®°à®¾", "uh"], ["à®²à®¾", "yh"], ["à®µà®¾", "vh"], ["à®´à®¾", "oh"], ["à®³à®¾", "sh"], ["à®±à®¾", "wh"], ["à®©à®¾", "dh"],
      ["à®•à¯", "f;"], ["à®•", "f"], ["à®™à¯", "';"], ["à®™", " '"], ["à®šà¯", "r;"], ["à®š", "r"], ["à®žà¯", "n;"], ["à®ž", "n"], ["à®Ÿà¯", "l;"], ["à®Ÿ", "l"], ["à®£à¯", "z;"], ["à®£", "z"], ["à®¤à¯", "j;"], ["à®¤", "j"], ["à®¨à¯", "e;"], ["à®¨", "e"], ["à®ªà¯", "g;"], ["à®ª", "g"], ["à®®à¯", "k;"], ["à®®", "k"], ["à®¯à¯", "a;"], ["à®¯", "a"], ["à®°à¯", "u;"], ["à®°", "u"], ["à®²à¯", "y;"], ["à®²", "y"], ["à®µà¯", "t;"], ["à®µ", "t"], ["à®´à¯", "o;"], ["à®´", "o"], ["à®³à¯", "s;"], ["à®³", "s"], ["à®±à¯", "w;"], ["à®±", "w"], ["à®©à¯", "d;"], ["à®©", "d"]
    ];
    let res = text;
    mapping.forEach(([u, b]) => { res = res.split(u).join(b); });
    return res;
  }


  async function loadStateFromServer() {
    try {
      // Add cache buster to ensure we get fresh data
      const response = await fetch(`./api/storage.php?t=${Date.now()}`);
      const data = await response.json();
      console.log('Loaded state from server:', data);
      
      // Migration logic: Only migrate if server is truly fresh/empty
      const localSites = localStorage.getItem('monitored_sites');
      const isServerEmpty = !data || (
        (!data.monitored_sites || data.monitored_sites.length === 0) && 
        (!data.templates || Object.keys(data.templates).length === 0) &&
        (!data.settings || Object.keys(data.settings).length === 0)
      );

      if (isServerEmpty && localSites) {
        console.log('Migrating local data to server...');
        appState = {
          monitored_sites: JSON.parse(localSites || '[]'),
          auto_saved_posts: JSON.parse(localStorage.getItem('auto_saved_posts') || '[]'),
          templates: JSON.parse(localStorage.getItem('newsflash_templates') || '{}'),
          settings: JSON.parse(localStorage.getItem('newsflash_settings') || '{}'),
          processed_links: JSON.parse(localStorage.getItem('processed_links') || '[]')
        };
        await saveStateToServer();
      } else {
        appState = data;
      }

      // Sync variables
      monitoredSites = appState.monitored_sites;
      autoSavedPosts = appState.auto_saved_posts;
      
      // Apply initial settings if exist
      if (appState.settings && Object.keys(appState.settings).length > 0) {
        applyDesignSettings(appState.settings);
      }
      
      renderSites();
      renderAutoPosts();
      renderTemplateList();
    } catch (e) {
      console.error('Failed to load state from server', e);
    }
  }

  async function saveStateToServer() {
    try {
      appState.monitored_sites = monitoredSites;
      appState.auto_saved_posts = autoSavedPosts;
      
      const response = await fetch('./api/storage.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState)
      });
      
      const result = await response.json();
      if (!result.success) {
        console.error('Server save error:', result.error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Failed to save state to server', e);
      return false;
    }
  }

  // --- PERSISTENCE WRAPPERS ---
  function saveSites() {
    saveStateToServer();
    renderSites();
  }

  function saveAutoPosts() {
    // Save to server
    saveStateToServer();
    // Also save to localStorage as backup
    localStorage.setItem('auto_saved_posts', JSON.stringify(autoSavedPosts));
    renderAutoPosts();
  }

  // Toggle Panel
  toggleWebsitesBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const isHidden = monitoredSitesPanel.style.display === 'none';
    monitoredSitesPanel.style.display = isHidden ? 'block' : 'none';
    toggleWebsitesBtn.textContent = isHidden ? 'ðŸ”¼ Close Manager' : 'ðŸ“ Manage Monitored Sites (10)';
  });

  // Render Sites
  function renderSites() {
    sitesList.innerHTML = '';
    monitoredSites.forEach((site, index) => {
      const div = document.createElement('div');
      div.className = 'site-item';
      div.innerHTML = `
        <span title="${site.url}"><strong>${site.name}</strong></span>
        <span class="delete-btn" data-index="${index}">ðŸ—‘ï¸</span>
      `;
      div.querySelector('.delete-btn').addEventListener('click', () => {
        monitoredSites.splice(index, 1);
        saveSites();
      });
      sitesList.appendChild(div);
    });
  }

  addSiteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const name = siteNickname.value.trim();
    const url = siteUrl.value.trim();
    if (!name || !url) return alert('Enter name and URL');
    if (monitoredSites.length >= 10) return alert('Maximum 10 sites allowed');

    monitoredSites.push({ name, url, lastPost: '' });
    siteNickname.value = '';
    siteUrl.value = '';
    saveSites();
  });

  // Render Auto-Saved Posts
  function renderAutoPosts() {
    autoPostsList.innerHTML = '';
    if (autoSavedPosts.length === 0) {
      autoPostsList.innerHTML = '<p style="opacity: 0.5; text-align: center;">No new posts captured yet.</p>';
      return;
    }
    autoSavedPosts.forEach((post, index) => {
      const div = document.createElement('div');
      div.className = 'post-item';
      div.style.cursor = 'pointer';
      div.innerHTML = `
        <div style="flex: 1;">
          <div style="font-weight: 600;">${post.title}</div>
          <div style="font-size: 0.65rem; opacity: 0.7;">${post.siteName}</div>
        </div>
        <span class="delete-btn" data-index="${index}" style="margin-left: 5px;">Ã—</span>
      `;
      div.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
          autoSavedPosts.splice(index, 1);
          saveAutoPosts();
          return;
        }
        loadPostToCard(post);
      });
      autoPostsList.appendChild(div);
    });
  }

  // (Removed duplicate saveAutoPosts function that was overwriting the server-side save)

  async function loadPostToCard(post) {
    urlInput.value = post.url;
    inputH1.value = post.title;
    contentEditor.value = post.content || '';
    if (post.image) {
      setCardImage(post.image);
    }
    updateCardPreview();
    showToast(`Loaded: ${post.title}`);
  }

  // Auto Scanner (Updated with RSS & Deep Linking)
  async function syncAllSites() {
    showLoader(true, 'Scanning RSS Feeds for new posts (last 30 mins)...');
    let foundNew = 0;
    const processedLinks = appState.processed_links || [];

    for (const site of monitoredSites) {
      try {
        const response = await fetch(`./api/rss_sync.php?url=${encodeURIComponent(site.url)}&minutes=30`);
        const data = await response.json();
        
        if (data.success && data.items) {
          data.items.forEach(item => {
            if (!processedLinks.includes(item.link)) {
              autoSavedPosts.unshift({
                title: item.title,
                url: item.link,
                siteName: site.name,
                timestamp: item.timestamp
              });
              processedLinks.push(item.link);
              foundNew++;
            }
          });
        }
      } catch (e) {
        console.error(`RSS Sync failed for ${site.name}`, e);
      }
    }

    if (foundNew > 0) {
      if (processedLinks.length > 500) processedLinks.splice(0, processedLinks.length - 500);
      appState.processed_links = processedLinks;
      saveAutoPosts();
      showToast(`Captured ${foundNew} new deep links!`);
    } else {
      showToast('No new posts in the last 30 minutes.');
    }
    showLoader(false);
  }

  syncAllBtn.addEventListener('click', (e) => {
    e.preventDefault();
    syncAllSites();
  });

  // Periodic Auto-Scanner (every 5 minutes)
  setInterval(() => {
    if (monitoredSites.length > 0) {
      console.log('Running background sync...');
      syncAllSites();
    }
  }, 5 * 60 * 1000);

  // --- WORKFLOW LOGIC ---
  let workflowQueue = [];
  let currentWorkflowIndex = -1;
  let isWaitingForApproval = false;

  startWorkflowBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (autoSavedPosts.length === 0) return alert('Queue is empty. Please Sync All first.');
    startWorkflow();
  });

  async function startWorkflow() {
    workflowQueue = [...autoSavedPosts];
    currentWorkflowIndex = 0;
    workflowProgress.style.display = 'block';
    processNextInWorkflow();
  }

  async function processNextInWorkflow() {
    if (currentWorkflowIndex >= workflowQueue.length) {
      showToast('âœ… Workflow Completed!');
      workflowProgress.style.display = 'none';
      currentPostName.textContent = 'None';
      return;
    }

    const post = workflowQueue[currentWorkflowIndex];
    currentPostName.textContent = post.title.substring(0, 30) + '...';
    
    showLoader(true, `Step 1/3: Loading & AI Rewriting... (${currentWorkflowIndex + 1}/${workflowQueue.length})`);
    
    try {
      // Step 1: Load and Extract
      urlInput.value = post.url;
      const response = await fetch(`./api/extract.php?url=${encodeURIComponent(post.url)}`);
      const data = await response.json();
      
      contentEditor.value = data.content;
      inputH1.value = data.title;
      if (data.images && data.images[0]) {
        setCardImage(data.images[0]);
      }

      // Step 2: AI Smart Rewrite
      showLoader(true, 'Step 2/3: AI Content Optimization...');
      const rewrittenContent = await fetchAI('content', contentEditor.value);
      contentEditor.value = rewrittenContent;

      // Step 3: AI Headlines
      showLoader(true, 'Step 3/3: AI Headline Generation...');
      const headlinesRes = await fetchAI('headline', rewrittenContent);
      const lines = headlinesRes.split('\n').filter(l => l.trim() !== '');
      inputH1.value = (lines[0] || headlinesRes).replace(/[#*]/g, '').trim();
      inputH2.value = (lines[1] || '').replace(/[#*]/g, '').trim();
      inputH3.value = (lines[2] || '').replace(/[#*]/g, '').trim();

      // Update Card
      updateCardPreview();
      showLoader(false);
      
      isWaitingForApproval = true;
      showToast('ðŸŽ¤ Say "OK" to save and continue');
      
      // Highlight the current item in the list
      renderAutoPosts(currentWorkflowIndex);
      
    } catch (err) {
      console.error('Workflow Step Failed:', err);
      showLoader(false);
      if (confirm('Step failed. Skip to next?')) {
        currentWorkflowIndex++;
        processNextInWorkflow();
      }
    }
  }

  async function approveAndSave() {
    if (!isWaitingForApproval) return;
    isWaitingForApproval = false;
    
    showLoader(true, 'Saving Postcard & Logging...');
    try {
      const canvas = await captureCard();
      const imageData = canvas.toDataURL('image/png');
      
      const response = await fetch('./api/save_local.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          title: inputH1.value,
          url: urlInput.value
        })
      });
      
      const result = await response.json();
      if (result.success) {
        showToast('âœ… Saved Successfully!');
        
        // --- WEBHOOK TRIGGER (Option 2) ---
        const webhookUrl = webhookUrlInput.value.trim();
        if (webhookUrl) {
          try {
            const currentOrigin = window.location.origin;
            const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
            const fullImageUrl = `${currentOrigin}${currentPath}/NewsOutput/${result.filename}`;
            
            fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: inputH1.value,
                content: contentEditor.value,
                hashtags: fbHashtagsOutput.value,
                image_url: fullImageUrl,
                source_url: urlInput.value
              })
            }).catch(e => console.error("Webhook error:", e));
            showToast('ðŸš€ Webhook Triggered!');
          } catch(e) {
            console.error("Webhook format error:", e);
          }
        }

        // Remove from queue/list
        autoSavedPosts.shift(); 
        saveAutoPosts();
        
        // Move to next
        currentWorkflowIndex = 0; // Always take the first after shift
        processNextInWorkflow();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      alert('Save Failed: ' + err.message);
      isWaitingForApproval = true; // Let them try again
    } finally {
      showLoader(false);
    }
  }

  // --- VOICE RECOGNITION (Updated) ---
  const recognition = window.SpeechRecognition || window.webkitSpeechRecognition ? new (window.SpeechRecognition || window.webkitSpeechRecognition)() : null;
  let isListening = false;

  if (recognition) {
    recognition.continuous = true;
    recognition.lang = 'en-US'; 
    recognition.interimResults = false;

    recognition.onstart = () => {
      isListening = true;
      voiceStatus.textContent = 'Listening...';
      voiceIcon.textContent = 'ðŸ›‘';
      voiceIndicator.style.display = 'block';
    };

    recognition.onend = () => {
      isListening = false;
      voiceStatus.textContent = 'Start Listening';
      voiceIcon.textContent = 'ðŸŽ¤';
      voiceIndicator.style.display = 'none';
      if (workflowQueue.length > 0) startListening(); // Keep listening during workflow
    };

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      console.log('Voice Command:', transcript);
      handleVoiceCommand(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech Recognition Error:', event.error);
      stopListening();
    };
  }

  function startListening() {
    if (recognition) recognition.start();
    else alert('Speech recognition not supported in this browser.');
  }

  function stopListening() {
    if (recognition) recognition.stop();
  }

  voiceBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (isListening) stopListening();
    else startListening();
  });

  async function handleVoiceCommand(cmd) {
    showToast(`Command: "${cmd}"`);
    
    // Command: "OK" (Approval)
    if (cmd === 'ok' || cmd.includes('okay') || cmd.includes('confirm')) {
      if (isWaitingForApproval) {
        approveAndSave();
      }
      return;
    }

    // Command: "Start" (Trigger Workflow)
    if (cmd.includes('start workflow') || cmd.includes('begin')) {
      startWorkflow();
      return;
    }
    
    // ... rest of voice commands ...
    if (cmd.includes('extract from')) {
      const targetName = cmd.replace('extract from', '').trim();
      const site = monitoredSites.find(s => s.name.toLowerCase() === targetName);
      if (site) {
        urlInput.value = site.url;
        extractBtn.click();
      }
    }
    if (cmd.includes('scan all') || cmd.includes('sync all')) syncAllSites();
    if (cmd.includes('download')) downloadBtn.click();
  }

  // Update renderAutoPosts to include an OK button for processing
  function renderAutoPosts(highlightIndex = -1) {
    autoPostsList.innerHTML = '';
    if (autoSavedPosts.length === 0) {
      autoPostsList.innerHTML = '<p style="opacity: 0.5; text-align: center;">No news items in queue.</p>';
      return;
    }
    autoSavedPosts.forEach((post, index) => {
      const div = document.createElement('div');
      div.className = 'post-item';
      if (index === highlightIndex) div.style.borderColor = '#8b5cf6';
      div.style.padding = '0.75rem';
      div.style.flexDirection = 'column';
      div.style.gap = '0.5rem';

      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 0.8rem; line-height: 1.2; color: ${index === highlightIndex ? '#8b5cf6' : 'inherit'};">${post.title}</div>
            <div style="font-size: 0.65rem; opacity: 0.7; margin-top: 2px;">${post.siteName}</div>
          </div>
          <span class="delete-btn" data-index="${index}" style="opacity: 0.5;">Ã—</span>
        </div>
        <button class="process-btn btn-primary" style="width: 100%; padding: 4px; font-size: 0.7rem; background: #10b981; border-radius: 4px;">OK / Process</button>
      `;

      // OK / Process Button Click
      div.querySelector('.process-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        processSinglePost(post, index);
      });

      div.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        autoSavedPosts.splice(index, 1);
        saveAutoPosts();
      });

      div.addEventListener('click', () => {
        // Just preview link details without full extract
        showToast(`Selected: ${post.title}`);
      });
      
      autoPostsList.appendChild(div);
    });
  }

  async function processSinglePost(post, index) {
    showLoader(true, 'Extracting headline, content & high-quality image...');
    
    try {
      const response = await fetch(`./api/extract.php?url=${encodeURIComponent(post.url)}`);
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      // Populate Design Screen
      inputH1.value = data.title;
      contentEditor.value = data.content;
      if (data.images && data.images[0]) {
        setCardImage(data.images[0]);
      }

      // Update Card Preview
      updateCardPreview();
      
      // Auto-trigger AI if needed (as per previous workflow request)
      // For now, just show the instant preview
      showToast('âœ… Postcard Design Updated! Ready for review.');
      
      // Remove from pending list after processing
      autoSavedPosts.splice(index, 1);
      saveAutoPosts();
      
    } catch (err) {
      alert('Processing Failed: ' + err.message);
    } finally {
      showLoader(false);
    }
  }

  // Manual Webhook Trigger
  const manualWebhookBtn = document.getElementById('manual-webhook-btn');
  if (manualWebhookBtn) {
    manualWebhookBtn.addEventListener('click', async (e) => {
    e.preventDefault();
      const webhookUrl = document.getElementById('webhook-url').value.trim();
      if (!webhookUrl) return alert('Please enter a Webhook URL in Settings first!');
      
      showLoader(true, 'Triggering Webhook...');
      try {
        const canvas = await captureCard();
        const imageData = canvas.toDataURL('image/png');
        
        const response = await fetch('./api/save_local.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageData,
            title: inputH1.value,
            url: urlInput.value
          })
        });
        
        const result = await response.json();
        if (result.success) {
          const currentOrigin = window.location.origin;
          const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
          const fullImageUrl = `${currentOrigin}${currentPath}/NewsOutput/${result.filename}`;
          
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: inputH1.value,
              content: contentEditor.value,
              hashtags: fbHashtagsOutput.value,
              image_url: fullImageUrl,
              source_url: urlInput.value
            })
          });
          showToast('ðŸš€ Webhook Triggered Successfully!');
        } else {
          throw new Error(result.error);
        }
      } catch (e) {
        alert('Failed to trigger webhook: ' + e.message);
      } finally {
        showLoader(false);
      }
    });
  }

  // --- VIDEO CARD EXPORT LOGIC ---
  let isExportingVideo = false;
  downloadVideoBtn.addEventListener('click', async () => {
    if (isExportingVideo) return;
    
    console.log('Download Video Button Clicked');
    if (!cardVideo.src || cardVideo.src === '') {
      alert('Please upload a video first!');
      return;
    }
    isExportingVideo = true;
    downloadVideoBtn.disabled = true;
    showToast('ðŸŽ¬ Starting Video Engine... Please wait.');
    await exportVideoCard(false);
    isExportingVideo = false;
    downloadVideoBtn.disabled = false;
  });

  async function generateDesignOverlay() {
    console.log('Generating design overlay...');
    
    const savedImgDisplay = cardImg.style.display;
    const savedVidDisplay = cardVideo.style.display;
    const savedWrapperDisplay = posterVideoWrapper ? posterVideoWrapper.style.display : 'block';
    const savedLogoDisplay = cardLogo ? cardLogo.style.display : 'block';
    const savedDateDisplay = cardDate ? cardDate.style.display : 'block';
    
    cardImg.style.display = 'none';
    cardVideo.style.display = 'none';
    if (posterVideoWrapper) posterVideoWrapper.style.display = 'none';
    if (cardLogo) cardLogo.style.display = 'none';
    if (cardDate) cardDate.style.display = 'none';
    
    try {
      const canvas = await html2canvas(newsCard, {
        backgroundColor: '#ffffff',
        scale: 1,
        useCORS: true,
        logging: true,
        allowTaint: false,
        ignoreElements: (element) => {
          return element.id === 'card-video' || 
                 element.id === 'poster-video-wrapper' ||
                 element.id === 'play-overlay';
        }
      });
      
      console.log('Design overlay captured:', canvas.width, 'x', canvas.height);
      
      // Validate canvas has content
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let hasContent = false;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) {
          hasContent = true;
          break;
        }
      }
      
      if (!hasContent || canvas.width < 10 || canvas.height < 10) {
        console.warn('Canvas is empty or too small, creating fallback overlay');
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 500;
        fallbackCanvas.height = 625;
        const fctx = fallbackCanvas.getContext('2d');
        fctx.fillStyle = '#ffffff';
        fctx.fillRect(0, 0, 500, 625);
        return { main: fallbackCanvas, logoDate: null };
      }
      
      // Capture logo and date separately so they appear on top of video
      let logoDateCanvas = null;
      if (cardLogo && cardLogo.offsetWidth > 0 && cardLogo.offsetHeight > 0) {
        const logoDateContainer = document.createElement('div');
        logoDateContainer.style.cssText = `position:absolute;top:0;left:0;width:${newsCard.offsetWidth}px;height:${newsCard.offsetHeight}px;pointer-events:none;background:transparent;`;
        document.body.appendChild(logoDateContainer);
        
        const logoClone = cardLogo.cloneNode(true);
        logoClone.style.cssText = cardLogo.style.cssText + ';position:absolute;visibility:visible;display:block;';
        logoDateContainer.appendChild(logoClone);
        
        const dateClone = cardDate.cloneNode(true);
        dateClone.style.cssText = cardDate.style.cssText + ';position:absolute;visibility:visible;display:block;';
        logoDateContainer.appendChild(dateClone);
        
        try {
          logoDateCanvas = await html2canvas(logoDateContainer, {
            backgroundColor: 'transparent',
            scale: 1,
            useCORS: true,
            logging: true,
            allowTaint: false
          });
          console.log('Logo/date overlay captured:', logoDateCanvas.width, 'x', logoDateCanvas.height);
        } catch (e) {
          console.warn('Failed to capture logo/date overlay:', e);
        }
        
        document.body.removeChild(logoDateContainer);
      }
      
      return { main: canvas, logoDate: logoDateCanvas };
    } catch (err) {
      console.error('html2canvas error:', err);
      throw new Error('Design capture failed: ' + err.message);
    } finally {
      cardImg.style.display = savedImgDisplay;
      cardVideo.style.display = savedVidDisplay;
      if (posterVideoWrapper) posterVideoWrapper.style.display = savedWrapperDisplay;
      if (cardLogo) cardLogo.style.display = savedLogoDisplay;
      if (cardDate) cardDate.style.display = savedDateDisplay;
    }
  }

  async function exportVideoCard(skipDownload = false) {
    if (!cardVideo.src || (posterVideoWrapper && posterVideoWrapper.style.display === 'none')) {
      alert('Please load a video first before downloading.');
      return;
    }

    return new Promise(async (resolve, reject) => {
      try {
        downloadVideoBtn.textContent = '?? Generating Design...';
        
        console.log('Starting export process...');
        const overlayResult = await generateDesignOverlay();
        const overlayData = overlayResult.main.toDataURL('image/png');
        const logoDateData = overlayResult.logoDate ? overlayResult.logoDate.toDataURL('image/png') : null;
        
        downloadVideoBtn.textContent = '?? Rendering Video (Server)...';
        
        const videoSrcUrl = new URL(cardVideo.src);
        let videoId = videoSrcUrl.pathname.split('/').pop().replace('.mp4', '');
        
        const startTime = parseFloat(trimStartInput.value) || 0;
        const endTime = parseFloat(trimEndInput.value) || cardVideo.duration;

        const imageBox = document.getElementById('card-image-box');
        const boxHeightRatio = imageBox.offsetHeight / newsCard.offsetHeight;

        let videoTransform = { x: 0, y: 0, scaleW: 1, scaleH: 1 };
        if (posterVideoWrapper && posterVideoWrapper.style.display !== 'none') {
          const wrapperRect = posterVideoWrapper.getBoundingClientRect();
          const boxRect = imageBox.getBoundingClientRect();
          videoTransform = {
            scaleW: wrapperRect.width / boxRect.width,
            scaleH: wrapperRect.height / boxRect.height,
            x: (wrapperRect.left - boxRect.left) / boxRect.width,
            y: (wrapperRect.top - boxRect.top) / boxRect.height
          };
        }

        const requestBody = {
          videoId: videoId,
          overlayData: overlayData,
          trimStart: startTime,
          trimEnd: endTime,
          boxHeightRatio: boxHeightRatio,
          videoTransform: videoTransform,
          videoTransform: videoTransform
        };
        
        if (logoDateData) {
          requestBody.logoDateData = logoDateData;
        }

                let renderPollInterval;
        const totalDuration = endTime > 0 ? (endTime - startTime) : (cardVideo.duration || 0);
        
        if (totalDuration > 0) {
           renderPollInterval = setInterval(async () => {
              try {
                 const logRes = await fetch('./api/get_render_log.php?file=' + encodeURIComponent(videoId + '_render.log'));
                 const logData = await logRes.json();
                 if (logData.success && logData.log) {
                    const timeMatches = logData.log.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/g);
                    if (timeMatches && timeMatches.length > 0) {
                       const lastTime = timeMatches[timeMatches.length - 1];
                       const matchParts = lastTime.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
                       if (matchParts) {
                          const h = matchParts[1];
                          const m = matchParts[2];
                          const s = matchParts[3];
                          const currentSeconds = parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
                          let percent = Math.round((currentSeconds / totalDuration) * 100);
                          if (percent > 99) percent = 99;
                          downloadVideoBtn.textContent = '? Rendering: ' + percent + '%...';
                       }
                    }
                 }
              } catch (e) {}
           }, 2000);
        }

        let data;
        try {
          const response = await fetch('./api/server_export.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(600000)
          });
          data = await response.json();
        } finally {
          if (renderPollInterval) clearInterval(renderPollInterval);
        }
        
        if (data.success && data.url) {
          downloadVideoBtn.textContent = 'ðŸŽ¬ Download Video';
          
          const renderTime = data.render_time ? ` (Rendered in ${data.render_time}s)` : '';
          showToast(`âœ… Video Ready!${renderTime}`);
          
          // Show render log if available
          if (data.log_file) {
            try {
              const logResponse = await fetch('./api/get_render_log.php?file=' + encodeURIComponent(data.log_file));
              const logData = await logResponse.json();
              if (logData.success && logData.log) {
                const renderLogSection = document.getElementById('render-log-section');
                const renderLog = document.getElementById('render-log');
                if (renderLogSection && renderLog) {
                  renderLogSection.style.display = 'block';
                  renderLog.value = logData.log;
                }
              }
            } catch (e) {
              console.warn('Could not fetch render log:', e);
            }
          }
          
          if (!skipDownload) {
            const filename = data.filename || data.url.split('/').pop();
            const downloadUrl = './api/download_file.php?file=' + encodeURIComponent(filename);
            
            console.log('Download URL:', downloadUrl);
            console.log('Filename:', filename);
            console.log('Full response data:', data);
            
            // Show file location in render log
            const renderLogSection = document.getElementById('render-log-section');
            const renderLog = document.getElementById('render-log');
            if (renderLogSection && renderLog) {
              renderLogSection.style.display = 'block';
              renderLog.value = (renderLog.value || '') + '\n\n=== DOWNLOAD INFO ===\n';
              renderLog.value += 'Filename: ' + filename + '\n';
              renderLog.value += 'Download URL: ' + downloadUrl + '\n';
              renderLog.value += 'Server Path: ' + (data.output_file || 'N/A') + '\n';
              renderLog.value += 'Render Time: ' + (data.render_time || 'N/A') + 's\n';
            }
            
            // Try direct download
            try {
              const link = document.createElement('a');
              link.href = downloadUrl;
              link.download = 'NewsCard_' + filename;
              link.style.display = 'none';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              setTimeout(() => {
                showToast('âœ… Download Started! Check your Downloads folder.\nFile: ' + filename);
              }, 500);
            } catch (downloadError) {
              console.error('Direct download failed:', downloadError);
              window.open(downloadUrl, '_blank');
              showToast('âš ï¸ Opened in new tab. Right-click and Save As.\nFile: ' + filename);
            }
          }
          resolve(data.url);
        } else {
          const renderTime = data.render_time ? `\nRender time: ${data.render_time}s` : '';
          const logInfo = data.log_file ? `\nLog file: ${data.log_file}` : '';
          
          // Show error log if available
          if (data.log_file) {
            try {
              const logResponse = await fetch('./api/get_render_log.php?file=' + encodeURIComponent(data.log_file));
              const logData = await logResponse.json();
              if (logData.success && logData.log) {
                const renderLogSection = document.getElementById('render-log-section');
                const renderLog = document.getElementById('render-log');
                if (renderLogSection && renderLog) {
                  renderLogSection.style.display = 'block';
                  renderLog.value = logData.log;
                }
              }
            } catch (e) {
              console.warn('Could not fetch error log:', e);
            }
          }
          
          throw new Error((data.error || 'Unknown server error') + renderTime + logInfo);
        }
        
      } catch (e) {
        console.error('Video Export Error:', e);
        downloadVideoBtn.textContent = 'ðŸŽ¬ Download Video';
        alert('Server Export Failed: ' + e.message);
        reject(e);
      }
    });
  }

  // -----------------------------------------------
  // FACEBOOK HANDLERS (Fetch Pages, Scheduling, Single Post)
  // -----------------------------------------------
  let fbPages = [];
  let fbVisuals = {};

    async function initFacebookHandlers() {
    try {
        const pagesRes = await fetch('./api/get_pages.php');
        const pagesData = await pagesRes.json();
        
        const visualsRes = await fetch('./api/page_visuals.json');
        fbVisuals = await visualsRes.json();

        if (pagesData.success && pagesData.pages.length > 0) {
            fbPages = pagesData.pages;
            
            // Populate Auto Poster list
            if (fbPageList) {
                fbPageList.innerHTML = '<label style="display:flex;align-items:center;gap:0.5rem;font-size:0.8rem;margin-bottom:0.4rem;cursor:pointer;color:#000;"><input type="checkbox" id="fb-page-select-all" checked> Select All</label>';
                fbPages.forEach(page => {
                    const label = document.createElement('label');
                    label.style.cssText = 'display:flex;align-items:center;gap:0.5rem;font-size:0.8rem;margin-bottom:0.3rem;cursor:pointer;color:#000;';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = page.id;
                    checkbox.checked = true;
                    checkbox.className = 'fb-page-checkbox';
                    label.appendChild(checkbox);
                    label.appendChild(document.createTextNode(page.name));
                    fbPageList.appendChild(label);
                });
            }

            // Populate Bulk Upload list
            if (bulkFbPageList) {
                bulkFbPageList.innerHTML = '<label style="display:flex;align-items:center;gap:0.5rem;font-size:0.8rem;margin-bottom:0.4rem;cursor:pointer;color:#000;"><input type="checkbox" id="bulk-fb-page-select-all" checked> Select All</label>';
                fbPages.forEach(page => {
                    const label = document.createElement('label');
                    label.style.cssText = 'display:flex;align-items:center;gap:0.5rem;font-size:0.8rem;margin-bottom:0.3rem;cursor:pointer;color:#000;';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = page.id;
                    checkbox.checked = true;
                    checkbox.className = 'bulk-fb-page-checkbox';
                    label.appendChild(checkbox);
                    label.appendChild(document.createTextNode(page.name));
                    bulkFbPageList.appendChild(label);
                });
            }
        } else {
            if (fbPageList) fbPageList.innerHTML = '<label style="font-size: 0.8rem; color: #64748b;">No Pages Found</label>';
            if (bulkFbPageList) bulkFbPageList.innerHTML = '<label style="font-size: 0.8rem; color: #64748b;">No Pages Found</label>';
        }
    } catch (e) {
        console.error("Error loading FB data:", e);
        if (fbPageList) fbPageList.innerHTML = '<label style="font-size: 0.8rem; color: #64748b;">Error loading pages</label>';
        if (bulkFbPageList) bulkFbPageList.innerHTML = '<label style="font-size: 0.8rem; color: #64748b;">Error loading pages</label>';
    }

    if (fbPageList) {
        fbPageList.addEventListener('change', (e) => {
            if (e.target.id === 'fb-page-select-all') {
                const checked = e.target.checked;
                fbPageList.querySelectorAll('.fb-page-checkbox').forEach(cb => cb.checked = checked);
            }
            const checkedBoxes = fbPageList.querySelectorAll('.fb-page-checkbox:checked');
            if (checkedBoxes.length === 1) {
                const pageId = checkedBoxes[0].value;
                const page = fbPages.find(p => p.id === pageId);
                if (page) applyPageVisuals(page);
            }
        });
    }

    if (bulkFbPageList) {
        bulkFbPageList.addEventListener('change', (e) => {
            if (e.target.id === 'bulk-fb-page-select-all') {
                const checked = e.target.checked;
                bulkFbPageList.querySelectorAll('.bulk-fb-page-checkbox').forEach(cb => cb.checked = checked);
            }
            const checkedBoxes = bulkFbPageList.querySelectorAll('.bulk-fb-page-checkbox:checked');
            if (checkedBoxes.length === 1) {
                const pageId = checkedBoxes[0].value;
                const page = fbPages.find(p => p.id === pageId);
                if (page) applyPageVisuals(page);
            }
        });
    }
 

  function applyPageVisuals(page) {
      const visual = fbVisuals[page.name];
      if (visual) {
          if (visual.logo) {
              mainLogo.src = visual.logo;
          }
          if (visual.template) {
              newsCard.className = 'news-card ' + visual.template;
          }
          const fbHashtags = document.getElementById('fb-hashtags-output') || document.getElementById('fb-hashtags');
          if (visual.hashtags && fbHashtags) {
              fbHashtags.value = visual.hashtags;
          }
          if (typeof updateCardPreview === 'function') {
              updateCardPreview();
          }
      }
  }

    function getSelectedFbPages() { if(!fbPageList) return []; const checkedBoxes = fbPageList.querySelectorAll('.fb-page-checkbox:checked'); return Array.from(checkedBoxes).map(cb => fbPages.find(p => p.id === cb.value)).filter(Boolean); }

    function getFbCaption() {
        let captionParts = [];
        if (typeof inputH1 !== 'undefined' && inputH1 && inputH1.value) captionParts.push(inputH1.value);
        if (typeof inputH2 !== 'undefined' && inputH2 && inputH2.value) captionParts.push(inputH2.value);
        if (typeof inputH3 !== 'undefined' && inputH3 && inputH3.value) captionParts.push(inputH3.value);
        
        let captionText = captionParts.join('\n');
        
        if (typeof contentEditor !== 'undefined' && contentEditor && contentEditor.value) {
            captionText += '\n\n' + contentEditor.value;
        }
        return captionText;
    }

    if (fbPostSingleBtn) {
        fbPostSingleBtn.addEventListener('click', async () => {
            const selectedPages = getSelectedFbPages();
            if (selectedPages.length === 0) return showToast("Please select at least one Facebook Page.");
            
            const mediaType = fbMediaType ? fbMediaType.value : 'image';
            const fbHashtags = document.getElementById('fb-hashtags-output') || document.getElementById('fb-hashtags');
            
            showLoader(true, `Preparing ${mediaType} for Facebook...`);
            try {
                let successCount = 0;
                let failCount = 0;
                
                for (const page of selectedPages) {
                    try {
                        showLoader(true, `Generating card for ${page.name}...`);
                        applyPageVisuals(page);
                        await new Promise(r => setTimeout(r, 400));
                        
                        let pageMediaData = '';
                        
                        if (mediaType === 'image') {
                            const canvas = await captureCard();
                            pageMediaData = canvas.toDataURL('image/png');
                        } else if (mediaType === 'video') {
                            showLoader(true, `Rendering Video for ${page.name}... This may take a minute.`);
                            const videoUrl = await exportVideoCard(true); // skip download
                            if (!videoUrl) throw new Error("Failed to generate video.");
                            
                            const filename = videoUrl.split('/').pop();
                            pageMediaData = './temp/' + filename;
                        }
                        
                        showLoader(true, `Posting to ${page.name}...`);
                        const resp = await fetch('./api/schedule_post.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                page_id: page.id,
                                page_token: page.access_token,
                                page_name: page.name,
                                message: getFbCaption(),
                                media_type: mediaType,
                                media_data: pageMediaData,
                                hashtags: fbHashtags ? fbHashtags.value : '',
                                schedule_time: new Date().toISOString()
                            })
                        });
                        
                        const scheduleResult = await resp.json();
                        if (!scheduleResult.success) {
                            failCount++;
                            console.error(`Schedule failed for ${page.name}:`, scheduleResult.error || scheduleResult.message);
                            continue;
                        }
                        
                        const cronResp = await fetch('./api/cron_publish.php');
                        const cronResult = await cronResp.json();
                        
                        if (cronResult.published > 0) {
                            successCount++;
                        } else {
                            failCount++;
                            const rawErr = cronResult.errors && cronResult.errors.length > 0 
                                ? cronResult.errors[0].error 
                                : 'Unknown error';
                            const errMsg = typeof rawErr === 'string' ? rawErr : JSON.stringify(rawErr);
                            console.error(`Publish failed for ${page.name}:`, errMsg);
                            showToast(`Failed to post to ${page.name}: ${errMsg}`);
                        }
                    } catch (err) {
                        failCount++;
                        console.error(`Error posting to ${page.name}:`, err);
                    }
                }
                
                if (successCount > 0) {
                    showToast(`Successfully posted ${mediaType} to ${successCount} page(s)! Failed: ${failCount}`);
                } else {
                    showToast(`Failed to post to all pages. Failed: ${failCount}`);
                }
            } catch (err) {
                console.error(err);
                showToast("Failed to post.");
            }
            showLoader(false);
        });
    }

    if (fbScheduleBtn) {
        fbScheduleBtn.addEventListener('click', async () => {
            const selectedPages = getSelectedFbPages();
            if (selectedPages.length === 0) return showToast("Please select at least one Facebook Page.");
            if (selectedPages.length > 1) return showToast("Please select only one page for scheduling.");
            
            const page = selectedPages[0];
            const scheduleTime = fbScheduleTime.value;
            const mediaType = fbMediaType ? fbMediaType.value : 'image';
            
            if (!scheduleTime) return showToast("Please select a date and time for scheduling.");
            
            showLoader(true, `Scheduling ${mediaType} Post...`);
            try {
                let mediaPayload = { type: mediaType, data: '' };
                const fbHashtags = document.getElementById('fb-hashtags-output') || document.getElementById('fb-hashtags');

                if (mediaType === 'image') {
                    applyPageVisuals(page);
                    await new Promise(r => setTimeout(r, 400));
                    const canvas = await captureCard();
                    mediaPayload.data = canvas.toDataURL('image/png');
                } else if (mediaType === 'video') {
                    showLoader(true, 'Rendering Video (Server)... This may take a minute.');
                    applyPageVisuals(page);
                    await new Promise(r => setTimeout(r, 400));
                    const videoUrl = await exportVideoCard(true); // skip download
                    if (!videoUrl) throw new Error("Failed to generate video.");
                    
                    const filename = videoUrl.split('/').pop();
                    mediaPayload.data = './temp/' + filename;
                }

                const resp = await fetch('./api/schedule_post.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        page_id: page.id,
                        page_token: page.access_token,
                        page_name: page.name,
                        message: getFbCaption(),
                        media_type: mediaType,
                        media_data: mediaPayload.data,
                        hashtags: fbHashtags ? fbHashtags.value : '',
                        schedule_time: scheduleTime
                    })
                });

                const result = await resp.json();
                if (result.success) {
                    showToast(`Scheduled for ${new Date(scheduleTime).toLocaleString()}`);
                } else {
                    showToast("Failed to schedule: " + (result.error || result.message || 'Unknown error'));
                }
            } catch (err) {
                console.error(err);
                showToast("Failed to schedule.");
            }
            showLoader(false);
        });
    }
  }

  // --- BULK UPLOAD & AUTO-POST TO ALL PAGES ---
  let bulkImageData = null;
  let bulkVideoData = null;

  if (bulkMediaType) {
    bulkMediaType.addEventListener('change', () => {
      const type = bulkMediaType.value;
      if (type === 'image') {
        bulkMediaUrl.style.display = 'none';
        bulkUploadLabel.style.display = 'block';
        bulkVideoUploadLabel.style.display = 'none';
      } else if (type === 'video-file') {
        bulkMediaUrl.style.display = 'none';
        bulkUploadLabel.style.display = 'none';
        bulkVideoUploadLabel.style.display = 'block';
      } else {
        bulkMediaUrl.style.display = 'block';
        bulkUploadLabel.style.display = 'none';
        bulkVideoUploadLabel.style.display = 'none';
        if (type === 'fb-video') bulkMediaUrl.placeholder = 'Paste Facebook video URL here...';
        else if (type === 'youtube') bulkMediaUrl.placeholder = 'Paste YouTube link here...';
        else if (type === 'tiktok') bulkMediaUrl.placeholder = 'Paste TikTok link here...';
      }
    });

    bulkMediaType.dispatchEvent(new Event('change'));
  }

  if (bulkImageUpload) {
    bulkImageUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      bulkImageData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      e.target.value = '';
      bulkVideoData = null;
      showToast('Image ready for bulk post');
      e.target.value = '';
    });
  }

  if (bulkVideoUpload) {
    bulkVideoUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 250) {
        alert('Video too large (' + fileSizeMB.toFixed(1) + 'MB). Max 250MB.');
        return;
      }
      showLoader(true, 'Uploading video for bulk post...');
      const formData = new FormData();
      formData.append('video_file', file);
      try {
        const resp = await fetch('./api/upload_video.php', {
          method: 'POST',
          body: formData
        });
        const data = await resp.json();
        if (!data.success) throw new Error(data.error);
        bulkVideoData = data.url;
        bulkImageData = null;
        showLoader(false);
        showToast('Video ready for bulk post');
      } catch (err) {
        showLoader(false);
        alert('Upload failed: ' + err.message);
      }
      e.target.value = '';
    });
  }

  async function postToAllPages(mediaType, mediaData, headline, hashtags) {
    const selectedPages = bulkFbPageList ? (function() {
      const checkedBoxes = bulkFbPageList.querySelectorAll('.bulk-fb-page-checkbox:checked');
      return Array.from(checkedBoxes).map(cb => fbPages.find(p => p.id === cb.value)).filter(Boolean);
    })() : fbPages;
    
    if (!selectedPages.length) {
      showToast('No Facebook pages selected. Please select at least one page.');
      return;
    }
    showLoader(true, `Posting to ${selectedPages.length} pages...`);
    let successCount = 0;
    let failCount = 0;
    for (const page of selectedPages) {
      try {
        const payload = {
          page_id: page.id,
          page_token: page.access_token,
          page_name: page.name,
          message: (headline || '') + (hashtags ? '\n\n' + hashtags : ''),
          media_type: mediaType,
          media_data: mediaData,
          hashtags: hashtags || '',
          schedule_time: new Date().toISOString()
        };
        const resp = await fetch('./api/schedule_post.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await resp.json();
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          const errMsg = result.error || result.message || 'Unknown error';
          console.error(`Failed to schedule post for ${page.name}:`, errMsg);
        }
      } catch (err) {
        failCount++;
        console.error(`Error posting to ${page.name}:`, err);
      }
    }
    await fetch('./api/cron_publish.php').then(r => r.json()).then(cronResult => {
      if (cronResult.published > 0) {
        showToast(`Posted to ${successCount} pages. Failed: ${failCount}`);
      } else {
        const errMsg = cronResult.errors && cronResult.errors.length > 0 
          ? JSON.stringify(cronResult.errors[0].error) 
          : 'Unknown error';
        showToast(`Publish completed. Success: ${successCount}, Failed: ${failCount}. Error: ${errMsg}`);
      }
    }).catch(err => {
      showToast(`Posted to ${successCount} pages. Failed: ${failCount}. Cron error: ${err.message}`);
    });
    showLoader(false);
  }

  if (bulkPostAllBtn) {
    bulkPostAllBtn.addEventListener('click', async () => {
      const mediaType = bulkMediaType ? bulkMediaType.value : 'image';
      const headline = bulkHeadline ? bulkHeadline.value.trim() : '';
      const hashtags = bulkHashtags ? bulkHashtags.value.trim() : '';
      const url = bulkMediaUrl ? bulkMediaUrl.value.trim() : '';
  
      if (mediaType === 'image') {
        if (!bulkImageData) {
          alert('Please upload an image first.');
          return;
        }
        await postToAllPages('image', bulkImageData, headline, hashtags);
      } else if (mediaType === 'video-file') {
        if (!bulkVideoData) {
          alert('Please upload a video first.');
          return;
        }
        await postToAllPages('video', bulkVideoData, headline, hashtags);
      } else if (['fb-video', 'youtube', 'tiktok'].includes(mediaType)) {
        if (!url) {
          alert('Please paste a video URL.');
          return;
        }
        // The user specifically requested that pasting a link should just post it as a link, not download it.
        await postToAllPages('link', url, headline, hashtags);
      }
    });
  }

  // --- AUTO SET GLOBAL DATES ---
  function autoSetGlobalDates() {
    const now = new Date();
    
    // Auto-set schedule time to current datetime + 1 hour
    if (fbScheduleTime) {
      const scheduleTime = new Date(now.getTime() + (60 * 60 * 1000));
      const year = scheduleTime.getFullYear();
      const month = String(scheduleTime.getMonth() + 1).padStart(2, '0');
      const day = String(scheduleTime.getDate()).padStart(2, '0');
      const hours = String(scheduleTime.getHours()).padStart(2, '0');
      const minutes = String(scheduleTime.getMinutes()).padStart(2, '0');
      fbScheduleTime.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // Auto-set card date to today in DD.MM.YYYY format
    if (cardDate) {
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      cardDate.textContent = `${dd}.${mm}.${yyyy}`;
    }
  }

  // Initial renders & Server Load
  initFacebookHandlers();
  loadStateFromServer();
  autoSetGlobalDates();

  // --- SYNC POSTER FRAME TO VIDEO EDITOR OVERLAY ---
  const togglePosterFrameBtn = document.getElementById('toggle-poster-frame-btn');
  const videoCardOverlay = document.getElementById('video-card-overlay');

  function syncPostcardToVideo() {
    if (!videoCardOverlay || videoCardOverlay.style.display === 'none') return;

    videoCardOverlay.innerHTML = '';
    if (!newsCard) return;

    const clone = newsCard.cloneNode(true);
    clone.removeAttribute('id');

    clone.style.setProperty('width', '100%', 'important');
    clone.style.setProperty('height', '100%', 'important');
    clone.style.setProperty('background', 'transparent', 'important');
    clone.style.setProperty('background-image', 'none', 'important');
    clone.style.setProperty('box-shadow', 'none', 'important');
    clone.style.setProperty('transform', 'none', 'important');
    clone.style.setProperty('border-radius', '8px', 'important');

    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));

    const imgEl = clone.querySelector('#card-img');
    if (imgEl) imgEl.remove();
    const vidEl = clone.querySelector('#card-video');
    if (vidEl) vidEl.remove();

    const playEl = clone.querySelector('#play-overlay');
    if (playEl) playEl.remove();

    const cardImgContainer = clone.querySelector('.card-image-container');
    if (cardImgContainer) {
      cardImgContainer.style.background = 'none !important';
      cardImgContainer.style.backgroundImage = 'none !important';
    }

    const cardLogo = clone.querySelector('.card-logo');
    if (cardLogo) cardLogo.style.display = 'none !important';

    const cardWatermark = clone.querySelector('.card-watermark');
    if (cardWatermark) cardWatermark.style.display = 'none !important';

    videoCardOverlay.appendChild(clone);
  }

  if (togglePosterFrameBtn) {
    togglePosterFrameBtn.addEventListener('click', () => {
      const isHidden = videoCardOverlay.style.display === 'none' || videoCardOverlay.style.display === '';
      if (isHidden) {
        videoCardOverlay.style.display = 'block';
        togglePosterFrameBtn.textContent = 'ðŸ–¼ï¸ Remove Poster Frame';
        togglePosterFrameBtn.style.background = 'rgba(16, 185, 129, 0.2)';
        togglePosterFrameBtn.style.border = '1px solid rgba(16, 185, 129, 0.5)';
        togglePosterFrameBtn.style.color = '#34d399';
        syncPostcardToVideo();
      } else {
        videoCardOverlay.style.display = 'none';
        togglePosterFrameBtn.textContent = 'ðŸ–¼ï¸ Apply Poster Frame';
        togglePosterFrameBtn.style.background = 'rgba(139, 92, 246, 0.2)';
        togglePosterFrameBtn.style.border = '1px solid rgba(139, 92, 246, 0.5)';
        togglePosterFrameBtn.style.color = '#c084fc';
        videoCardOverlay.innerHTML = '';
      }
    });
  }

  // Set up MutationObserver to sync whenever the newsCard is edited on the sidebar
  if (newsCard && videoCardOverlay) {
    const observer = new MutationObserver(() => {
      syncPostcardToVideo();
    });
    observer.observe(newsCard, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true
    });
  }
});














