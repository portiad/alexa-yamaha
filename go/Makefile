# VERSION := $(shell git describe --abbrev=0 --tags)
# REV:= $(shell git rev-parse --short HEAD)
# BUILD_NUMBER := "${BUILD_NUMBER}"
# PWD := $(shell pwd)

build:
	@echo "Building go binary"
	# Building binaries
	CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/alexa-yamaha .

package: build
	@echo "Building Docker image"
	@docker build -t portiad/alexa-yamaha:latest  .

push:
	@docker push portiad/alexa-yamaha:latest