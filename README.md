# 🌐 Kamera Çevirmeni PWA

Kamera veya galeriden alınan bir görseldeki yabancı metni **OCR** ile okuyup
Türkçeye **çeviren** PWA. Tamamen cihaz üzerinde OCR + tarayıcı yerleşik
çeviri modeli kullanır.

## Özellikler
- 📷 **Kamera modu:** Canlı görüntüden yakalama
- 🖼️ **Görsel yükleme modu:** Galeriden seçme
- ⌨️ **Elle giriş modu:** Test için ideal
- 🌍 14 OCR dili, 10 hedef dil
- 🔍 **Tesseract.js** ile cihaz üzerinde OCR (offline)
- 🌐 **Translator API** (Chrome 138+) veya **MyMemory** fallback
- 🔁 **Otomatik tarama** (3 saniyede bir) — artırılmış gerçeklik hissi
- 📋 Kopyala / 📤 Paylaş
- 📴 Service Worker ile offline app shell

## Kullanılan Teknolojiler
| Teknoloji | Rolü |
|---|---|
| `getUserMedia` | Kamera erişimi |
| **Tesseract.js (WASM)** | Cihaz üzerinde OCR |
| **Translator API** (deneysel) | Cihaz üzerinde çeviri |
| **MyMemory** (fallback) | Ücretsiz çeviri servisi (API key gerekmez) |
| Service Worker | App shell önbelleği + Tesseract CDN önbelleği |
| IndexedDB | (isteğe bağlı) geçmiş kayıtları |

## GitHub Pages'e Yayınlama
1. Repo oluştur: `kamera-cevirmeni-pwa`
2. Dosyaları yükle
3. **Settings → Pages → Source: main / root → Save**
4. Adres: `https://KULLANICI.github.io/kamera-cevirmeni-pwa/`
5. Telefonda aç, "Ana ekrana ekle" ile PWA olarak kur

> ⚠️ Kamera için HTTPS zorunlu. GitHub Pages otomatik sağlar.

## Test Senaryoları
- 📷 Bir İngilizce kitap kapağını kameraya tut → Türkçe çevirisini gör
- 🖼️ Galeriden bir yabancı menü fotoğrafı seç → menüyü Türkçeye çevir
- ⌨️ "Hello world" yaz → "Merhaba dünya" sonucunu doğrula
- 📴 Uçak moduna al → OCR yine çalışır (dil modeli önceden indirildiyse)
- 🌍 Kaynak dili "deu" yapıp Almanca bir metin dene
- 📊 İlk OCR'da dil modeli indirilecek (5–15 MB), sonrası hızlı

## Sınırlamalar
- Translator API yalnızca Chrome 138+ / Edge'de var
- MyMemory anonim kullanımda ~5000 kelime/gün ile sınırlı
- Tesseract el yazısında zayıf, düz baskı metinde iyi
- Otomatik tarama pili hızlı tüketir
- iOS Safari'de Translator API yok → MyMemory fallback çalışır

## Ders İçin Tartışma Soruları
1. OCR neden cihaz üzerinde, çeviri neden sunucuda çalışıyor olabilir?
2. "Anlık çeviri" (30 fps) neden pratikte mümkün değil?
3. Tesseract dil modelini ilk indirme sonrası offline çalışması hangi PWA özelliğiyle sağlanıyor?
4. MyMemory'nin 5000 kelime/gün limiti aşılırsa ne yapılabilir? (İpucu: Kendi backend proxy)