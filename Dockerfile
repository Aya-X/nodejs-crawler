FROM node:18

RUN npm install -g pnpm

WORKDIR /usr/src/app

# 複製 pnpm-lock.yaml（如果存在）和 package.json
COPY pnpm-lock.yaml package.json ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

CMD [ "pnpm", "start" ]