FROM node:latest

RUN mkdir /code

WORKDIR /code
ADD package.json /code/package.json
RUN npm install
COPY . /code

EXPOSE  8080

CMD node services.js up