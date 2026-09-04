@echo off
rem Tiny wrapper so `snip <args>` works from cmd.exe.
node "%~dp0cli.js" %*
