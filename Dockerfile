FROM node:16-alpine

RUN apk add github-cli
COPY trigger.sh /trigger.sh

ENTRYPOINT ["/trigger.sh"]