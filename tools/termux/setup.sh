#!/data/data/com.termux/files/usr/bin/bash
# One-time Termux setup for pushing this repo to GitHub. Safe to re-run.
# Usage: bash setup.sh   (defaults: harsha-maloth / GitHub no-reply email; override with 2 args)
set -e
NAME="${1:-harsha-maloth}"
EMAIL="${2:-232861054+harsha-maloth@users.noreply.github.com}"

pkg update -y && pkg upgrade -y
pkg install -y git gh openssh unzip zip nodejs-lts

termux-setup-storage || true            # grants access to ~/storage/downloads (tap Allow)

git config --global user.name  "$NAME"
git config --global user.email "$EMAIL"
git config --global init.defaultBranch main
git config --global pull.rebase false
git config --global credential.helper store   # gh login below also configures git credentials

echo
echo "Now log in to GitHub (choose: GitHub.com > HTTPS > Login with a web browser):"
gh auth login
gh auth setup-git
gh auth status
echo "Setup done. Next: bash ~/campus-qps/tools/termux/push.sh  (or follow docs/LOCAL_SETUP.md)"
