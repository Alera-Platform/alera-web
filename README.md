# Alera — Web Paneli

> Mobil Güvenlik ve Davranış Analizi Platformu — Web izleme arayüzü
> Bursa Teknik Üniversitesi — Bilgisayar Mühendisliği

Backend'in (ayrı repo) sunduğu REST API ve Socket.IO akışını görselleştiren gerçek zamanlı kontrol paneli.

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Build | Vite |
| Dil | TypeScript (strict) |
| UI | React 18 |
| Routing | React Router v6 |
| HTTP | Axios (token interceptor) |
| Real-time | socket.io-client |
| Grafik | Recharts |
| Harita | React-Leaflet (OpenStreetMap) |
| Stil | CSS Modules + CSS değişkenleri |

## Gereksinimler

- Node.js ≥ 20
- Çalışan backend (`http://localhost:3000`)

## Hızlı Başlangıç

```bash
npm install
npm run dev
```

Panel: `http://localhost:5173`

> **Önemli:** Backend'in `http://localhost:3000`'de çalışıyor olması gerekir. Vite dev server `/api` ve `/socket.io` isteklerini otomatik olarak backend'e proxy'ler (CORS sorunu yaşanmaz).

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme sunucusu (HMR) |
| `npm run build` | Production build (`dist/`) |
| `npm run preview` | Build çıktısını önizle |
| `npm run typecheck` | Sadece tip kontrolü |

## Klasör Yapısı

```
web/
├── src/
│   ├── api/         # axios client + endpoint fonksiyonları
│   ├── auth/        # AuthContext, ProtectedRoute
│   ├── socket/      # SocketContext (canlı bağlantı)
│   ├── components/  # Layout, Badges (paylaşılan UI)
│   ├── pages/       # Login, Dashboard, Devices, Alarms, DeviceDetail
│   ├── types/       # backend ile uyumlu tipler
│   ├── styles/      # global.css (tema)
│   ├── App.tsx      # routing
│   └── main.tsx
└── ...
```

## Tasarım

**Tema:** Control-room / mission-control estetiği. Koyu zemin, alarmları öne çıkaran renk kodlaması.
**Tipografi:** Chakra Petch (display) + Archivo (body).
**Renk kodları:**
- Teal `#22d3a8` — sistem aktif / sağlıklı
- Amber `#f5a623` — uyarı
- Kırmızı `#ff4757` — kritik

## Sayfalar

| Rota | Açıklama |
|------|----------|
| `/login` | Giriş / kayıt |
| `/` | Genel Bakış — canlı grafik + alarm akışı + istatistikler |
| `/devices` | Cihaz yönetimi (ekle, durum değiştir, sil) |
| `/devices/:id` | Cihaz detayı — geçmiş grafik + harita |
| `/alarms` | Alarm listesi — filtre + durum güncelleme |

## Gerçek Zamanlı Akış

- **SocketContext** uygulama açılışında JWT ile Socket.IO'ya bağlanır
- Dashboard `sensor:reading` event'lerini dinleyip grafiği canlı besler
- `alarm:new` event'i geldiğinde alarm akışına anında düşer (flash animasyonu)
- Cihaz detay sayfası `device:subscribe` ile o cihazın room'una abone olur

## Kimlik Doğrulama

- Token `localStorage`'da saklanır (`sentinel_token`)
- Axios interceptor her isteğe `Authorization: Bearer` ekler
- 401 yanıtında token temizlenir, `/login`'e yönlendirilir
- `ProtectedRoute` giriş yapmamış kullanıcıyı engeller

## Test Akışı

1. Backend'i başlat (`npm run dev` — backend reposunda)
2. Bu paneli başlat (`npm run dev`)
3. `/login`'den kayıt ol
4. `/devices`'tan cihaz ekle
5. Postman ile sensör verisi gönder (backend README'sine bak)
6. Dashboard'da **canlı grafik** ve **alarm akışını** izle

## Notlar

- Production build'de bundle ~830 KB (Leaflet + Recharts dahil). Faz 7'de `manualChunks` veya lazy-loading ile optimize edilebilir.
- Leaflet harita karoları OpenStreetMap'ten gelir (ücretsiz, API anahtarı gerekmez).

## Lisans

MIT
