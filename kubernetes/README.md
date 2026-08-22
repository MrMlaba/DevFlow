# Kubernetes manifests

One app, not the originally-planned `frontend/`/`backend/`/`worker/`/`redis/`
split - DevFlow is a single Next.js container (same image Phase 9 publishes
to GHCR), there's no separate backend/worker, and no Redis (nothing uses
it - see Phase 6/11's reasoning, same call again here). `namespace.yaml`,
`configmap.yaml`, `secret.example.yaml` (reference only, see below),
`deployment.yaml`, `service.yaml`, `ingress.yaml`, `hpa.yaml`.

See [`docs/devops-roadmap.md`](../docs/devops-roadmap.md) (Phase 13) for
the full story, including two real bugs this hit on a memory-constrained
machine and how they were diagnosed.

## Local cluster: k3s-in-WSL2 (what this project actually used)

Kind and Minikube both need Docker Desktop running as a second, separate
VM alongside whatever's already using memory - on an 8GB machine that
was enough to cause real instability. **k3s installed directly inside
WSL2** skips that layer entirely (its own bundled containerd, no Docker
needed at all) and bundles both an ingress controller (Traefik) and
metrics-server by default - nothing extra to install.

```bash
# One-time: install k3s inside your WSL2 distro (needs root - the
# install script's own sudo prompt hangs forever in a non-interactive
# shell, so run it as root directly instead)
wsl -u root -d Ubuntu -- bash -c "curl -sfL https://get.k3s.io | sh -"

# Apply everything (run from inside WSL2 - k3s kubectl needs root)
wsl -u root -d Ubuntu
cd /mnt/c/path/to/DevFlow/kubernetes
k3s kubectl apply -f namespace.yaml -f configmap.yaml

# Real secret values, not the example file - straight from .env.local,
# never written to a file that could get committed:
k3s kubectl create secret generic devflow-secrets -n devflow \
  --from-literal=NEXT_PUBLIC_SUPABASE_URL=... \
  --from-literal=NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY=... \
  --from-literal=GITHUB_OAUTH_CLIENT_ID=... \
  --from-literal=GITHUB_OAUTH_CLIENT_SECRET=...

k3s kubectl apply -f deployment.yaml -f service.yaml -f ingress.yaml -f hpa.yaml
```

**Accessing the app**: k3s's bundled LoadBalancer implementation
(klipper-lb) crash-loops in this WSL2 setup rather than cleanly
forwarding host port 80 - a real, observed environment quirk, not a
manifest problem (the Ingress and Service themselves route correctly,
confirmed by reaching the app through Traefik's NodePort directly from
inside WSL2). Reliable local access instead:

```bash
k3s kubectl port-forward -n devflow svc/devflow 8080:80
# http://localhost:8080 - WSL2 forwards this to Windows automatically
```

## Monitoring (Phase 15)

`monitoring/` - Prometheus + Grafana for this same cluster, deployed
separately from the app itself. See `docs/development.md` ("Monitoring
locally") for the exact apply commands and `docs/devops-roadmap.md`
(Phase 15) for what's monitored, what was deliberately left out (Loki,
DB connections), and the real bugs this hit getting Grafana to run
reliably on this machine's memory budget.

## Alternative: Kind

`kind-config.yaml` is provided for Kind specifically, for a machine with
more headroom than this one had. Change `ingress.yaml`'s
`ingressClassName` from `traefik` to `nginx` and install ingress-nginx
(kind doesn't bundle one):

```bash
kind create cluster --name devflow --config kind-config.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
# metrics-server also needs a kind-specific tweak (--kubelet-insecure-tls)
# for the HPA to report real numbers instead of "unknown" - kind's kubelet
# certs aren't set up for metrics-server's default strict TLS check.
```
