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

The website is a PWA, so customers can install it. The admin panel at `/admin` is a **separate installable app** called "Khan G Admin" (`frontend/public/admin.webmanifest`, scope `/admin/`).

### Order alerts (v17: rebuilt from scratch)
One switch: **Order alerts on this device** (bottom of the admin sidebar, and Account > Notifications).

1. Make free push keys once: `npm run vapid`
2. In Vercel > Settings > Environment Variables add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (e.g. `mailto:you@gmail.com`), then **Redeploy**.
3. On every admin phone: open `/admin`, log in, install the app (Account > App), open it, switch **Order alerts on this device** on and allow notifications.
4. iPhone: Share > Add to Home Screen first, open from the Home Screen, then switch it on (iOS 16.4+).

How it works: `web-push` (free) sends to each saved device (MongoDB collection `adminsubscriptions`, one document per endpoint, upserted). `sw.js` shows the notification (stays until tapped, vibrates, phone sound) even when the app is closed. Devices that report 404/410 are deleted automatically. The switch reads the real state from the browser and server, and the app quietly re-registers the device whenever it is opened, so clearing the cache does not disconnect it.

**v18 admin on phones:** bottom tab bar (Home, Orders, Menu, More), orders shown as tickets with one big button for the next step (Accept order, Send out for delivery, Mark delivered), call/WhatsApp/map buttons, and a red badge on Orders for orders waiting. Public order and message forms are rate limited.

Old v10-v16 collections (`pushsubs`, `pushlogs`) are no longer used; you can drop them in Atlas.

## v9 additions

**Customer profile** (`/profile`): live order tracking (updates every 15 s), past order history, and editable name/address. Customers sign in with name + phone as before; each device now gets its own session.

**Payment at checkout**: Cash on delivery (cash at pickup for pickup orders) or **Advance**: the customer pays the rider online (Easypaisa, JazzCash or bank transfer) when the order arrives. Edit the types, descriptions and optional rider account numbers in `frontend/src/config.js` (`PAY_TYPES`). If you add or remove a type, update `PAY_TYPES` in `backend/routes/orders.js` too. Orders show the payment method in the admin Orders page and in the push alert.

**Admin redesign**: dashboard layout with KPI cards, charts and rankings; phones get a hamburger menu and 2-up cards. Same black and red theme, same pages and functions.

**Admin > Devices**: every signed-in customer and admin device. "Log out device" deletes that session and the device is signed out automatically (within about 30 seconds, or on its next action). Customers can be **blocked** (logged out everywhere, cannot sign in or order) and **unblocked** from Customers or Devices.

After deploying v9, the admin signs in once more and customers sign in once more (old logins have no device session).
