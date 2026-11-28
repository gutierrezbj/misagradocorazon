# Web pública de misagradocorazon.com: nginx alpine con la web estática.
# Construir desde la raíz del repo: docker build -f apps/site/Dockerfile -t msc-site .
FROM node:22-alpine AS build
WORKDIR /site
COPY apps/site/package.json apps/site/build.mjs ./
COPY apps/site/public ./public
RUN node build.mjs

FROM nginx:1.27-alpine
COPY apps/site/deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /site/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
