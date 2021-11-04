FROM nginx:mainline
RUN groupadd --system --gid 10001 app && \
  useradd --system -g app --uid 10001 app
COPY ./configs/nginx.conf /etc/nginx/nginx.conf
COPY ./configs/proxy-configs.conf /etc/nginx/conf.d/proxy-configs.conf
RUN rm -rf /docker-entrypoint.d
