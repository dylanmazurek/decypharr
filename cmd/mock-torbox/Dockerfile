FROM golang:1.24-alpine

WORKDIR /app

COPY cmd/mock-torbox/main.go .

RUN go mod init mock-torbox && go get github.com/go-chi/chi/v5 && go mod tidy
RUN go build -o mock-torbox main.go

EXPOSE 8080
CMD ["./mock-torbox"]
