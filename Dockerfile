FROM node:6.9.1-alpine
COPY . /opt/open_vmonitor
RUN cd /opt/open_vmonitor && npm install
EXPOSE 3000
WORKDIR /opt/open_vmonitor
CMD [ "npm", "start" ]
