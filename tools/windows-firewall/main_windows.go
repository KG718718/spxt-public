//go:build windows

package main

import (
	"os"
)

func run(args []string) (int, []byte) {
	req, err := parseRequest(args)
	if err != nil {
		return describeError(err)
	}
	if err = validateProductionAnchors(anchorsFromBuild()); err != nil {
		return describeError(err)
	}
	executable, err := os.Executable()
	if err != nil {
		return describeError(reject(exitInstallTrust, "HELPER_PATH_INVALID"))
	}
	install, err := verifyInstall(executable, anchorsFromBuild())
	if err != nil {
		return describeError(err)
	}
	instance, err := verifyRegistration(install)
	if err != nil {
		return describeError(err)
	}
	cfg, err := loadBoundConfig(instance, install, req)
	if err != nil {
		return describeError(err)
	}
	if buildFreshTrial == "1" {
		req.Binding = cfg.Binding
	}
	exit, output, err := runFirewall(req, install)
	if err != nil {
		return describeError(err)
	}
	return exit, output
}

func main() {
	code, output := run(os.Args[1:])
	_, _ = os.Stdout.Write(output)
	os.Exit(code)
}
