FROM node:18-alpine

EXPOSE 3000

WORKDIR /app
COPY . .

# # 以下是官方给的构建案例指令案例
# ENV NODE_ENV=production
# RUN npm install --omit=dev

# # Remove CLI packages since we don't need them in production by default.
# # Remove this line if you want to run CLI commands in your container.
# RUN npm remove @shopify/app @shopify/cli
# RUN npm run build

# # You'll probably want to remove this in production, it's here to make it easier to test things!
# RUN rm -f prisma/dev.sqlite

# 修改为 pnpm
RUN npm install -g pnpm
RUN pnpm install
RUN pnpm run build

CMD ["npm", "run", "docker-start"]
