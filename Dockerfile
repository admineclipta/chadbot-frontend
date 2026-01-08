FROM nginx:alpine

# Cloud Run usa PORT=8080 por defecto; hacemos que nginx escuche 8080
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Solo publicamos dist/
COPY dist/ /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]