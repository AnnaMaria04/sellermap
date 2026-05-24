FROM mcr.microsoft.com/playwright:v1.60.0-jammy

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY requirements.txt ./
RUN python3 -m pip install --no-cache-dir -r requirements.txt

COPY tsconfig.json ./
COPY src ./src
COPY python ./python
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8787

CMD ["npm", "start"]
