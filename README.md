# Testing System

## Run locally

1. Install dependencies:
```bash
npm install
```

2. Start the app:
```bash
npm run start
```

3. Open the app:
```text
http://127.0.0.1:3000/index.html
```

## Deployment

### Deploy with Docker

Build the image:
```bash
docker build -t testing-system .
```

Run it:
```bash
docker run -p 3000:3000 testing-system
```

### Deploy to platforms

This repo includes a `Procfile` so it can deploy on Heroku and similar platforms.

### Notes for deployment

- The app uses Selenium and Chrome, so it is best deployed in a container with Chrome installed.
- The `Dockerfile` installs `google-chrome-stable` and sets `CHROME_BIN`.
- If you deploy on a platform that supports Docker (Render, Railway, Fly.io, etc.), use the Docker container.
