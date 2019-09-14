FROM alpine:latest as certs
RUN apk --update add ca-certificates

FROM scratch
ENV PATH=/bin
ENV AWS_SHARED_CREDENTIALS_FILE=
ENV AWS_PROFILE=sqs-home
ENV AWS_REGION=us-west-2
ENV RECEIVER_IP=192.168.1.4
ENV TV_IP=192.168.1.5
COPY --from=certs /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY ./bin/alexa-yamaha alexa-yamaha
ENTRYPOINT ["/alexa-yamaha"]