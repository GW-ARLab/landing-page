FROM node:22-bookworm-slim
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Ensure config directories and fallback files exist
RUN mkdir -p .figma/make cms-data
RUN if [ ! -f .figma/make/site.json ]; then echo '{"title":"Applied Robotics Lab","language":"vi"}' > .figma/make/site.json; fi
RUN if [ ! -f cms-data/ARL_Role_Email_Map.local.json ]; then echo '{"admin":["danhphan141204@gmail.com","vnh2222@gmail.com"],"editor":[],"publisher":[],"inquiries":[]}' > cms-data/ARL_Role_Email_Map.local.json; fi

# Build client and SSR packages
RUN pnpm run build

EXPOSE 8787

ENV ARL_HOST=0.0.0.0
ENV ARL_PORT=8787

CMD ["node", "cms/server.mjs"]
