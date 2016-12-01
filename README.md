[![Open_vMonitor Logo](http://plvision.eu/wp-content/themes/plvision/img/plvision-logo.png)](http://plvision.eu/)

Fast and minimalist OVSDB UI for [node](http://nodejs.org).

## Prerequirements
Open_vMonitor requires an opened OVS database port. In most cases it is enough to perform this action on a server side. This will open OVSDB port in passive mode on port 6640 (OVSDB default).
```bash
 $ sudo ovs-vsctl set-manager ptcp:6640 
```

## Installation using npmjs
```bash
 $ npm install open_vmonitor
```

## Installation from Github
```bash
 $ git clone https://github.com/PLVision/open_vmonitor.git
 $ cd open_vmonitor
 $ npm install
```

## Features
* HTTP/HTTPS web UI support
* SSL connection to an OVS database
* lightweight and fast UI

## HTTPs support
```bash
 $ mkdir -p ./certs
 $ openssl genrsa -out ./certs/key.pem 1024
 $ openssl req -new -key ./certs/key.pem -out ./certs/certrequest.csr
 $ openssl x509 -req -in ./certs/certrequest.csr -signkey ./certs/key.pem -out ./certs/certificate.pem
```
And start add env variable
```bash
 $ env MODE=https PORT=3001 npm start
```

## Docker container
```bash
 $ docker pull plvisiondevs/open_vmonitor
 $ docker run -d -p 3000:3000 plvisiondevs/open_vmonitor
```

## Start application
```bash
 $ npm start
```

## Default credentials
Initial user/password are admin/admin

## People
Copyright (c) 2014-2016 PLVision
Authors of ovsdb-client are Ihor Chumak and Roman Gotsiy (developers@plvision.eu).
Maintainer: Ihor Chumak (developers@plvision.eu)

## License
 [AGPL-3.0](LICENSE)
