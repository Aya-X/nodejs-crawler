FROM node:18

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libnss3 \
    libx11-xcb1 \
    libx11-dev \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxrender1 \
    libxtst6 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libgdk-pixbuf2.0-0 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0 \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libwebp-dev \
    libv4l-dev \
    libssl-dev \
    libgbm-dev \
    libxkbcommon0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 安裝 pnpm
RUN npm install -g pnpm

WORKDIR /usr/src/app

# 複製 pnpm-lock.yaml（如果存在）和 package.json
COPY pnpm-lock.yaml package.json ./

RUN pnpm install --frozen-lockfile

# 安裝 Puppeteer
RUN pnpm add puppeteer

# 安裝 Chrome
RUN apt-get update && apt-get install -y chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium

COPY . .

RUN pnpm build

EXPOSE 8080

CMD [ "pnpm", "start" ]
