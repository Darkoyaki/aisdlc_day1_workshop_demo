#!/usr/bin/env pwsh
# Tiny wrapper so `./snip.ps1 <args>` works from PowerShell.
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node "$scriptDir/cli.js" @args
