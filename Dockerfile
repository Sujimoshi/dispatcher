FROM node:16-alpine

RUN echo "@community http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories
RUN apk add github-cli@community
COPY trigger.sh /trigger.sh

ENTRYPOINT ["sh", "/trigger.sh"]