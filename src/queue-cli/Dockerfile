FROM node:lts
RUN groupadd --system --gid 10001 app && \
  useradd --system -g app --uid 10001 --home /app app
COPY --chown=app:app . /app
USER app
WORKDIR /app
RUN npm install && npm run production:build
ENTRYPOINT ["npm", "run", "production:run", "--"]
