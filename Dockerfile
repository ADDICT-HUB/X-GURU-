FROM node:lts-bookworm 
USER root
RUN apt-get update && \
    apt-get install -y ffmpeg webp git && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

# Cleaned up WORKDIR and added COPY command

USER node
WORKDIR /home/node/src 
COPY . . # <--- CRITICAL: Copies all files from your GitHub repo into /home/node/src

# Now, running yarn install and npm start will find the package.json here.

RUN yarn install --network-concurrency 1
EXPOSE 7860
ENV NODE_ENV=production
CMD ["npm", "start"]
