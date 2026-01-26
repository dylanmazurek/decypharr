package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"runtime/debug"
	"syscall"

	"github.com/dylanmazurek/decypharr/cmd/decypharr"
	"github.com/dylanmazurek/decypharr/internal/config"
)

func main() {
	defer func() {
		r := recover()

		if r != nil {
			log.Printf("FATAL: Recovered from panic in main: %v\n", r)
			debug.PrintStack()
		}
	}()

	var configPath string
	flag.StringVar(&configPath, "config", "/data", "path to the data folder")
	flag.Parse()
	config.SetConfigPath(configPath)
	config.Get()

	ctx := context.Background()

	ctx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
	defer stop()

	err := decypharr.Start(ctx)
	if err != nil {
		log.Fatal(err)
	}
}
