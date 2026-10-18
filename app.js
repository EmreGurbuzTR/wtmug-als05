/* ============================================================
   KONFIG
   ============================================================ */
const CONFIG = {
  autoScanInterval: 3000,
  minTextLength: 2,
  minFrancLength: 15,
  maxTranslateChars: 480,
  langMap: {
    eng:'en', deu:'de', fra:'fr', spa:'es', ita:'it',
    rus:'ru', ara:'ar', chi_sim:'zh', jpn:'ja', kor:'ko',
    nld:'nl', pol:'pl', por:'pt', tur:'tr',
    ces:'cs', dan:'da', ell:'el', fin:'fi', heb:'he',
    hun:'hu', ind:'id', nor:'no', ron:'ro', swe:'sv',
    tha:'th', ukr:'uk', vie:'vi'
  }
};

const LANG_NAMES = {
  eng:'İngilizce', deu:'Almanca', fra:'Fransızca', spa:'İspanyolca',
  ita:'İtalyanca', rus:'Rusça', ara:'Arapça', chi_sim:'Çince (Basit)',
  jpn:'Japonca', kor:'Korece', nld:'Felemenkçe', pol:'Lehçe',
  por:'Portekizce', tur:'Türkçe', ces:'Çekçe', dan:'Danca',
  ell:'Yunanca', fin:'Fince', heb:'İbranice', hun:'Macarca',
  ind:'Endonezce', nor:'Norveççe', ron:'Romence', swe:'İsveççe',
  tha:'Tayca', ukr:'Ukraynaca', vie:'Vietnamca'
};

const FRANC_TO_TESSERACT = {
  eng:'eng', deu:'deu', fra:'fra', spa:'spa', ita:'ita',
  rus:'rus', ara:'ara', cmn:'chi_sim', jpn:'jpn', kor:'kor',
  nld:'nld', pol:'pol', por:'por', tur:'tur',
  ces:'ces', dan:'dan', ell:'ell', fin:'fin', heb:'heb',
  hun:'hun', ind:'ind', nor:'nor', ron:'ron', swe:'swe',
  tha:'tha', ukr:'ukr', vie:'vie'
};

function langName(code){
  return LANG_NAMES[code] || code.toUpperCase();
}

/* ============================================================
   STATE
   ============================================================ */
const state = {
  mode: 'camera',
  cameraActive: false,
  stream: null,
  busy: false,
  autoScanTimer: null,
  lastOCRText: '',
  lastTranslation: '',
  lastDetectedLang: null,
  translator: null,
  translatorPair: null
};

/* ============================================================
   DOM
   ============================================================ */
const $ = s => document.querySelector(s);
const els = {
  modeToggle:    $('#modeToggle'),
  srcLang:       $('#srcLang'),
  tgtLang:       $('#tgtLang'),
  autoTranslate: $('#autoTranslate'),
  autoScan:      $('#autoScan'),
  detectedLangBadge: $('#detectedLangBadge'),
  detectedLangText:  $('#detectedLangText'),
  panelCamera:   $('#panelCamera'),
  panelImage:    $('#panelImage'),
  panelManual:   $('#panelManual'),
  cameraWrap:    $('#cameraWrap'),
  video:         $('#video'),
  cameraMsg:     $('#cameraMessage'),
  btnStart:      $('#btnStartCamera'),
  btnStop:       $('#btnStopCamera'),
  btnCapture:    $('#btnCapture'),
  imageInput:    $('#imageInput'),
  btnPickImage:  $('#btnPickImage'),
  imagePreviewWrap: $('#imagePreviewWrap'),
  imagePreview:  $('#imagePreview'),
  btnProcessImage: $('#btnProcessImage'),
  manualText:    $('#manualText'),
  btnManualTranslate: $('#btnManualTranslate'),
  btnManualClear: $('#btnManualClear'),
  statusMsg:     $('#statusMsg'),
  progressBar:   $('#progressBar'),
  originalText:  $('#originalText'),
  translatedText:$('#translatedText'),
  engineLabel:   $('#engineLabel'),
  btnCopy:       $('#btnCopy'),
  btnShare:      $('#btnShare'),
  log:           $('#log'),
  toast:         $('#toast')
};

