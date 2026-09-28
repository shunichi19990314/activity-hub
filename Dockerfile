# Activity Hub — Railway / コンテナ用イメージ
# ビルド:  docker build -t activity-hub .
# 実行:    docker run --rm -p 3000:3000 -e PORT=3000 activity-hub
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# 必要なファイルだけコピー(.env は意図的に含めない — シークレットは Railway の Variables で設定)
COPY package.json server.js ./
COPY config.json ./
COPY public ./public

# Railway は PORT を自動注入する。
# 設定を永続化するには Volume を /data にマウントし DATA_DIR=/data を設定する。
CMD ["node", "server.js"]
