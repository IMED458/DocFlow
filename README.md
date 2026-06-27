# DocFlow Georgia

ელექტრონული დოკუმენტბრუნვის სისტემა ქართული ორგანიზაციისთვის. აპი მოიცავს დოკუმენტების რეგისტრაციას, ვიზირებას, ხელმოწერას, რეზოლუციებს, დავალებებს და ადმინისტრირების პანელს.

## Run Locally

Prerequisites: Node.js 20+

```bash
npm install
npm run dev
```

Development server runs on:

```text
http://localhost:3000
```

## Production Build

```bash
npm run build
npm start
```

## Firebase (Cloud Firestore)

განთავსებული (GitHub Pages / production build) აპლიკაცია **ყველა მონაცემს ინახავს
Cloud Firestore-ში** (პროექტი `docflow-36240`). ლოკალური `npm run dev` კვლავ იყენებს
Express + `db.json`-ს; Firebase-ის ლოკალურად ჩასართავად გაუშვით `VITE_STATIC_API=true`.

### საჭირო კონფიგურაცია (ერთჯერადი)

1. Firebase Console → Firestore Database → **Create database** (თუ ჯერ არ შექმნილა).
2. **Rules** ჩანართში ჩასვით [`firestore.rules`](firestore.rules)-ის შიგთავსი და გამოაქვეყნეთ (Publish).
   ⚠️ წესები ღიაა, რადგან აპი იყენებს საკუთარ username/password ავტორიზაციას (არა Firebase Auth).
3. პირველი გახსნისას აპლიკაცია ავტომატურად ჩათესავს საწყის მონაცემებს (`db.json`) Firestore-ში.

საწყისი ანგარიშები: `admin / admin123` (ადმინისტრატორი), `register|manager|signer|executor|visa` (პაროლი = სახელი + `123`).
