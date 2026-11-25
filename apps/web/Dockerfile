FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api
ARG NEXT_PUBLIC_ENTRA_CLIENT_ID=
ARG NEXT_PUBLIC_ENTRA_TENANT_ID=
ARG NEXT_PUBLIC_ENTRA_API_SCOPE=
ARG NEXT_PUBLIC_ENTRA_REDIRECT_URI=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ENTRA_CLIENT_ID=$NEXT_PUBLIC_ENTRA_CLIENT_ID
ENV NEXT_PUBLIC_ENTRA_TENANT_ID=$NEXT_PUBLIC_ENTRA_TENANT_ID
ENV NEXT_PUBLIC_ENTRA_API_SCOPE=$NEXT_PUBLIC_ENTRA_API_SCOPE
ENV NEXT_PUBLIC_ENTRA_REDIRECT_URI=$NEXT_PUBLIC_ENTRA_REDIRECT_URI
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts
EXPOSE 3001
CMD ["npm","start"]
