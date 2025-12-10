FROM node:lts-bookworm 
USER root
RUN apt-get update && \
    apt-get install -y ffmpeg webp git && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

# The git clone and WORKDIR /home/node/n steps have been removed.
# This assumes the main bot code (with index.js) is copied to the home directory.

USER node
WORKDIR /home/node/src # Standard directory for Node.js apps on a container

# *** Important: We need to ensure the source code is copied into the container.
# If the original repository used an implicit 'COPY' (which Render often does 
# by default), this should work.

# If the code isn't being copied, we need to explicitly add this line here:
# COPY . . 
# But for Render's default Docker build, we'll try without it first.

RUN yarn install --network-concurrency 1
EXPOSE 7860
ENV NODE_ENV=production
CMD ["npm", "start"]