/* ============================================================
   YARDIMCILAR
   ============================================================ */
function log(m){
  const t = new Date().toLocaleTimeString('tr-TR');
  els.log.textContent = `[${t}] ${m}\n` + els.log.textContent;
}
function status(m, kind=''){
  els.statusMsg.textContent = m;
  els.statusMsg.className = 'status ' + kind;
}
function progress(p){
  els.progressBar.style.width = Math.max(0, Math.min(100, p*100)) + '%';
}
function toast(msg, kind='', duration=2500){
  els.toast.textContent = msg;
  els.toast.className = 'toast show ' + kind;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.remove('show'), duration);
}
function setText(el, txt, empty){
  if (txt && txt.trim()){
    el.textContent = txt;
  } else {
    el.innerHTML = `<span class="result-empty">${empty}</span>`;
  }
}
function showDetectedLang(code){
  if (!code) {
    els.detectedLangBadge.style.display = 'none';
    return;
  }
  els.detectedLangBadge.style.display = 'inline-flex';
  els.detectedLangBadge.classList.add('ok');
  els.detectedLangText.textContent = langName(code);
}

/* ============================================================
   MOD DEĞİŞTİRME
   ============================================================ */
function setMode(mode){
  state.mode = mode;
  els.modeToggle.querySelectorAll('button').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  els.panelCamera.classList.toggle('hidden', mode !== 'camera');
  els.panelImage.classList.toggle('hidden', mode !== 'image');
  els.panelManual.classList.toggle('hidden', mode !== 'manual');
  if (mode !== 'camera' && state.cameraActive) stopCamera();
}

/* ============================================================
   KAMERA
   ============================================================ */
async function startCamera(){
  if (state.cameraActive) return;
  try{
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    state.stream = stream;
    els.video.srcObject = stream;
    await els.video.play();

    state.cameraActive = true;
    els.btnStart.disabled = true;
    els.btnStop.disabled = false;
    els.btnCapture.disabled = false;
    els.cameraMsg.classList.add('hidden');
    status('Kamera hazır. Yazıyı çerçeveye al ve "Yakala"ya bas.', 'ok');

    if (els.autoScan.checked) startAutoScan();
  }catch(err){
    console.error(err);
    els.cameraMsg.textContent = '? Kamera açılamadı: ' + err.message;
    els.cameraMsg.classList.remove('hidden');
    status('Kamera hatası: ' + err.name, 'err');
  }
}

function stopCamera(){
  if (state.autoScanTimer){ clearInterval(state.autoScanTimer); state.autoScanTimer = null; }
  if (state.stream){ state.stream.getTracks().forEach(t => t.stop()); state.stream = null; }
  els.video.srcObject = null;
  state.cameraActive = false;
  els.btnStart.disabled = false;
  els.btnStop.disabled = true;
  els.btnCapture.disabled = true;
  els.cameraMsg.textContent = 'Kamera durduruldu';
  els.cameraMsg.classList.remove('hidden');
}

function startAutoScan(){
  if (state.autoScanTimer) clearInterval(state.autoScanTimer);
  state.autoScanTimer = setInterval(() => {
    if (!state.busy && state.cameraActive) captureAndProcess(true);
  }, CONFIG.autoScanInterval);
  log('Otomatik tarama başladı (' + (CONFIG.autoScanInterval/1000) + ' sn)');
}

function stopAutoScan(){
  if (state.autoScanTimer){ clearInterval(state.autoScanTimer); state.autoScanTimer = null; }
  log('Otomatik tarama durdu');
}

/* ============================================================
   YAKALAMA
   ============================================================ */
