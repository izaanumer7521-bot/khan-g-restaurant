# Khan G Restaurant: MERN website (Vercel + MongoDB Atlas)

Everything is stored in MongoDB Atlas: menu, orders, table requests, messages, admin login and dish photos.
There is no sample data. Your menu starts empty and you add dishes from the admin panel.

## Deploy

### 1. MongoDB Atlas
- Create a database user (Database Access).
- Network Access: add `0.0.0.0/0` (Vercel uses changing IP addresses).
- Copy the connection string and put your database name in it, e.g. `.../khang?retryWrites=true&w=majority`.

### 2. Create the admin login (once, from your computer)
```
cd backend
npm install
cp .env.example .env     # fill MONGO_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run seed             # creates the admin login only. No dishes are added.
```

### 3. Push to GitHub
Push the whole `khan-g-restaurant` folder to one GitHub repository. `.env` is git-ignored.

### 4. Deploy the backend on Vercel
- New Project, import the repo, set **Root Directory** to `backend`.
- Environment Variables: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (add after step 5, then redeploy).
- Deploy. Open `https://YOUR-BACKEND.vercel.app/api/health`, it should show `{"ok":true}`.

### 5. Deploy the frontend on Vercel
- New Project, same repo, **Root Directory** `frontend` (Vite is detected automatically).
- Environment Variable: `VITE_API_URL` = your backend URL, no trailing slash.
- Deploy. Then go back to the backend project, set `CLIENT_URL` to this frontend URL and redeploy it.

### 6. Add your menu
Open `https://YOUR-FRONTEND.vercel.app/admin/login`, sign in, go to Menu, and add dishes with photos.

## Local development
```
cd backend && npm run dev        # http://localhost:5000
cd frontend && npm install && npm run dev   # http://localhost:5173
```

## 3D banner video
Save your video as `frontend/public/hero.mp4` (plays as the visitor scrolls). Export for smooth scrubbing:
```
ffmpeg -i dish.mp4 -an -vf "scale=1280:-2" -c:v libx264 -g 1 -crf 23 -movflags +faststart hero.mp4
```
Until it exists, a built-in 3D plate animation is shown.

## Client details
Phone, WhatsApp, address and hours: `frontend/src/config.js`.
