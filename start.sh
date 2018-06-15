#!/bin/bash
date
cd ./public
npm run sass
npm run coffee
cd ..
npm start


