# test-github-script

```shell
gh act --action-offline-mode push -P self-hosted=docker.io/library/elentra-developer-runner:latest -s REPOSITORY_ACCESS_TOKEN=abc
# or
gh act --action-offline-mode push -P self-hosted=elentra-developer-runner:latest -s REPOSITORY_ACCESS_TOKEN=abc
# or
gh act push --pull=false -P self-hosted=elentra-developer-runner:latest -s REPOSITORY_ACCESS_TOKEN=abc
# or
gh act push --pull=false -P self-hosted=elentra-developer-runner:latest
# or
gh act push --pull=false -P self-hosted=elentra-developer-runner:latest -s GITHUB_TOKEN="$(gh auth token)"
gh act push --pull=false -P self-hosted=elentra-developer-runner:latest -s REPOSITORY_ACCESS_TOKEN="$(gh auth token)"
```
