FROM node:20-slim

# Install Chrome dependencies and Chrome
RUN apt-get update && apt-get install -y wget gnupg ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libgtk-3-0 libxss1 xdg-utils
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
RUN apt-get update && apt-get install -y google-chrome-stable && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production
COPY . .

ENV CHROME_BIN=/usr/bin/google-chrome-stable
ENV PATH=/usr/src/app/node_modules/.bin:$PATH
EXPOSE 3000
CMD ["npm", "start"]
