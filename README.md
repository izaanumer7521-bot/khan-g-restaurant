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


### Alerts not arriving when the app is closed?
Open the admin app, go to Account, and read the **Order alerts** checklist. Every line must be green. The first red line tells you the fix:
- *Server push keys MISSING*: add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in Vercel, then redeploy.
- *Registered on server NO* or *last alert failed*: press **Fix this device**, then **Send test alert**.
- Android: set Chrome (and Khan G Admin) battery to Unrestricted.

### Extra backup alert: Telegram (recommended)
Telegram rings on any phone even when the admin app is closed or the phone was off (the message waits until it is back online).
1. In Telegram, open **@BotFather**, send `/newbot`, follow the steps, and copy the **token**.
2. Open your new bot and send it any message (for example "hi").
3. In a browser open `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` and copy the number after `"chat":{"id":`.
4. In Vercel add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, then redeploy.
Every new order then sends a full message (customer, phone, address, items, total). To alert more people, add the bot to a Telegram group and use the group's chat id.


## v9 additions

**Customer profile** (`/profile`): live order tracking (updates every 15 s), past order history, and editable name/address. Customers sign in with name + phone as before; each device now gets its own session.

**Payment at checkout**: Cash on delivery (cash at pickup for pickup orders) or **Advance**: the customer pays the rider online (Easypaisa, JazzCash or bank transfer) when the order arrives. Edit the types, descriptions and optional rider account numbers in `frontend/src/config.js` (`PAY_TYPES`). If you add or remove a type, update `PAY_TYPES` in `backend/routes/orders.js` too. Orders show the payment method in the admin Orders page and in the Telegram alert.

**Admin redesign**: dashboard layout with KPI cards, charts and rankings; phones get a hamburger menu and 2-up cards. Same black and red theme, same pages and functions.

**Admin > Devices**: every signed-in customer and admin device. "Log out device" deletes that session and the device is signed out automatically (within about 30 seconds, or on its next action). Customers can be **blocked** (logged out everywhere, cannot sign in or order) and **unblocked** from Customers or Devices.

After deploying v9, the admin signs in once more and customers sign in once more (old logins have no device session).


## v10: order notifications on every admin device

- **No setup needed.** The server creates its own push keys the first time and stores them in MongoDB. `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` are now optional. If you already set them and they are valid, they are still used.
- **Add as many phones and computers as you like.** On each one open `/admin`, go to **Account > Notifications** and press **Turn on alerts**. Every device gets every new order, with the phone's notification sound, even when the app is closed.
- **Self-repairing.** If the browser replaces a phone's registration, the service worker re-registers it in the background. Opening the admin app also re-registers the device.
- **Per-device control.** Account > Notifications lists each device with its last delivery, a Test button and Remove. Logging a device out in Admin > Devices also stops its alerts.
- Admin logins now stay signed in for 90 days of use (the timer restarts every time the device is used), so the restaurant phone keeps receiving alerts.
- After deploying, open the admin app once on each phone and press **Turn on alerts** (or **Repair** if the card says so).