function captureFrame(){
  const v = els.video;
  const canvas = document.createElement('canvas');
  const crop = document.querySelector('.crop-box').getBoundingClientRect();
  const wrap = els.cameraWrap.getBoundingClientRect();
  const sx = (crop.left - wrap.left) / wrap.width  * v.videoWidth;
  const sy = (crop.top  - wrap.top)  / wrap.height * v.videoHeight;
  const sw = (crop.width  / wrap.width)  * v.videoWidth;
  const sh = (crop.height / wrap.height) * v.videoHeight;

  canvas.width = Math.round(sw);
  canvas.height = Math.round(sh);
  canvas.getContext('2d').drawImage(v, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function captureAndProcess(auto = false){
  if (state.busy) return;
  const canvas = captureFrame();
  if (!auto){
    stopCamera();
    toast('?? Görüntü alındı, telefonunuzu serbestçe kullanabilirsiniz.', 'ok', 3500);
  }
  await runOCR(canvas);
}

async function processImageFile(file){
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d').drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  toast('?? Görüntü alındı, işleniyor…', 'ok', 1500);
  await runOCR(canvas);
}

/* ============================================================
   OTOMATİK DİL ALGILAMA + OCR (Tesseract Confidence Kullanımı)
   ============================================================ */
async function autoDetectAndOCR(canvas){
  // 1) Yazı sistemi (OSD)
  status('Yazı sistemi algılanıyor (OSD)…');
  let script = 'Latin';
  try{
    const osd = await Tesseract.detect(canvas);
    if (osd && osd.data && osd.data.script) script = osd.data.script;
    log('OSD: ' + script);
  }catch(e){ log('?? OSD atlandı: ' + e.message); }

  // 2) Latin değilse: script'e özel dil
  if (script !== 'Latin') {
    let lang = 'eng';
    if (script === 'Arabic') lang = 'ara';
    else if (script === 'Cyrillic') lang = 'rus';
    else if (script === 'Han') lang = 'chi_sim';
    else if (script === 'Japanese') lang = 'jpn';
    else if (script === 'Korean') lang = 'kor';
    
    status(`OCR (${lang})…`);
    const worker = await Tesseract.createWorker(lang);
    const r = await worker.recognize(canvas);
    await worker.terminate();
    return { lang, text: r.data.text || '' };
  }

  // 3) Latin alfabesi: Her aday dil için ayrı OCR yap ve Tesseract güven skorunu (confidence) kullan
  const CANDIDATE_LANGS = ['fra', 'deu', 'ita', 'spa', 'por', 'tur', 'eng'];
  let bestLang = 'eng';
  let bestText = '';
  let bestScore = -1;

  for (const lang of CANDIDATE_LANGS) {
    try {
      status(`Dil deneniyor: ${lang}…`);
      
      // Her dil için temiz bir worker oluştur. 
      // (reinitialize bazen eski dilin sözlüğünü bellekte tutup yanlış sonuç verebiliyor)
      const worker = await Tesseract.createWorker(lang);
      const { data } = await worker.recognize(canvas);
      await worker.terminate();

      const text = data.text || '';
      const confidence = data.confidence || 0; // Tesseract'ın kendi güven skoru (0-100)

      if (text.trim().length < 5) {
        log(`${lang}: metin çok kısa, atlandı`);
        continue;
      }

      // francAll ile dil skoru (0-1 arası) - destekleyici faktör
      let francScore = 0;
      const cleaned = text.replace(/[^a-zA-ZÀ-ÿA-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned.length >= CONFIG.minFrancLength) {
        try {
          const candidates = francAll(cleaned, { only: CANDIDATE_LANGS });
          const entry = candidates.find(c => c[0] === lang);
          if (entry) francScore = entry[1];
        } catch(e){ console.warn('francAll:', e); }
      }

      // Tesseract güveni ana faktör (%80), franc destekleyici (%20)
      // Çünkü Tesseract o dilin kendi karakter setini ve sözlüğünü kullanarak OCR yapıyor.
      const combinedScore = (confidence / 100) * 0.8 + francScore * 0.2;

      log(`${lang}: Tesseract = ${confidence.toFixed(1)}, franc = ${francScore.toFixed(2)} => Skor = ${combinedScore.toFixed(3)}`);

      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestLang = lang;
        bestText = text;
      }
    } catch(e) {
      console.warn(`OCR hatası (${lang}):`, e);
      log(`? ${lang} hatası: ${e.message}`);
    }
  }

  if (!bestText) {
    log('Hiçbir dilde metin bulunamadı, varsayılan: eng');
    const fallbackWorker = await Tesseract.createWorker('eng');
    const r = await fallbackWorker.recognize(canvas);
    await fallbackWorker.terminate();
    return { lang: 'eng', text: r.data.text || '' };
  }

  log(`?? En yüksek skor: ${bestLang} (${bestScore.toFixed(3)})`);
  return { lang: bestLang, text: bestText };
}

/* ============================================================
   OCR ANA AKIŞ
   ============================================================ */
async function runOCR(canvas){
  if (state.busy) return;
  state.busy = true;
  const btn = els.btnCapture;
  if (btn) btn.disabled = true;

  const selected = els.srcLang.value;
  let actualLang = selected;
  let text = '';

  try{
    if (selected === 'auto'){
      const result = await autoDetectAndOCR(canvas);
      actualLang = result.lang;
      text = result.text;
      state.lastDetectedLang = actualLang;
      showDetectedLang(actualLang);
      log('? Algılanan dil: ' + langName(actualLang) + ' (' + actualLang + ')');
    } else {
      showDetectedLang(null);
      const worker = await Tesseract.createWorker(selected);
      status('?? OCR çalışıyor…');
      const r = await worker.recognize(canvas);
      await worker.terminate();
      text = r.data.text || '';
      state.lastDetectedLang = null;
    }

    const cleaned = (text || '').trim();
    if (cleaned.length < CONFIG.minTextLength){
      status('Metin bulunamadı. Yazıyı çerçeveye daha net al.', 'err');
      state.busy = false;
      if (btn) btn.disabled = false;
      return;
    }

    state.lastOCRText = cleaned;
    setText(els.originalText, cleaned, 'Henüz bir şey okunmadı.');
    log('OCR (' + actualLang + '): ' + cleaned.slice(0, 80).replace(/\n/g, ' '));

    if (els.autoTranslate.checked){
      await translate(cleaned, actualLang);
    } else {
      status('OCR tamamlandı. Çevirmek için "Otomatik çevir"i işaretle.');
    }
  }catch(err){
    console.error(err);
    status('OCR hatası: ' + err.message, 'err');
    log('? OCR hatası: ' + err.message);
  }
  state.busy = false;
  if (btn) btn.disabled = false;
}

/* ============================================================
   ÇEVİRİ
   ============================================================ */
async function translate(text, tesseractLang){
  const src = CONFIG.langMap[tesseractLang] || 'en';
  const tgt = els.tgtLang.value;

  if (src === tgt){
    state.lastTranslation = text;
    setText(els.translatedText, text, '—');
    els.engineLabel.textContent = '(kaynak = hedef)';
    return;
  }

  const snippet = text.length > CONFIG.maxTranslateChars
    ? text.slice(0, CONFIG.maxTranslateChars)
    : text;

  // 1) Translator API
  if ('Translator' in self){
    try{
      if (!state.translator || state.translatorPair !== src + '|' + tgt){
        status('?? Tarayıcı çeviri modeli hazırlanıyor…');
        log('Translator API: ' + src + ' › ' + tgt);
        state.translator = await Translator.create({
          sourceLanguage: src,
          targetLanguage: tgt,
          monitor(m){
            m.addEventListener('downloadprogress', e => {
              progress(e.loaded || 0);
              status('Çeviri modeli indiriliyor: ' + Math.round((e.loaded||0)*100) + '%');
            });
          }
        });
        state.translatorPair = src + '|' + tgt;
        progress(0);
      }
      const result = await state.translator.translate(snippet);
      state.lastTranslation = result;
      setText(els.translatedText, result, '—');
      els.engineLabel.textContent = '(Translator API)';
      status('? Çevrildi (tarayıcı içi model)', 'ok');
      log('Çeviri (Translator API): ' + result.slice(0, 80));
      return;
    }catch(err){
      console.warn('Translator API başarısız:', err);
      log('?? Translator API: ' + err.message + ' › MyMemory');
      state.translator = null;
      state.translatorPair = null;
    }
  }

  // 2) MyMemory fallback
  try{
    status('?? MyMemory ile çevriliyor…');
    const url = 'https://api.mymemory.translated.net/get'
      + '?q=' + encodeURIComponent(snippet)
      + '&langpair=' + encodeURIComponent(src + '|' + tgt);
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const result = data?.responseData?.translatedText;
    if (!result) throw new Error('Boş yanıt');
    state.lastTranslation = result;
    setText(els.translatedText, result, '—');
    els.engineLabel.textContent = '(MyMemory)';
    status('? Çevrildi (MyMemory)', 'ok');
    log('Çeviri (MyMemory): ' + result.slice(0, 80));
  }catch(err){
    console.error(err);
    status('Çeviri hatası: ' + err.message, 'err');
    log('? Çeviri hatası: ' + err.message);
    setText(els.translatedText, 'Çeviri yapılamadı. İnternet bağlantını kontrol et.', '—');
  }
}

/* ============================================================
   OLAYLAR
   ============================================================ */
function bind(){
  els.modeToggle.addEventListener('click', e => {
    const b = e.target.closest('button[data-mode]');
    if (b) setMode(b.dataset.mode);
  });

  els.srcLang.addEventListener('change', () => {
    if (els.srcLang.value !== 'auto') showDetectedLang(null);
  });

  els.tgtLang.addEventListener('change', () => {
    state.translator = null;
    state.translatorPair = null;
  });

  els.btnStart.addEventListener('click', startCamera);
  els.btnStop.addEventListener('click', stopCamera);
  els.btnCapture.addEventListener('click', () => captureAndProcess(false));

  els.autoScan.addEventListener('change', () => {
    if (els.autoScan.checked && state.cameraActive) startAutoScan();
    else stopAutoScan();
  });

  els.btnPickImage.addEventListener('click', () => els.imageInput.click());
  els.imageInput.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    els.imagePreview.src = URL.createObjectURL(f);
    els.imagePreviewWrap.style.display = 'block';
  });
  els.btnProcessImage.addEventListener('click', () => {
    const f = els.imageInput.files[0];
    if (f) processImageFile(f);
  });

  els.btnManualTranslate.addEventListener('click', () => {
    const t = els.manualText.value.trim();
    if (!t){ toast('Metin gir', 'err'); return; }
    setText(els.originalText, t, '—');
    const lang = els.srcLang.value === 'auto' ? 'eng' : els.srcLang.value;
    if (els.srcLang.value === 'auto') showDetectedLang(null);
    translate(t, lang);
  });
  els.btnManualClear.addEventListener('click', () => { els.manualText.value = ''; });

  els.btnCopy.addEventListener('click', async () => {
    const txt = state.lastTranslation || state.lastOCRText;
    if (!txt){ toast('Kopyalanacak bir şey yok', 'err'); return; }
    try{ await navigator.clipboard.writeText(txt); toast('Kopyalandı', 'ok'); }
    catch(e){ toast('Kopyalanamadı', 'err'); }
  });

  els.btnShare.addEventListener('click', async () => {
    const txt = state.lastTranslation || state.lastOCRText;
    if (!txt){ toast('Paylaşılacak bir şey yok', 'err'); return; }
    if (!navigator.share){ toast('Paylaşım desteklenmiyor', 'err'); return; }
    try{ await navigator.share({ text: txt, title: 'Çeviri' }); }catch(e){}
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.cameraActive) stopCamera();
  });
}

/* ============================================================
   INIT
   ============================================================ */
function init(){
  bind();
  setMode('camera');
  log('Uygulama hazır. Cihaz: ' + navigator.userAgent.slice(0, 80));

  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW:', e));
  }

  if ('Translator' in self){
    log('? Tarayıcı Translator API destekliyor');
    els.engineLabel.textContent = '(hazır)';
  } else {
    log('?? Translator API yok, MyMemory kullanılacak');
    els.engineLabel.textContent = '(MyMemory)';
  }

  if (typeof francAll !== 'function'){
    log('?? francAll yüklenemedi — otomatik dil algılama sadece OSD ile çalışacak');
  }
}
init();