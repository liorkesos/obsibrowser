#!/bin/bash

## The "save to chat" overwrites the github ci and npm lock
## Add the github workflow 
mkdir -p .github/workflows
cp ./deploy-pages.yml .github/workflows
git add .github/workflows/deploy-pages.yml


## Create npm.lock
npm install 
git add package-lock.json
git commit -am "ci and lock"

## Push to origin
git push
