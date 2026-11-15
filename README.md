# Khan G Restaurant: MERN website (Vercel + MongoDB Atlas)

Everything is stored in MongoDB Atlas: menu, categories, orders, messages, admin login and dish photos.
There is no sample data. Your menu starts empty and you add dishes from the admin panel.

## Deploy

### 1. MongoDB Atlas
- Create a database user (Database Access).
- Network Access: add `0.0.0.0/0` (Vercel uses changing IP addresses).
- Copy the connection string and put your database name in it, e.g. `.../khang?retryWrites=true&w=majority`.

### 2. Create the admin login (once, from your computer)
```
npm install   # at the project root
cd backend
cp .env.example .env     # fill MONGO_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
cd ..; npm run seed             # creates the admin login only. No dishes are added.
```

### 3. Push to GitHub
Push the whole `khan-g-restaurant` folder to one GitHub repository. `.env` is git-ignored.

### 4. Deploy ONE project on Vercel (website + API together)
- New Project, import the repo. Leave **Root Directory** empty (the repo root) and Framework Preset on **Other**.
- Environment Variables: `MONGO_URI`, `JWT_SECRET`. Do NOT set `VITE_API_URL`.
- Deploy. Check `https://YOUR-SITE.vercel.app/api/health` shows `{"ok":true}`, then open the site.

### 6. Add your menu
Open `https://YOUR-FRONTEND.vercel.app/admin/login`, sign in, go to Categories and add your categories, then Menu to add dishes with photos and Half/Full (or any size) prices. Change your email and password any time under Account.

## Local development
```
npm run dev:api     # http://localhost:5000
npm run dev:web     # http://localhost:5173
```

## 3D banner video
Save your video as `frontend/public/hero.mp4` (plays as the visitor scrolls). Export for smooth scrubbing:
```
ffmpeg -i dish.mp4 -an -vf "scale=1280:-2" -c:v libx264 -g 1 -crf 23 -movflags +faststart hero.mp4
```
Until it exists, a built-in 3D plate animation is shown.

## Client details
Phone, WhatsApp, address and hours: `frontend/src/config.js`.


## Installable apps and order alerts

The website is a PWA, so customers can install it (footer, phone menu and a banner offer "Install the app").
The admin panel at `/admin` is a **separate installable app** called "Khan G Admin" (Account page or the sidebar button).

**Order alerts (admin phone/laptop)**
1. Add these environment variables in Vercel (Settings, Environment Variables) and redeploy:
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (make a pair with `npx web-push generate-vapid-keys`), optional `DELIVERY_CHARGE` (default 100).
2. On each admin phone/laptop: open `/admin`, log in, go to Account, tap **Turn on alerts**, allow notifications, then tap **Send test alert**.
3. iPhone: first Share, Add to Home Screen, then open the admin app from the Home Screen and turn on alerts (iOS 16.4 or newer).

Every new order sends a notification (with the phone's notification sound) to every device that turned alerts on, even when the app is closed.
When the admin app is open it also rings a louder alarm and shows a pop-up until you tap it.
