FROM node:alpine

# Install yarn globally
RUN npm install -g yarn

RUN mkdir -p /usr/src/node-app && chown -R node:node /usr/src/node-app

WORKDIR /usr/src/node-app

COPY package.json yarn.lock ./

USER node

RUN yarn install --frozen-lockfile

COPY --chown=node:node . .

EXPOSE 4000

CMD ["yarn", "dev", "-L"]
